# Production Readiness Audit: Architecture and Reliability

**Focus Area**: System Topology, Failure Modes, Database Integrity, Circuit Breakers, Dead-Letter Queues, and Recovery  

---

## 1. System Architecture & Component Mapping

The documented architecture describes a unified system comprising a Next.js frontend and a FastAPI backend. In reality, the codebase contains two parallel, un-synchronized application stacks:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STOREFRONT LAYER (Next.js 15)                   │
│                                                                        │
│   Client Components         Server Components         Route Handlers   │
│   - Cart Context            - Root Layout             - /api/catalog   │
│   - Checkout UI             - Product Detail          - /api/orders    │
│   - Profile UI              - Static Pages            - /api/paypal    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Direct Database Calls
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (Neon PostgreSQL)                   │
│                                                                        │
│   Tables:                                                              │
│   - orders (shared schema)                                             │
│   - users (synced from Firebase)                                       │
│   - user_carts & user_watchlists                                       │
│   - user_saved_addresses                                               │
│   - products & product_variants (populated by ops_sync.py)             │
│   - sync_audit_logs (used by ops_sync.py and Python DLQ)               │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ SQLAlchemy Sessions
┌────────────────────────────────────┴───────────────────────────────────┐
│                     BACKEND LAYER (FastAPI / Render)                   │
│                                                                        │
│   API Routes                Core Services             Resilience       │
│   - /api/routes/catalog     - CJClient (v2.0)         - TokenBucket    │
│   - /api/routes/orders      - OrderRouter             - CircuitBreaker │
│   - /api/routes/admin       - PayPalService           - DLQ Logger     │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Deficiencies:

1. **Split-Brain Problem**:
   - The Next.js frontend talks directly to Neon PostgreSQL using `@neondatabase/serverless`.
   - The FastAPI backend also talks to PostgreSQL using SQLAlchemy ORM.
   - The frontend's Next.js route handlers duplicate the functionality of the FastAPI backend, but omit critical defensive controls (circuit breaker, rate limiter, automated CJ order placement).
2. **Decoupled Catalog**:
   - Next.js serves the catalog from bundled `seedCatalog.json`.
   - Database catalog tables (`products`, `product_variants`) populated by `ops_sync.py` are ignored by the storefront.

---

## 2. Supplier Integration & Reliability (CJ Dropshipping v2.0)

### 2.1 The Silent 200 OK & `logisticsMiss` Hazard
- The project documentation correctly identifies a critical supplier behavioral quirk: CJ Dropshipping API may return HTTP 200 with `logisticsMiss: true` and `postageAmount: 0.0`.
- **Implementation in Python `OrderRouter` (`src/services/order_router.py#L264-L281`)**:
  ```python
  logistics_miss = bool(order_data.get("logisticsMiss"))
  postage_amount = float(order_data.get("postageAmount") or 0.0)
  if logistics_miss is True or postage_amount <= 0:
      self.circuit_breaker.record_failure()
      self._route_to_dlq(..., error_type="LOGISTICS_MISS")
      raise LogisticsMissException(...)
  ```
  - **Verdict**: The defensive assertion in `OrderRouter` is **correctly implemented and verified** in tests (`test_logistics_miss_interception`).
- **Storefront Flaw**: The Next.js storefront has NO equivalent check, because it does not communicate with CJ at all during checkout.

### 2.2 Rate Limiting vs Multi-Process Workers (Finding REL-01)
- CJ Dropshipping strictly throttles accounts exceeding ~1 request per second.
- `src/services/cj_client.py#L20-L60` implements `TokenBucketRateLimiter(rate=0.75, capacity=1.0)`.
- **Defect**: The rate limiter uses an in-memory lock (`threading.Lock()`).
- `Dockerfile#L54` specifies:
  ```dockerfile
  CMD ["uvicorn", "src.api.main:app", "--workers", "4", ...]
  ```
- Because Uvicorn forks 4 separate worker OS processes, memory is not shared. The 4 processes can fire simultaneously, achieving up to 3.6 QPS, defeating the rate limiter and triggering supplier 429 errors.

### 2.3 Circuit Breaker Design
- Implemented in `src/services/order_router.py#L48-L94`:
  - Threshold: 3 consecutive failures.
  - Cooldown: 30.0 seconds.
  - States: `CLOSED` -> `OPEN` -> `HALF_OPEN` -> `CLOSED`.
- **Reliability Assessment**:
  - The circuit breaker effectively protects the system from cascading timeout stalls when CJ Dropshipping is offline.
  - However, because it is an in-memory singleton (`GLOBAL_CIRCUIT_BREAKER`), state is not synchronized across worker processes. An outage in one worker does not open the breaker in another worker.

---

## 3. Database Integrity & Constraints

### 3.1 Schema & Constraint Audit (`src/models/database.py`)
- **Primary Keys**: All tables define auto-incrementing integer primary keys (`id`).
- **Unique Constraints**:
  - `orders.internal_order_number`: Unique constraint enforced at database level.
  - `products.pid`: Unique constraint enforced.
  - `products.slug`: Unique constraint enforced.
  - `product_variants.vid`: Unique constraint enforced.
  - `users.firebase_uid`: Unique constraint enforced.
- **Foreign Keys**:
  - `product_variants.product_id` -> `products.id` with `ondelete="CASCADE"`.
  - `user_carts.user_id` -> `users.id` with `ondelete="CASCADE"`.
  - `user_watchlists.user_id` -> `users.id` with `ondelete="CASCADE"`.
- **Gaps**:
  - `orders` table has NO foreign key to `users.id`. Orders only store `customer_email`.
  - `orders.stripe_payment_intent_id` (which stores the PayPal transaction ID) has an index, but lacks a `UNIQUE` constraint in the database schema. While code attempts pre-checks, race conditions under simultaneous webhook delivery could insert duplicate rows if not strictly unique.

### 3.2 Transaction Boundaries
- In `src/services/order_router.py`:
  - An initial `PENDING` record is committed before the external CJ call.
  - If the CJ call fails, `_route_to_dlq` updates the status to `MANUAL_REVIEW_DLQ` in a separate transaction.
  - **Verdict**: Sound practice. Avoids holding open database transactions across slow external HTTP calls.

---

## 4. Dead-Letter Queue (DLQ) & Failure Recovery

### 4.1 DLQ Persistence
- When an order fails fulfillment (Logistics Miss, Timeout, Supplier Rejection, Circuit Breaker Open), `OrderRouter` records a structured entry in `sync_audit_logs` with `sync_type = 'DLQ_<ERROR_TYPE>'` and transitions `orders.status` to `MANUAL_REVIEW_DLQ`.
- The error payload includes `order_number`, `reason`, `customer_email`, and `zip_code`.

### 4.2 DLQ Operational Defect (Finding REL-02)
- In `src/api/routes/admin.py#L193-L246`, `POST /admin/dlq/{order_id}/retry`:
  - Does NOT assert that `order.status == 'MANUAL_REVIEW_DLQ'`.
  - An operator can accidentally retry an order that was already confirmed or delivered, creating duplicate supplier shipments.
- **Fix Required**: Add status precondition validation:
  ```python
  if order.status != "MANUAL_REVIEW_DLQ":
      raise HTTPException(status_code=400, detail=f"Cannot retry order in status {order.status}")
  ```

---

## 5. Availability, Monitoring & Recovery

- **Health Checks**:
  - `Dockerfile` includes `HEALTHCHECK ... curl -f http://localhost:8000/health || exit 1`.
  - FastAPI defines a health check in `src/api/main.py`.
  - **Limitation**: The health check only confirms Uvicorn is serving requests; it does not test database connectivity or CJ API reachability.
- **Disaster Recovery**:
  - Database is hosted on Neon Serverless PostgreSQL. Neon provides automated point-in-time recovery (PITR) and branching.
  - However, there are no documented restore runbooks or automated backup export scripts in the repository.

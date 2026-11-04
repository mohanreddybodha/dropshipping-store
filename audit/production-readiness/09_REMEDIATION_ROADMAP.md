# Production Readiness Audit: Remediation Roadmap

**Rule of Engagement**: This roadmap is a technical proposal. **NO remediation has been implemented.** All proposed changes require explicit review and approval prior to implementation.  

---

## Priority Tier Overview

- **P0: Stop-Launch Blockers**: Catastrophic vulnerabilities enabling financial theft, mass data breaches, or complete fulfillment stall. Must be remediated immediately.
- **P1: Pre-Launch Requirements**: Mandatory operational, legal, and resilience fixes required before marketing to real customers.
- **P2: Pre-Scale Enhancements**: Architectural unification, rate-limiting synchronization, and automated test coverage needed before scaling traffic.
- **P3: Long-Term Infrastructure**: Observability, distributed tracing, and compliance automation.

---

## Phase P0: Stop-Launch Blockers (Immediate Remediation Required)

### [REM-P0-01] Eliminate Free Checkout Payment Bypass
- **Finding IDs**: FIN-01
- **Proposed Change**:
  1. In `storefront/src/app/checkout/page.tsx`, remove `onSubmit={handlePlaceOrder}` from the `<form>` element. Replace with `onSubmit={(e) => e.preventDefault()}` so pressing Enter in input fields never triggers simulated order creation.
  2. In `storefront/src/app/api/orders/checkout/route.ts`, restrict or disable this endpoint for unauthenticated public requests. Orders must strictly be created via verified payment capture (`/api/orders/paypal/capture`) or cryptographically signed webhooks.
- **Dependencies**: None.
- **Risk of Fix**: Low.
- **Regression Risk**: Low (Checkout will exclusively proceed via official PayPal Smart Buttons).
- **Verification Procedure**: Open `/checkout`, fill in valid US address fields, and press Enter in the ZIP code input. Verify that no network request is sent to `/api/orders/checkout` and no order is written to PostgreSQL.
- **Rollback Consideration**: Revert git commit.
- **Complexity**: Small (1 hour).

---

### [REM-P0-02] Eliminate Public PII & Financial Data Dump
- **Finding IDs**: SEC-01
- **Proposed Change**:
  1. In `storefront/src/app/api/orders/route.ts`, remove lines 37–44 (the parameterless fallback query that selects the last 50 orders).
  2. Require verified session authentication. If the caller does not present a verified admin key or a verified customer Firebase token matching the requested email, return `401 Unauthorized`.
  3. Strip wholesale cost and profit fields from customer-facing API responses.
- **Dependencies**: None.
- **Risk of Fix**: Low.
- **Regression Risk**: Low (Admins will view orders via the secured admin command center; customers will view their own orders via authenticated profile sessions).
- **Verification Procedure**: Run `curl -i http://localhost:3000/api/orders`. Verify it returns `HTTP 401 Unauthorized` with an empty response.
- **Rollback Consideration**: Revert git commit.
- **Complexity**: Small (1 hour).

---

### [REM-P0-03] Authoritative Server-Side Price Calculation for PayPal Orders
- **Finding IDs**: FIN-02
- **Proposed Change**:
  1. In `storefront/src/app/api/orders/paypal/create/route.ts`, do NOT accept `amount` from the client JSON body.
  2. Accept `items: Array<{ variant_id: string, quantity: number, tier: number }>`.
  3. Query the authoritative product variant prices from the database, compute volume bundle discounts and shipping fees server-side, and pass this authoritative calculated total to PayPal.
  4. In `storefront/src/app/api/orders/paypal/capture/route.ts`, assert that the captured amount matches the calculated order total before marking the order paid.
- **Dependencies**: Database product catalog access.
- **Risk of Fix**: Medium (Must ensure discount formulas match UI calculations exactly).
- **Regression Risk**: Low if unit test verifies mathematical parity.
- **Verification Procedure**: Send a curl request with `{"amount": 0.01}` to `/api/orders/paypal/create`. Verify the server calculates the true catalog total and ignores the 1-cent parameter.
- **Complexity**: Medium (3 hours).

---

### [REM-P0-04] Secure Order Cancellation & Address Modification (Fix BOLA)
- **Finding IDs**: SEC-02, SEC-03
- **Proposed Change**:
  1. In `storefront/src/app/api/orders/cancel/route.ts` and `storefront/src/app/api/orders/address/route.ts`, remove the permissive conditional `if (customer_email && order.customer_email)`.
  2. Make `customer_email` a mandatory field. Reject any request where `customer_email` is missing with `400 Bad Request`.
  3. Require either:
     - Verified Firebase ID Token belonging to `order.customer_email`, OR
     - Dual-factor secret token generated at checkout and sent in the order confirmation email.
- **Dependencies**: Token or session verification logic.
- **Risk of Fix**: Low.
- **Regression Risk**: Low.
- **Verification Procedure**: Send `POST /api/orders/cancel` with only `{ "orderNumber": "ORD-123" }`. Verify the server rejects with `HTTP 400/401`.
- **Complexity**: Small (2 hours).

---

### [REM-P0-05] Enforce Cryptographic Admin Key Verification & Strip Header Spoofing
- **Finding IDs**: SEC-04
- **Proposed Change**:
  1. In `storefront/src/app/api/admin/orders/route.ts` and `storefront/src/app/api/admin/sync-cj/route.ts`, completely remove the `x-admin-email` and `?admin_email=` check.
  2. Enforce strict `crypto.timingSafeEqual` comparison between `req.headers.get("x-admin-api-key")` and `process.env.ADMIN_API_KEY`.
  3. Remove the non-production open-access fallback (`process.env.NODE_ENV !== "production"`).
- **Dependencies**: Node.js `crypto` module.
- **Risk of Fix**: Low.
- **Regression Risk**: Operators must configure `ADMIN_API_KEY` in their browser headers / command center settings.
- **Verification Procedure**: Run `curl -H "x-admin-email: admin@vastire.com" http://localhost:3000/api/admin/orders`. Verify it returns `HTTP 401 Unauthorized`.
- **Complexity**: Small (1 hour).

---

### [REM-P0-06] Connect Autonomous Supplier Fulfillment to Payment Capture
- **Finding IDs**: ARCH-01
- **Proposed Change**:
  1. Integrate the Python `OrderRouter` workflow directly into the post-capture sequence (or implement an asynchronous queue/webhook listener).
  2. When PayPal payment capture succeeds:
     - Construct `OrderSubmissionRequest`.
     - Dispatch to CJ Dropshipping API (`POST /shopping/order/createOrderV2`).
     - Intercept `logisticsMiss` and store errors in DLQ if failed.
     - Persist `cj_order_id` in the database upon success.
- **Dependencies**: Unified backend bridge or shared service.
- **Risk of Fix**: High (Fulfillment pipeline changes must be thoroughly tested with CJ sandbox/test orders).
- **Regression Risk**: Medium.
- **Verification Procedure**: Place a test order in sandbox; verify that a real CJ Order ID is created and returned in the database record.
- **Complexity**: Large (6–8 hours).

---

### [REM-P0-07] Revoke Exposed CJ API Key & Clean Test Suite
- **Finding IDs**: SEC-05
- **Proposed Change**:
  1. Log into the CJ Dropshipping developer dashboard and generate a new API key; immediately revoke `[REDACTED_CJ_API_KEY]`.
  2. Remove `test_cj_api.py` from the root directory. Replace with a dedicated mock test under `tests/`.
  3. Verify `.gitignore` ensures all `.env` files are excluded from Git.
- **Dependencies**: Access to CJ Dropshipping dashboard.
- **Risk of Fix**: None.
- **Regression Risk**: None.
- **Verification Procedure**: Run `pytest -v`. Verify 0 external network requests are made.
- **Complexity**: Small (30 minutes).

---

## Phase P1: Pre-Launch Requirements (Before Public Traffic)

### [REM-P1-01] Restrict FastAPI CORS Configuration
- **Finding IDs**: SEC-07
- **Proposed Change**: In `src/api/main.py`, remove `allow_origin_regex=r"^https?://.*"`. Set `allow_origins=["https://vastire.com", "http://localhost:3000"]`.
- **Complexity**: Small (15 minutes).

### [REM-P1-02] Connect Storefront Catalog API to PostgreSQL Database
- **Finding IDs**: DATA-01
- **Proposed Change**: Update `storefront/src/app/api/catalog/route.ts` and `[slug]/route.ts` to query Neon PostgreSQL (`products` and `product_variants` tables) with Next.js tag-based caching (`next: { tags: ['catalog'], revalidate: 300 }`).
- **Complexity**: Medium (3 hours).

### [REM-P1-03] Author and Publish Statutory Consumer Protection Pages
- **Finding IDs**: COMP-01
- **Proposed Change**: Create `/privacy`, `/terms`, `/shipping-policy`, and `/refund-policy` pages. Update `storefront/src/components/layout/Footer.tsx` to link to these routes.
- **Complexity**: Medium (3 hours).

### [REM-P1-04] Fix CJ Duplicate Code 1603003 Idempotency Handling
- **Finding IDs**: SUP-01
- **Proposed Change**: In `src/services/order_router.py#L228`, on error 1603003, call `GET /shopping/order/list?orderNum={order_number}` to fetch the existing `orderId` and verify line items before acknowledging.
- **Complexity**: Medium (2 hours).

---

## Phase P2: Pre-Scale Enhancements

### [REM-P2-01] Single-Worker or Distributed Rate Limiting
- **Finding IDs**: REL-01
- **Proposed Change**: Configure Uvicorn with `--workers 1` in `Dockerfile` and `render.yaml`, relying on FastAPI's native async event loop; or introduce Redis-backed rate limiting.
- **Complexity**: Small to Medium (2 hours).

### [REM-P2-02] Implement Storefront Test Suite in CI
- **Finding IDs**: TEST-01
- **Proposed Change**: Add Vitest for frontend unit tests and Playwright for critical checkout journeys in `.github/workflows/ci.yml`.
- **Complexity**: Medium (4 hours).

### [REM-P2-03] Guard DLQ Manual Retry Endpoint State
- **Finding IDs**: REL-02
- **Proposed Change**: Assert `order.status == 'MANUAL_REVIEW_DLQ'` before allowing retry in `src/api/routes/admin.py`.
- **Complexity**: Small (30 minutes).

### [REM-P2-04] Strengthen Order Lookup Dual-Factor Query
- **Finding IDs**: SEC-09
- **Proposed Change**: In `storefront/src/app/api/orders/lookup/route.ts`, change `LIKE` to exact equality: `AND shipping_zip = ${cleanZip}`. Add IP rate limiting.
- **Complexity**: Small (30 minutes).

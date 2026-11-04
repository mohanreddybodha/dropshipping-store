# Production Readiness Audit: Findings Register

**Project**: Vastire Autonomous Dropshipping Platform  
**Target Market**: United States  
**Classification Standard**: Severity (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL), Confidence (High, Medium, Low)  
**Total Deduplicated Findings**: 23  

---

## Complete Findings Matrix

| Finding ID | Severity | Confidence | Category | Title | Production Blocker? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **SEC-01** | **CRITICAL** | High | Authorization / Data Leak | Unauthenticated Public PII and Financial Data Dump | **YES** |
| **FIN-01** | **CRITICAL** | High | Payment Integrity | Simulated Free Order Creation Bypass via Form Submission | **YES** |
| **FIN-02** | **CRITICAL** | High | Payment Integrity | Client-Controlled Price Manipulation on PayPal Order Creation | **YES** |
| **SEC-02** | **CRITICAL** | High | Broken Object Auth | Unauthorized Order Cancellation & Automated Full Refund (BOLA) | **YES** |
| **SEC-03** | **CRITICAL** | High | Broken Object Auth | Unauthorized Shipping Address Modification / Package Hijacking | **YES** |
| **SEC-04** | **CRITICAL** | High | Authentication Bypass | Admin Command Center Authentication Bypass via Header Spoofing | **YES** |
| **SEC-05** | **CRITICAL** | High | Secrets Management | Hardcoded Fallback CJ API Key in Test Suite with Live Execution | **YES** |
| **SEC-06** | **CRITICAL** | High | Broken Object Auth | Public Harvest of Customer Saved Delivery Addresses and Phone Numbers | **YES** |
| **ARCH-01** | **CRITICAL** | High | Fulfillment Integrity | Split-Brain Architecture Causing Total Fulfillment Failure (Zero CJ Orders) | **YES** |
| **SEC-07** | **HIGH** | High | Browser Security | Universal Permissive CORS with Allowed Credentials in FastAPI Backend | **YES** |
| **DATA-01** | **HIGH** | High | Inventory Integrity | Static Decoupled Catalog Ignoring Database Stock & Price Updates | **YES** |
| **REL-01** | **HIGH** | High | Rate Limiting | In-Memory Token Bucket Rate Limiter Defeated by Multiprocess Uvicorn | **YES** |
| **SUP-01** | **HIGH** | High | Supplier Integration | Flawed Idempotency Logic on CJ Code 1603003 (Missing Order ID) | **YES** |
| **COMP-01** | **HIGH** | High | Legal / Compliance | Missing Consumer Protection Policies and Unlinked Statutory Pages | **YES** |
| **SEC-08** | **MEDIUM** | High | Authentication | Unverified Firebase UID Trust Boundary in Next.js API Routes | Conditional |
| **TEST-01** | **MEDIUM** | High | QA / Testing | Absence of Storefront Test Suite and End-to-End Checkout Verification | Conditional |
| **REL-02** | **MEDIUM** | High | Operational Safety | DLQ Manual Retry Endpoint Missing Order Status Pre-Condition Guard | Conditional |
| **SEC-09** | **MEDIUM** | High | Abuse Resistance | Dual-Factor Order Lookup Weak Matching via Substring LIKE Expression | Conditional |
| **OPS-01** | **LOW** | Medium | Configuration | Unused Legacy Printify Configuration in Environment Templates | No |
| **DEV-01** | **LOW** | High | Framework Health | Deprecated Starlette HTTP 422 Exception Handling in FastAPI | No |
| **OPS-02** | **LOW** | Medium | Reliability | Absence of Automated Database and Application Log Retention Policies | No |
| **ARCH-02** | **INFO** | High | Architecture | Inconsistent SQLite Storage Fallback in Production Dockerfile | No |
| **OPS-03** | **INFO** | Medium | Observability | Lack of End-to-End Distributed Trace Context Propagation (Vercel to Render) | No |

---

## Detailed Findings Specifications

### [SEC-01] Unauthenticated Public PII and Financial Data Dump
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Authorization / Information Disclosure
- **Affected Component**: Next.js Storefront Route Handler
- **File Reference**: [`storefront/src/app/api/orders/route.ts#L37-L44`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/route.ts#L37-L44)
- **Defect Description**: When `GET /api/orders` is called without query parameters (`email` and `phone` empty), the fallback branch executes:
  ```typescript
  rows = (await sql`
    SELECT * FROM orders
    ORDER BY created_at DESC
    LIMIT 50
  `) as DbOrder[];
  ```
  The endpoint then formats and returns all 50 order records with full customer personal and financial data.
- **Exploitation Scenario**: An attacker navigates to `https://vastire.com/api/orders` in any web browser or runs `curl https://vastire.com/api/orders`. The API responds with the 50 most recent customer names, physical home addresses, email addresses, phone numbers, tracking numbers, items purchased, wholesale costs, total retail price, and net profit.
- **Impact**: Catastrophic public breach of customer PII under US state privacy laws (CCPA, VCDPA) and exposure of confidential wholesale pricing and business margins.
- **Reproduction**:
  ```bash
  curl -X GET "http://localhost:3000/api/orders"
  ```
- **Remediation**: Require authenticated session / token verification. Completely remove the parameterless fallback query. If neither verified email nor authorized admin key is present, reject with HTTP 401/403.
- **Verification Criteria**: Calling `GET /api/orders` without credentials returns HTTP 401 Unauthorized with zero records.

---

### [FIN-01] Simulated Free Order Creation Bypass via Form Submission
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Payment Integrity / Fraud Bypass
- **Affected Component**: Checkout Frontend & Backend Order Creation
- **File Reference**: [`storefront/src/app/checkout/page.tsx#L712-L774`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/checkout/page.tsx#L712-L774), [`storefront/src/app/checkout/page.tsx#L1117`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/checkout/page.tsx#L1117), [`storefront/src/app/api/orders/checkout/route.ts#L80-L135`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/checkout/route.ts#L80-L135)
- **Defect Description**: The checkout form defines `onSubmit={handlePlaceOrder}`. `handlePlaceOrder` simulates payment:
  ```typescript
  // Simulate payment processing
  await new Promise((resolve) => setTimeout(resolve, 800));
  ...
  await createCheckoutOrder({...});
  ```
  `POST /api/orders/checkout` takes the request body and executes `INSERT INTO orders ... VALUES (..., 'ORDER_PLACED', ...)`. It requires zero payment intent, zero transaction ID, and zero gateway validation.
- **Exploitation Scenario**: A customer fills in valid US delivery details on `/checkout` and presses the `Enter` key on their keyboard. The form submits, waits 800ms, calls `/api/orders/checkout`, creates a live order in the database with status `ORDER_PLACED`, and renders the confirmation screen without charging the customer anything.
- **Impact**: Direct financial loss through fraudulent order placement; fulfillment operations may dispatch items that were never paid for.
- **Reproduction**:
  ```bash
  curl -X POST "http://localhost:3000/api/orders/checkout" \
    -H "Content-Type: application/json" \
    -d '{"customer_email":"attacker@test.com","shipping_address":"123 Main St","shipping_city":"Los Angeles","shipping_province":"CA","shipping_zip":"90001","shipping_country":"US","total_retail":120.00,"items":[{"pid":"123","quantity":2}]}'
  ```
- **Remediation**: Remove `onSubmit={handlePlaceOrder}` from the form. Disable or delete `/api/orders/checkout` for public creation. Enforce that orders can ONLY be created through authoritative server-side payment capture endpoints (`/api/orders/paypal/capture` or verified webhooks).
- **Verification Criteria**: Pressing Enter on checkout does not trigger order placement. Calling `POST /api/orders/checkout` without verified gateway authorization returns HTTP 403 Forbidden.

---

### [FIN-02] Client-Controlled Price Manipulation on PayPal Order Creation
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Payment Integrity / Price Tampering
- **Affected Component**: Next.js PayPal Route Handlers
- **File Reference**: [`storefront/src/app/api/orders/paypal/create/route.ts#L8-L70`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/paypal/create/route.ts#L8-L70) & [`storefront/src/app/api/orders/paypal/capture/route.ts#L173-L198`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/paypal/capture/route.ts#L173-L198)
- **Defect Description**: The route accepts `amount` directly from the client JSON body:
  ```typescript
  const { amount, currency = "USD", internal_order_number } = body;
  ...
  const parsedAmount = Math.max(0.01, Number(amount) || 24.99);
  ```
  It passes this unverified `parsedAmount` directly to PayPal's `/v2/checkout/orders` API. The capture endpoint subsequently verifies that the captured amount matches PayPal, but never checks that PayPal captured amount equals the database catalog price of the line items.
- **Exploitation Scenario**: An attacker places items totaling $250 in their cart. They send a direct `POST /api/orders/paypal/create` with `{"amount": 0.01}`. PayPal returns a valid order token for $0.01. The attacker approves the payment of 1 cent in the PayPal popup. The capture route captures 1 cent, marks the order `ORDER_PLACED`, and confirms the sale.
- **Impact**: Immediate loss of goods and capital.
- **Reproduction**:
  ```bash
  curl -X POST "http://localhost:3000/api/orders/paypal/create" \
    -H "Content-Type: application/json" \
    -d '{"amount": 0.01, "internal_order_number": "ORD-TEST-1"}'
  ```
- **Remediation**: The `create` route must accept an array of `{ variant_id, quantity }`, look up the authoritative prices from the database, calculate volume bundle discounts and shipping server-side, and submit the calculated sum to PayPal.
- **Verification Criteria**: Sending an arbitrary `amount` in `POST /api/orders/paypal/create` is ignored; the server charges the exact sum of catalog items.

---

### [SEC-02] Unauthorized Order Cancellation & Automated Full Refund (BOLA)
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Broken Object-Level Authorization (OWASP API1:2023)
- **Affected Component**: Next.js Order Cancellation Route
- **File Reference**: [`storefront/src/app/api/orders/cancel/route.ts#L38-L46`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/cancel/route.ts#L38-L46)
- **Defect Description**: The endpoint checks customer email only if both `customer_email` and `order.customer_email` evaluate to truthy:
  ```typescript
  if (customer_email && order.customer_email) {
    if (order.customer_email.toLowerCase() !== customer_email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  ```
  If `customer_email` is not sent in the request body, this block evaluates to false and is bypassed. The endpoint proceeds to cancel the order and issues an automated PayPal refund via PayPal's `/v2/payments/captures/{capture_id}/refund` API.
- **Exploitation Scenario**: An attacker takes any order number (readily harvested from `/api/orders` via SEC-01 or brute-forced) and sends:
  ```json
  POST /api/orders/cancel
  { "orderNumber": "ORD-PP-123456" }
  ```
  The order is immediately cancelled and the funds are refunded from the merchant's PayPal account.
- **Impact**: Denial of business operations, chargeback fees, loss of merchant standing, and fraudulent inventory desynchronization.
- **Reproduction**:
  ```bash
  curl -X POST "http://localhost:3000/api/orders/cancel" \
    -H "Content-Type: application/json" \
    -d '{"orderNumber": "ORD-STORE-EXISTING"}'
  ```
- **Remediation**: Require authenticated session token or verified dual-factor lookup (email + ZIP + order token). If `customer_email` is missing, reject immediately. Never execute refunds without verified user identity or administrator credentials.
- **Verification Criteria**: Calling `/api/orders/cancel` without verified authentication credentials returns HTTP 401/403.

---

### [SEC-03] Unauthorized Shipping Address Modification / Package Hijacking
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Broken Object-Level Authorization / Package Theft
- **Affected Component**: Next.js Order Address Route
- **File Reference**: [`storefront/src/app/api/orders/address/route.ts#L55-L63`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/address/route.ts#L55-L63)
- **Defect Description**: The address update endpoint also guards ownership with:
  ```typescript
  if (customer_email && order.customer_email) {
    if (order.customer_email.toLowerCase() !== customer_email.toLowerCase().trim()) { ... }
  }
  ```
  Omitting `customer_email` skips the check and executes:
  ```typescript
  UPDATE orders SET shipping_name = ..., shipping_address = ..., shipping_zip = ... WHERE id = ...
  ```
- **Exploitation Scenario**: An attacker observes an order placed on the store. Within 30 minutes, they issue a `PATCH /api/orders/address` with their own name, street address, and ZIP code without passing `customer_email`. The order's destination is changed to the attacker's location.
- **Impact**: Physical package theft and merchant liability for undelivered merchandise.
- **Reproduction**:
  ```bash
  curl -X PATCH "http://localhost:3000/api/orders/address" \
    -H "Content-Type: application/json" \
    -d '{"orderNumber": "ORD-STORE-EXISTING", "shipping_address": "456 Hijack Rd", "shipping_city": "Miami", "shipping_province": "FL", "shipping_zip": "33101"}'
  ```
- **Remediation**: Strictly enforce authenticated session ownership or dual-factor cryptographic token.
- **Verification Criteria**: Unauthenticated `PATCH /api/orders/address` requests are rejected with HTTP 401 Unauthorized.

---

### [SEC-04] Admin Command Center Authentication Bypass via Header Spoofing
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Broken Function-Level Authorization (OWASP API5:2023)
- **Affected Component**: Next.js Admin Route Handlers
- **File Reference**: [`storefront/src/app/api/admin/orders/route.ts#L21-L39`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/admin/orders/route.ts#L21-L39) & [`storefront/src/app/api/admin/sync-cj/route.ts#L71-L81`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/admin/sync-cj/route.ts#L71-L81)
- **Defect Description**: The `isAuthorized` helper checks:
  ```typescript
  const emailToCheck = (
    clientEmail ||
    req.headers.get("x-admin-email") ||
    req.nextUrl.searchParams.get("admin_email") ||
    ""
  ).trim().toLowerCase();
  ...
  return allowedEmails.includes(emailToCheck);
  ```
  Additionally:
  ```typescript
  (adminEmails.length === 0 && process.env.NODE_ENV !== "production")
  ```
  grants open admin access whenever `adminEmails` is unset in non-production environments.
- **Exploitation Scenario**: An attacker sends:
  ```bash
  curl -H "x-admin-email: admin@vastire.com" https://vastire.com/api/admin/orders
  ```
  Because the server performs no cryptographic check on whether the request originated from a Google OAuth session belonging to `admin@vastire.com`, the attacker gains full admin access to view all store orders and modify order statuses via `PATCH`.
- **Impact**: Full administrative takeover of store fulfillment, tracking updates, and customer database.
- **Reproduction**:
  ```bash
  curl -X GET "http://localhost:3000/api/admin/orders" -H "x-admin-email: admin@vastire.com"
  ```
- **Remediation**: Require `timingSafeEqual` comparison against `process.env.ADMIN_API_KEY` for API clients. For browser sessions, verify the Firebase Admin ID Token and verify that the user possesses an authorized admin UID / email via server-side claims. Remove all header-based email trust.
- **Verification Criteria**: Supplying an arbitrary `x-admin-email` header returns HTTP 401/403.

---

### [SEC-05] Hardcoded Fallback CJ API Key in Test Suite with Live Execution
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection and test execution)
- **Category**: Secrets Management / Unintended Network Side Effects
- **Affected Component**: Root Test Utility
- **File Reference**: [`test_cj_api.py#L22`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/test_cj_api.py#L22)
- **Defect Description**: Line 22 contains a hardcoded fallback API key:
  ```python
  api_key = os.environ.get("CJ_API_KEY", "[REDACTED_CJ_API_KEY]")
  ```
  Because `test_cj_api.py` resides in the project root and matches `test_*.py`, executing `pytest` from the workspace root runs `test_api()`, which dispatches a live HTTP POST to `https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken`.
- **Exploitation Scenario**: Anyone with read access to the repository can extract the CJ API key. Every test run consumes third-party API quota and risks account suspension.
- **Impact**: Credential exposure, risk of third-party supplier account takeover, test instability in offline / air-gapped CI environments.
- **Reproduction**:
  ```bash
  pytest -v test_cj_api.py
  ```
- **Remediation**: Revoke the exposed API key in the CJ Dropshipping dashboard. Remove `test_cj_api.py` or move it to a dedicated non-test scripts directory with mocks and environment variable requirements. Never embed credentials in source code.
- **Verification Criteria**: Running `pytest` does not dispatch external HTTP calls and contains zero plaintext credentials.

---

### [SEC-06] Public Harvest of Customer Saved Delivery Addresses and Phone Numbers
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Authorization / Information Disclosure (OWASP API1:2023)
- **Affected Component**: Next.js User Address Route Handler
- **File Reference**: [`storefront/src/app/api/user/addresses/route.ts#L22-L75`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/user/addresses/route.ts#L22-L75)
- **Defect Description**: The route retrieves saved delivery addresses based solely on an unauthenticated query parameter:
  ```typescript
  const email = req.nextUrl.searchParams.get("email");
  ...
  SELECT * FROM user_saved_addresses WHERE LOWER(user_email) = ${cleanEmail}
  ```
  If no saved addresses exist, it harvests them from the `orders` table and returns them to the caller.
- **Exploitation Scenario**: An attacker queries:
  ```bash
  curl "https://vastire.com/api/user/addresses?email=target@gmail.com"
  ```
  The server responds with the recipient's full name, phone number, street address, city, state, and ZIP code.
- **Impact**: Mass privacy breach and physical security hazard for customers.
- **Reproduction**:
  ```bash
  curl -X GET "http://localhost:3000/api/user/addresses?email=customer@example.com"
  ```
- **Remediation**: Protect the endpoint with verified Firebase ID token authentication. Extract the user's email strictly from the decoded cryptographic token, not from an unauthenticated query parameter.
- **Verification Criteria**: Calling `/api/user/addresses` without a valid `Authorization: Bearer <token>` header returns HTTP 401 Unauthorized.

---

### [ARCH-01] Split-Brain Architecture Causing Total Fulfillment Failure (Zero CJ Orders)
- **Severity**: CRITICAL
- **Confidence**: High (Confirmed via architectural analysis)
- **Category**: Distributed Systems / Fulfillment Failure
- **Affected Component**: End-to-End Order Pipeline
- **File Reference**: [`storefront/src/app/api/orders/paypal/capture/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/paypal/capture/route.ts), [`storefront/src/app/api/admin/sync-cj/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/admin/sync-cj/route.ts), [`src/services/order_router.py`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/services/order_router.py)
- **Defect Description**: The storefront and backend are completely decoupled. The storefront captures payments and inserts orders into Neon PostgreSQL, but **never invokes `OrderRouter` or `CJClient`**. The Python backend (`OrderRouter`) only runs on `/webhook/payment` (expecting Stripe HMAC signatures). Furthermore, `storefront/src/app/api/admin/sync-cj/route.ts` requires an operator to manually paste an existing `cj_order_id`. Paid customer orders are never submitted to CJ Dropshipping autonomously.
- **Exploitation Scenario**: A customer purchases an item and pays $45 via PayPal. The money is deposited into the merchant account. The customer waits 5 days. CJ Dropshipping never receives the order. The item is never packaged or shipped. The customer files a PayPal dispute / chargeback.
- **Impact**: 100% fulfillment failure rate, merchant payment processor suspension, financial loss from dispute penalties.
- **Reproduction**: Trace the code execution of `POST /api/orders/paypal/capture`. Note that no HTTP request to `cjdropshipping.com` is dispatched.
- **Remediation**: Implement a reliable event or transactional outbox pattern that takes captured orders in status `ORDER_PLACED` / `PAYMENT_CAPTURED` and triggers `OrderRouter.submit_order()` using a shared durable worker or integrated serverless route handler.
- **Verification Criteria**: After PayPal payment capture, a corresponding order ID is created on CJ Dropshipping and persisted in `orders.cj_order_id`.

---

### [SEC-07] Universal Permissive CORS with Allowed Credentials in FastAPI Backend
- **Severity**: HIGH
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Cross-Origin Security
- **Affected Component**: FastAPI Main Application
- **File Reference**: [`src/api/main.py#L86-L90`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/api/main.py#L86-L90)
- **Defect Description**:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[...],
      allow_origin_regex=r"^https?://.*",
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
  `allow_origin_regex=r"^https?://.*"` matches every web domain on the internet while `allow_credentials=True` is enabled.
- **Exploitation Scenario**: A user logged into their admin console or customer account visits an attacker's website. The attacker's script dispatches cross-origin XMLHttpRequests with credentials to the backend and reads the responses.
- **Impact**: Full bypass of the browser Same-Origin Policy.
- **Remediation**: Remove `allow_origin_regex`. Restrict `allow_origins` strictly to the production storefront domain (`https://vastire.com`) and localhost in development.
- **Verification Criteria**: Origin `https://evil.com` receives no CORS access-control headers.

---

### [DATA-01] Static Decoupled Catalog Ignoring Database Stock & Price Updates
- **Severity**: HIGH
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Data Consistency / Inventory Integrity
- **Affected Component**: Next.js Storefront Catalog API & Pages
- **File Reference**: [`storefront/src/app/api/catalog/route.ts#L2`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/catalog/route.ts#L2), [`storefront/src/app/api/catalog/[slug]/route.ts#L2`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/catalog/[slug]/route.ts#L2), [`ops_sync.py`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/ops_sync.py)
- **Defect Description**: The Next.js storefront API reads product listings and details exclusively from `storefront/src/lib/seedCatalog.json`. When `ops_sync.py --sync-stock` runs, it updates the `products` and `product_variants` tables in the database. The storefront never queries these tables.
- **Exploitation Scenario**: A supplier discontinues a product or runs out of stock in the US warehouse. `ops_sync.py` marks `is_available = False` in the database. The storefront continues serving the item from `seedCatalog.json`. Customers order and pay for the out-of-stock product.
- **Impact**: Customer disappointment, manual refund overhead, inventory desynchronization.
- **Remediation**: Refactor `GET /api/catalog` and `GET /api/catalog/[slug]` to query the PostgreSQL database (`products` and `product_variants` tables) with caching (`revalidate = 300`), using `seedCatalog.json` only as a build-time bootstrap.
- **Verification Criteria**: Updating `is_available = False` in PostgreSQL immediately reflects in the catalog API after cache revalidation.

---

### [REL-01] In-Memory Token Bucket Rate Limiter Defeated by Multiprocess Uvicorn
- **Severity**: HIGH
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Distributed Systems / Reliability
- **Affected Component**: FastAPI CJClient & Dockerfile
- **File Reference**: [`Dockerfile#L54`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/Dockerfile#L54), [`src/services/cj_client.py#L20-L60`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/services/cj_client.py#L20-L60)
- **Defect Description**: `Dockerfile` launches Uvicorn with `--workers 4`. In `cj_client.py`, `TokenBucketRateLimiter` is implemented in-memory using `threading.Lock()`. Each of the 4 independent OS worker processes maintains its own bucket.
- **Exploitation Scenario**: Under concurrent traffic, the 4 workers dispatch requests in parallel. The aggregate rate reaches 4 × 0.9 = 3.6 QPS, exceeding CJ Dropshipping's 1.0 QPS limit. CJ Dropshipping responds with HTTP 429 or silent empty payloads (error code 1600200).
- **Impact**: Cascading API failure, orders rejected or dropped during peak traffic.
- **Remediation**: Use a single worker with asynchronous I/O (`uvicorn ... --workers 1`) or implement an inter-process rate limiter (using Redis or a shared token lock).
- **Verification Criteria**: Four concurrent requests cannot exceed 1 request per 1.11 seconds combined.

---

### [SUP-01] Flawed Idempotency Logic on CJ Code 1603003 (Missing Order ID)
- **Severity**: HIGH
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Supplier Integration / Idempotency
- **Affected Component**: Python OrderRouter
- **File Reference**: [`src/services/order_router.py#L228-L248`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/services/order_router.py#L228-L248)
- **Defect Description**: When CJ Dropshipping returns code `1603003` ("Order exist, please do not duplicate create"), `OrderRouter` records `status = "CJ_ORDER_CREATED"` with `cj_order_id = None`. It never calls CJ API to look up the existing order details or verify that the line items and shipping address match.
- **Exploitation Scenario**: An ambiguous network timeout occurs during order creation. The order is retried. CJ returns 1603003. The system marks it successful in the database, but records `cj_order_id = None`. Subsequent tracking sync jobs cannot track the order because the supplier order ID was never saved.
- **Impact**: Lost order tracking, inability to confirm whether the supplier order was actually processed or what items it contained.
- **Remediation**: Upon receiving 1603003, call `GET /shopping/order/list?orderNum={order_number}` to retrieve the actual `orderId` and verify payload integrity before saving.
- **Verification Criteria**: Retrying an existing order properly populates `cj_order_id` in the database.

---

### [COMP-01] Missing Consumer Protection Policies and Unlinked Statutory Pages
- **Severity**: HIGH
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Legal, Regulatory & Payment Processor Compliance
- **Affected Component**: Storefront Footer & Layout
- **File Reference**: [`storefront/src/components/layout/Footer.tsx#L80-L86`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/components/layout/Footer.tsx#L80-L86)
- **Defect Description**: The footer contains unclickable `<span>` elements for "Privacy Policy", "Terms of Service", and "Shipping SLA". No actual policy pages exist in `storefront/src/app/`.
- **Exploitation Scenario**: PayPal compliance crawlers or consumers audit the site. Finding no Privacy Policy, Terms of Service, or return address, PayPal suspends the account for violating the Acceptable Use Policy. State regulatory authorities in California (CCPA) and federal authorities (FTC Mail Order Rule) issue penalties for undisclosed shipping terms.
- **Impact**: Immediate payment processor freeze, reserve hold, or regulatory sanction.
- **Remediation**: Author, publish, and link dedicated pages for `/privacy`, `/terms`, `/shipping`, and `/refunds`.
- **Verification Criteria**: All footer policy links navigate to active, comprehensive statutory documents.

---

### [SEC-08] Unverified Firebase UID Trust Boundary in Next.js API Routes
- **Severity**: MEDIUM
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Authentication
- **Affected Component**: User State & Sync Routes
- **File Reference**: [`storefront/src/app/api/auth/state/route.ts#L18-L46`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/auth/state/route.ts#L18-L46) & [`storefront/src/app/api/auth/sync/route.ts#L12-L30`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/auth/sync/route.ts#L12-L30)
- **Defect Description**: The routes accept `firebase_uid` as a query parameter or body property without validating the cryptographic signature of a Firebase ID Token.
- **Impact**: Any user can query another user's cart or profile state by guessing or knowing their UID.
- **Remediation**: Integrate the Firebase Admin Node.js SDK and verify `req.headers.get("Authorization")` via `auth.verifyIdToken(token)`.
- **Verification Criteria**: Requests without a cryptographically valid Firebase ID token cannot access user-specific state.

---

### [TEST-01] Absence of Storefront Test Suite and End-to-End Checkout Verification
- **Severity**: MEDIUM
- **Confidence**: High (Confirmed via inspection of repository and CI workflows)
- **Category**: Quality Assurance
- **Affected Component**: Storefront CI Pipeline
- **File Reference**: [`.github/workflows/ci.yml#L44-L67`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/.github/workflows/ci.yml#L44-L67)
- **Defect Description**: The CI workflow executes pytest for Python backend tests, but for the Next.js storefront, it only executes `npm run build`. There are zero unit tests, component tests, or Playwright E2E tests for the frontend.
- **Impact**: Critical frontend regressions (such as the form Enter-key payment bypass) deploy to production undetected.
- **Remediation**: Introduce Vitest/React Testing Library for storefront unit tests and Playwright for critical path checkout testing.
- **Verification Criteria**: CI fails if a checkout regression or form submission error occurs.

---

### [REL-02] DLQ Manual Retry Endpoint Missing Order Status Pre-Condition Guard
- **Severity**: MEDIUM
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Operational Safety
- **Affected Component**: FastAPI Admin Route
- **File Reference**: [`src/api/routes/admin.py#L193-L246`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/api/routes/admin.py#L193-L246)
- **Defect Description**: `POST /admin/dlq/{order_id}/retry` loads the order by ID without checking if `status == "MANUAL_REVIEW_DLQ"`. It can be triggered on an order that is already in `DELIVERED` or `CJ_ORDER_CREATED`.
- **Impact**: Accidental duplicate fulfillment and financial waste.
- **Remediation**: Require `if order.status != "MANUAL_REVIEW_DLQ": raise HTTPException(400, "Order is not in DLQ state")`.
- **Verification Criteria**: Retrying a completed order returns HTTP 400 Bad Request.

---

### [SEC-09] Dual-Factor Order Lookup Weak Matching via Substring LIKE Expression
- **Severity**: MEDIUM
- **Confidence**: High (Confirmed via source code inspection)
- **Category**: Abuse Resistance
- **Affected Component**: Next.js Order Lookup Route
- **File Reference**: [`storefront/src/app/api/orders/lookup/route.ts#L23`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/lookup/route.ts#L23)
- **Defect Description**: The query matches ZIP codes using `LIKE ${"%" + cleanZip + "%"}` rather than exact match `= ${cleanZip}`. Passing a single digit matches any ZIP code containing that digit.
- **Impact**: Weakens dual-factor verification and facilitates brute-force order enumeration.
- **Remediation**: Change to strict equality: `AND shipping_zip = ${cleanZip}`. Add IP rate limiting.
- **Verification Criteria**: Searching with a partial ZIP code returns 0 results.

---

### [OPS-01] Unused Legacy Printify Configuration in Environment Templates
- **Severity**: LOW
- **Confidence**: Medium
- **Category**: Configuration Hygiene
- **Affected Component**: `.env.example`
- **File Reference**: [`.env.example#L18-L20`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/.env.example#L18-L20)
- **Defect Description**: Environment examples reference `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID`, but no Printify integration exists in the codebase.
- **Impact**: Operator confusion during onboarding.
- **Remediation**: Remove legacy Printify references.

---

### [DEV-01] Deprecated Starlette HTTP 422 Exception Handling in FastAPI
- **Severity**: LOW
- **Confidence**: High (Confirmed during pytest execution)
- **Category**: Framework Health
- **Affected Component**: FastAPI Main & Pytest
- **File Reference**: [`src/api/main.py#L100`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/api/main.py#L100)
- **Defect Description**: Generates `DeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead`.
- **Impact**: Minor technical debt.
- **Remediation**: Update status code constants to modern Starlette / FastAPI standards.

---

### [OPS-02] Absence of Automated Database and Application Log Retention Policies
- **Severity**: LOW
- **Confidence**: Medium
- **Category**: Reliability / Storage
- **Affected Component**: Production Logging
- **File Reference**: [`src/api/main.py`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/api/main.py)
- **Defect Description**: Logs are emitted to stdout without structured JSON formatting, correlation IDs, or retention limits.
- **Impact**: Unbounded log storage growth and difficult incident root-cause analysis.
- **Remediation**: Configure structured JSON logging with log rotation and log levels.

---

### [ARCH-02] Inconsistent SQLite Storage Fallback in Production Dockerfile
- **Severity**: INFORMATIONAL
- **Confidence**: High
- **Category**: Architecture
- **Affected Component**: Backend Containerization
- **File Reference**: [`Dockerfile#L42-L43`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/Dockerfile#L42-L43)
- **Defect Description**: The production Dockerfile creates `/app/data` for local SQLite storage, even though production requires PostgreSQL for durability.
- **Impact**: Potential confusion if container restarts erase SQLite data.
- **Remediation**: Enforce that the production container fails startup if `DATABASE_URL` is not PostgreSQL.

---

### [OPS-03] Lack of End-to-End Distributed Trace Context Propagation
- **Severity**: INFORMATIONAL
- **Confidence**: Medium
- **Category**: Observability
- **Affected Component**: Distributed Tracing
- **File Reference**: [`src/api/main.py#L42-L52`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/api/main.py#L42-L52)
- **Defect Description**: `X-Request-ID` is generated independently in FastAPI, but not propagated from Next.js Vercel frontends.
- **Impact**: Cross-service request correlation requires manual timestamp alignment.
- **Remediation**: Forward client/Vercel request IDs in HTTP headers to backend endpoints.

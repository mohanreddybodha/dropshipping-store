# Production Readiness Audit: Application Security Audit

**Standard Reference**: OWASP Top 10 (2021) & OWASP API Security Top 10 (2023)  
**Target Applications**: Next.js 15 Storefront (`storefront/`) & FastAPI Backend (`src/`)  

---

## 1. Authentication & Identity Management

### 1.1 Storefront & Customer Identity
- **Current Mechanism**: Firebase Web Client SDK (`storefront/src/lib/firebase.ts`) with Google OAuth popup.
- **Flaw Analysis**:
  - The frontend captures the authenticated user's `uid`, `email`, and `displayName` from the client-side Firebase listener.
  - When communicating with backend route handlers (`/api/auth/state`, `/api/auth/sync`, `/api/user/addresses`, `/api/orders`), the client passes the raw `firebase_uid` or `email` as an unverified string in query parameters or request bodies.
  - **No ID Token Verification**: The backend has no Firebase Admin SDK initialized. It performs zero cryptographic verification of Firebase JWT tokens (`Authorization: Bearer <token>`).
  - **Impact**: Anyone who knows or guesses a user's `firebase_uid` or email address can impersonate that user and read their saved addresses, carts, watchlists, and past orders.

### 1.2 Administrative Authentication
- **FastAPI Admin Endpoint (`src/api/routes/admin.py`)**:
  - Enforces `verify_admin_key()` dependency.
  - Reads `X-Admin-API-Key` header and compares against `os.getenv("ADMIN_API_KEY")` using `hmac.compare_digest`.
  - **Assessment**: Robust against timing attacks. Correctly rejects missing or incorrect keys.
- **Next.js Storefront Admin Endpoints (`storefront/src/app/api/admin/orders/route.ts` & `sync-cj/route.ts`)**:
  - Implements a vulnerable custom `isAuthorized()` function:
    ```typescript
    const emailToCheck = (
      clientEmail ||
      req.headers.get("x-admin-email") ||
      req.nextUrl.searchParams.get("admin_email") ||
      ""
    ).trim().toLowerCase();
    return allowedEmails.includes(emailToCheck);
    ```
  - **Critical Flaw**: Trusts unauthenticated client headers (`x-admin-email`) and URL query parameters (`?admin_email=`). An attacker setting `x-admin-email: admin@vastire.com` gains full admin read/write permissions.
  - **Dev Mode Fallback Hazard**: If `ADMIN_EMAILS` is empty and `NODE_ENV !== "production"`, all requests are granted admin access unconditionally.

---

## 2. Authorization & Access Control

### 2.1 Broken Object-Level Authorization (BOLA / IDOR)
The Next.js route handlers suffer from widespread BOLA vulnerabilities across multiple customer-facing operations:

1. **`GET /api/orders`**:
   - Omitting query parameters dumps 50 complete customer orders with full PII.
   - Supplying another user's email (`?email=victim@example.com`) returns all of that victim's orders without requiring authentication.
2. **`POST /api/orders/cancel`**:
   - Allows cancellation and automated PayPal refunds.
   - Bypasses ownership verification if `customer_email` is omitted from the request body.
3. **`PATCH /api/orders/address`**:
   - Allows modifying shipping destination within 30 minutes.
   - Bypasses ownership verification if `customer_email` is omitted, enabling delivery address hijacking.
4. **`GET /api/user/addresses`**:
   - Queries saved delivery addresses using only `?email=target@example.com`. No authentication required.

### 2.2 Broken Function-Level Authorization
- `PATCH /api/admin/orders`: Allows modifying order fulfillment status, CJ Order ID, and tracking numbers. Can be accessed via the `x-admin-email` spoofing vulnerability.

---

## 3. Secrets & Environment Isolation

### 3.1 Hardcoded Secrets in Repository
- **Finding SEC-05**: In `test_cj_api.py#L22`, a production CJ Dropshipping API key was hardcoded as a fallback:
  ```python
  api_key = os.environ.get("CJ_API_KEY", "[REDACTED_CJ_API_KEY]")
  ```
  This key must be considered compromised and immediately rotated.
- **Firebase Web Config**: `storefront/src/lib/firebase.ts` contains `apiKey: "AIzaSyAIqT64qFQ9rKSsEb0_oRO0jYWKspmS8Qo"`. While Firebase web client keys are technically public identifiers, best practices dictate restricting key usage in the Google Cloud Console to authorized HTTP referrers (`https://vastire.com/*`, `localhost:*`).

### 3.2 Frontend vs Backend Environment Variables
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is public (expected).
- `PAYPAL_CLIENT_SECRET`, `CJ_API_KEY`, `ADMIN_API_KEY`, and `DATABASE_URL` are strictly server-side variables in `storefront/.env.local` and are NOT prefixed with `NEXT_PUBLIC_`. Static analysis verifies that these secrets are not bundled into browser JavaScript chunks.

---

## 4. Input Validation & Injection Risks

### 4.1 SQL Injection Analysis
- **Next.js Storefront (`@neondatabase/serverless`)**:
  - Uses tagged template literals: `sql`SELECT * FROM orders WHERE id = ${orderId}``.
  - Neon's tagged template function automatically converts variables into parameterized placeholders (`$1, $2`).
  - **Verdict**: Safe against standard SQL injection.
- **Python Backend (`SQLAlchemy 2.0`)**:
  - Uses typed ORM expressions: `db.query(Order).filter(Order.internal_order_number == order_num)`.
  - Avoids `text()` raw interpolation.
  - **Verdict**: Safe against SQL injection.
- **Weak LIKE Pattern**: `storefront/src/app/api/orders/lookup/route.ts#L23` uses `LIKE ${"%" + cleanZip + "%"}`. While parameterized, the wildcard expression allows single-character pattern matching, enabling brute-force enum searches.

### 4.2 Cross-Site Scripting (XSS)
- React 19 / Next.js 15 automatically escapes JSX expressions.
- Product descriptions in `ProductAccordion.tsx` and detail pages do not use `dangerouslySetInnerHTML`.
- In `storefront/src/app/layout.tsx`, `dangerouslySetInnerHTML` is only used for an inline chunk-loading error handler script with zero user input reflection.

---

## 5. Cross-Origin & Browser Security

### 5.1 Permissive CORS in FastAPI Backend (Finding SEC-07)
In `src/api/main.py#L86-L90`:
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
- **Hazard**: Combining `allow_origin_regex=r"^https?://.*"` with `allow_credentials=True` allows ANY external origin to make credentialed requests to the backend.
- **Remediation**: Remove `allow_origin_regex` and explicitly specify allowed origins:
  ```python
  allow_origins=["https://vastire.com", "http://localhost:3000"]
  ```

### 5.2 Security Headers
- Next.js does not currently define security headers in `next.config.js`.
- Missing recommended HTTP headers:
  - `Content-Security-Policy` (CSP)
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 6. Webhook Security Architecture

### 6.1 FastAPI Webhook Endpoint (`src/api/routes/orders.py#L71`)
- Enforces `verify_payment_webhook` dependency (`src/api/security.py`).
- Correctly inspects `raw_body` bytes before JSON deserialization.
- Performs constant-time comparison `hmac.compare_digest` with `WEBHOOK_SECRET`.
- Supports Stripe and Razorpay signature formats.
- **Gap**: Does NOT support PayPal webhook verification. PayPal webhooks use RSA-SHA256 signatures with certificates (`PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-SIG`), which fail HMAC verification.

---

## 7. Dependency & Supply Chain Security

- **Python Backend**:
  - `requirements.txt` contains pinned/bounded core dependencies (`fastapi>=0.110.0`, `pydantic>=2.6.0`, `sqlalchemy>=2.0.25`, `httpx>=0.27.0`).
  - Pytest run completed with zero critical package import failures.
- **Node.js Storefront**:
  - `package.json` uses modern stable versions (`next: ^15.1.7`, `react: ^19.0.0`).
  - `npm run build` succeeds with zero webpack bundling errors.
- **CI Dependency Integrity**:
  - `.github/workflows/ci.yml` runs on `ubuntu-latest` with pinned Python 3.11 and Node 20.
  - Both jobs use dependency caching (`pip`, `npm`).

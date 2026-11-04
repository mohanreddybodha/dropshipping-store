# Production Readiness Audit: Evidence and Audit Limitations

**Audit Completion Date**: November 4, 2026  
**Auditor Roles**: Principal Application Security Engineer, Staff Software Architect, Site Reliability Engineer  

---

## 1. Repository State & Scope Inspected

- **Git Commit SHA**: `b6ca7b9` (HEAD of `main`)
- **Remote Origin**: `https://github.com/mohanreddybodha/dropshipping-store.git`
- **Working Tree State**: Inspected with untracked scripts and modified splash files noted in repository inventory.
- **Runtimes Evaluated**:
  - Node.js: v20 LTS / Next.js 15.1.7 (React 19)
  - Python: 3.11 / 3.13 (FastAPI 0.110+, SQLAlchemy 2.0+, Pydantic v2.6+)
  - Database: Neon Serverless PostgreSQL & SQLite local engine

---

## 2. Inventory of Components & Files Inspected

### Next.js Storefront Components:
- `storefront/src/app/checkout/page.tsx` (Checkout form, address state, simulated payment handler)
- `storefront/src/app/cart/page.tsx` (Cart items, tier calculations, suggestions)
- `storefront/src/app/profile/page.tsx` (Order history display, local vs cloud sync)
- `storefront/src/app/watchlist/page.tsx` (Saved items state)
- `storefront/src/app/orders/page.tsx` (Dual-factor order lookup)
- `storefront/src/app/products/[slug]/page.tsx` (Product detail, tier pricing, bundle options)
- `storefront/src/components/layout/Navbar.tsx` (Catalog search prefetch, auth triggers)
- `storefront/src/components/layout/Footer.tsx` (Trust pillars, unlinked legal dead spans)
- `storefront/src/components/PayPalButton.tsx` (PayPal Smart Buttons wrapper, callbacks)
- `storefront/src/lib/api.ts` (API client, memory cache, fallback filtering)
- `storefront/src/lib/db.ts` (Neon database client instantiation)
- `storefront/src/lib/firebase.ts` (Firebase Auth initialization)
- `storefront/src/lib/usAddressValidation.ts` (Strict US address, ZIP, phone regex validation)
- `storefront/src/lib/seedCatalog.json` (Static seed data)

### Next.js API Route Handlers:
- `storefront/src/app/api/orders/route.ts` (Order list, parameterless public dump)
- `storefront/src/app/api/orders/checkout/route.ts` (Unpaid order insertion endpoint)
- `storefront/src/app/api/orders/paypal/create/route.ts` (PayPal order creation with client amount)
- `storefront/src/app/api/orders/paypal/capture/route.ts` (PayPal capture, order persistence)
- `storefront/src/app/api/orders/cancel/route.ts` (BOLA cancellation & refund bypass)
- `storefront/src/app/api/orders/address/route.ts` (BOLA delivery address modification)
- `storefront/src/app/api/orders/lookup/route.ts` (Dual-factor order lookup with substring ZIP)
- `storefront/src/app/api/user/addresses/route.ts` (Unauthenticated saved address harvest)
- `storefront/src/app/api/admin/orders/route.ts` (Admin orders, header spoofing auth)
- `storefront/src/app/api/admin/sync-cj/route.ts` (Manual CJ order sync, header spoofing auth)
- `storefront/src/app/api/catalog/route.ts` (Static catalog filtering from JSON)
- `storefront/src/app/api/catalog/[slug]/route.ts` (Static product lookup from JSON)
- `storefront/src/app/api/auth/state/route.ts` (User cart, watchlist, order aggregation)
- `storefront/src/app/api/auth/sync/route.ts` (Guest to user state sync)

### Python Backend & Operational Tooling:
- `src/api/main.py` (FastAPI app, universal CORS, exception handlers)
- `src/api/security.py` (HMAC webhook signature verification)
- `src/api/routes/orders.py` (Webhook handler, checkout routes, PayPal routes)
- `src/api/routes/admin.py` (Admin order list, DLQ dashboard, DLQ retry)
- `src/api/routes/catalog.py` (SQLAlchemy catalog queries)
- `src/services/cj_client.py` (CJ API v2.0 client, in-memory token bucket rate limiter)
- `src/services/order_router.py` (Circuit breaker, `logisticsMiss` gate, DLQ logger)
- `src/services/paypal_service.py` (PayPal REST API client)
- `src/models/database.py` (SQLAlchemy models, pricing engine, DB engine)
- `src/schemas/order.py` (Pydantic v2 schemas)
- `ops_sync.py` (CLI for discovery, bulk seeding, and stock auditing)
- `test_cj_api.py` (Root script with hardcoded API key)
- `tests/test_admin.py`, `tests/test_order_router.py`, `tests/test_pipeline.py`, `tests/test_security_and_router.py`

### DevOps & Infrastructure Configuration:
- `.github/workflows/ci.yml` (GitHub Actions CI pipeline)
- `Dockerfile` (Multi-stage non-root container configuration)
- `docker-compose.yml` (Local service orchestration)
- `render.yaml` (Render deployment specification)
- `railway.json` (Railway deployment specification)

---

## 3. Empirical Tools & Tests Executed

1. **Pytest Test Suite Execution**:
   - Command: `pytest -v`
   - Result: 47 passed in 29.44s.
   - Verified that all unit tests in `tests/` pass, but revealed that `test_cj_api.py` in the root directory makes live external HTTP requests.
2. **Next.js Production Build Verification**:
   - Command: `npm run build` in `storefront/`
   - Result: Compiled successfully in 50s. 10 static pages generated with zero webpack errors.
3. **Static Code & Security Analysis**:
   - Performed manual deep-dive adversarial source analysis on every public and private API route.
   - Traced all input sources from `req.json()` and `req.nextUrl.searchParams` to database SQL executions.

---

## 4. Systems and Components Not Inspected (Audit Limitations)

1. **Live Production Payment Gateway**:
   - Testing was performed against architectural endpoints and sandbox configurations.
   - Per non-negotiable Rule B, no live financial transactions were executed, no real credit cards were charged, and no real supplier orders were submitted to CJ Dropshipping.
2. **Cloud Infrastructure Dashboards (Render, Vercel, Neon)**:
   - Evaluated via local deployment files (`render.yaml`, `Dockerfile`, `next.config.js`).
   - Administrative settings configured exclusively via cloud web dashboards (e.g., Vercel WAF rules, DDoS mitigation, Render secret vaults, Neon branch backups) were not directly accessible via repository code and must be manually verified.
3. **Third-Party API Rate Limit Stress Testing**:
   - Bounded testing was conducted. High-volume volumetric flood tests against CJ Dropshipping were deliberately avoided to prevent exhausting account limits or triggering IP blacklisting.

---

## 5. Items Requiring Professional Legal & Financial Review

The technical audit identified significant compliance deficiencies that require qualified legal and accounting counsel:

1. **US E-Commerce Regulatory Compliance**:
   - **FTC Mail Order Rule (16 C.F.R. Part 435)**: Requires merchant disclosures regarding shipping timeframes and cancellation rights. The absence of a published Shipping Policy creates regulatory liability.
   - **California Consumer Privacy Act (CCPA) / State Privacy Laws**: Collection of customer PII (names, emails, phones, physical home addresses) without a published, accessible Privacy Policy violates California and other state consumer privacy statutes.
2. **Cross-Border Taxation & Entity Governance**:
   - For an India-based business owner selling to US domestic customers:
     - Potential US state Economic Nexus and Sales Tax collection obligations (post-*South Dakota v. Wayfair*).
     - Indian Goods and Services Tax (GST) rules regarding Export of Services / Goods and Foreign Inward Remittance Certificates (FIRC).
     - Reserve Bank of India (RBI) regulations regarding cross-border payment aggregator usage (PayPal, Stripe) and realization timelines.
   - **Notice**: This technical audit is not legal or tax advice. A qualified attorney and chartered accountant must be consulted before commercial transactions commence.

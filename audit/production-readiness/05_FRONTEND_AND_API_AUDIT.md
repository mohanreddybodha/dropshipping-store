# Production Readiness Audit: Frontend and API Audit

**Focus Area**: Next.js 15 App Router Storefront, Public & Internal APIs, State Management, Caching, and User Experience  

---

## 1. Storefront Security Audit

### 1.1 Client Bundle Analysis & Secrets Exposure
- Static bundle analysis of `storefront/.next/` static JavaScript chunks confirms that **no backend secrets** (`PAYPAL_CLIENT_SECRET`, `CJ_API_KEY`, `ADMIN_API_KEY`, `DATABASE_URL`) are leaked into client-side code.
- Public client environment variables are limited to `NEXT_PUBLIC_PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_API_URL`.
- Firebase configuration (`apiKey`, `projectId`, `appId`) in `storefront/src/lib/firebase.ts` is client-side by design, though domain referrer restrictions should be configured in GCP.

### 1.2 Cross-Site Scripting (XSS) & Dynamic Content
- Dynamic HTML injection risks were evaluated across all components.
- React 19 automatic JSX entity encoding protects against DOM-based XSS in title rendering, search suggestions, and reviews.
- Customer order notes and addresses are rendered as text nodes rather than innerHTML.

### 1.3 Unauthenticated Public API Exposure
As identified in Findings **SEC-01**, **SEC-02**, **SEC-03**, **SEC-04**, and **SEC-06**, Next.js route handlers expose high-risk functionality to unauthenticated clients:
- `GET /api/orders`: Dumps 50 customer records when unparameterized.
- `GET /api/user/addresses`: Returns saved addresses and phone numbers for any email.
- `POST /api/orders/cancel`: Issues automated refunds if email is omitted.
- `PATCH /api/orders/address`: Modifies delivery destination if email is omitted.
- `GET & PATCH /api/admin/orders`: Bypasses authentication via header spoofing.

---

## 2. Caching & Data Consistency

### 2.1 Static Bundling vs Live Data (Finding DATA-01)
- The documentation claimed Incremental Static Regeneration (ISR) with a 3600-second revalidation interval.
- **Reality**:
  - In `storefront/src/lib/api.ts`:
    - `getCatalog()` uses an in-memory client-side cache (`catalogMemoryCache`) with a 60,000ms (60s) TTL.
    - During Server-Side Rendering (SSR), `typeof window === "undefined"` immediately returns `filterFallbackProducts()`, which queries bundled static data (`seedCatalog.json`).
  - In `storefront/src/app/api/catalog/route.ts`:
    - The API handler imports `seedData` directly from `@/lib/seedCatalog.json` and filters the array in memory.
  - **Verdict**: The storefront does NOT use database-driven ISR. It is a completely static, hardcoded JSON catalog. Any inventory updates executed by `ops_sync.py` to the PostgreSQL database are ignored.

### 2.2 Client-Side In-Memory Cache Flaws
- In `storefront/src/lib/api.ts#L84-L100`:
  ```typescript
  const catalogMemoryCache = new Map<string, { data: Product[]; ts: number }>();
  ```
  - Caches catalog responses for 60 seconds per unique query options JSON.
  - While this eliminates redundant network roundtrips during tab navigation, it also hides price and stock changes from the user during active sessions.

---

## 3. Checkout Behavior & Input Validation

### 3.1 Delivery Boundary Enforcement
- The checkout page (`storefront/src/app/checkout/page.tsx`) and address validation utility (`storefront/src/lib/usAddressValidation.ts`) enforce strict delivery rules for the contiguous United States:
  - Non-US country codes are disabled and rejected.
  - Alaska (`AK`) and Hawaii (`HI`) are marked "Unavailable" and disabled in state dropdowns.
  - Street address validation requires house number + street name and rejects non-US keywords (e.g., "sector", "tehsil", "post office", "district").
  - ZIP code validation asserts 5-digit US formatting and validates against known state ZIP prefix ranges.
  - Phone validation enforces North American Numbering Plan (NANP) standards: 10 digits, valid area code, rejecting non-US formats (such as 6-9 digit international numbers).
- **Verdict**: US address validation logic is comprehensive, defensive, and well-structured.

### 3.2 Form Submission Hazard (Finding FIN-01)
- Despite strict input validation, the checkout form retains `onSubmit={handlePlaceOrder}`, which triggers the legacy simulated checkout when pressing Enter. This completely bypasses payment processing and creates unpaid orders.

---

## 4. User Experience, Responsiveness & Accessibility

### 4.1 Mobile & Desktop Responsiveness
- The storefront renders cleanly across desktop (1920x1080) and mobile (390x844) viewports.
- Uses Tailwind responsive modifiers (`sm:`, `md:`, `lg:`).
- Floating sticky buy bar (`MobileStickyBuyBar.tsx`) on mobile product pages ensures the primary conversion action remains visible without obscuring critical content.

### 4.2 Accessibility & Form Usability
- Form inputs have associated `<label>` tags with descriptive text.
- Validation errors are rendered inline with clear error descriptions and auto-scroll to the first invalid field upon validation failure.
- Key navigation buttons have explicit `aria-label` tags.
- Focus rings (`focus:ring-2 focus:ring-emerald-500`) provide adequate keyboard navigation feedback.

### 4.3 Missing Legal & Statutory Pages (Finding COMP-01)
- Footer links for "Privacy Policy", "Terms of Service", and "Shipping SLA" are unclickable dead `<span>` elements.
- No route or page exists for customer cancellation policies, return guidelines, or merchant identity.

# 02 — MVP Scope: Production Implementation & Delivery Architecture

> **Document Version:** 2.0.0 (Production Reality)  
> **Status:** Fully Delivered, Hardened & Verified  
> **Architecture:** Unified Full-Stack Next.js 15 on Vercel (Option A)  
> **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)  
> **Payment Gateway:** PayPal REST API v2 Exclusively  
> **Supplier Integration:** CJ Dropshipping API v2.0 (Native TypeScript Client)  
> **Last Updated:** 2026-11-14  

---

## 1. Executive Summary

### What This Platform Delivers (Production Reality)

The Vastire platform is a **fully automated, high-margin, production-hardened headless e-commerce system** operating on a unified full-stack Vercel architecture. It sources products exclusively from **CJ Dropshipping US Domestic Warehouses**, guaranteeing 3–5 business day delivery (USPS Ground Advantage, 7 days max) within the **48 Contiguous United States and Washington, D.C.**

Following the architectural consolidation documented in [`docs/ARCHITECTURE_DECISION_RECORD.md`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/docs/ARCHITECTURE_DECISION_RECORD.md), the system operates on a single authoritative backend: **Next.js 15 App Router serverless route handlers on Vercel**. The legacy FastAPI backend on Render has been retired, eliminating split-brain routing, cold-start latency, and redundant infrastructure bills.

### Core Architecture Pillars Delivered:
1. **Unified Vercel Backend:** Next.js 15 route handlers (`/api/orders/*`, `/api/admin/*`, `/api/cron/*`, `/api/auth/*`) handle all checkout, payment, fulfillment, authentication, and inventory operations.
2. **Authoritative PayPal REST API v2 Integration:** Real-time PayPal Smart Buttons with server-authoritative catalog pricing, cryptographic HMAC cart commitments in `custom_id`, capture settlement verification (`captures[0].status === "COMPLETED"`), anti-tamper refunds, and an official webhook receiver (`/api/orders/paypal/webhook`).
3. **30-Minute Pre-Fulfillment Cancellation Grace Window:** Self-serve line-item or whole-order cancellation with instant automated PayPal refunds before supplier dispatch.
4. **Automated Supplier Fulfillment Pipeline:** Native TypeScript client (`cjClient.ts`) creating domestic orders via CJ API `/shopping/order/createOrderV2` with `logisticsMiss` defensive assertions, postage amount verification, and idempotency handling (code `1603003`).
5. **Postgres-Embedded Dead-Letter Queue (DLQ):** Orders encountering supplier exceptions are safely quarantined with `fulfillment_status = 'FULFILLMENT_FAILED'`, error telemetry, and a 1-click retry button in the Admin Command Center (`/admin/orders`).
6. **Contiguous 48 US States Shipping Boundary:** Strict regex and USPS prefix validation (`usAddressValidation.ts`) rejecting Alaska, Hawaii, US territories, APO/FPO military bases, and P.O. Boxes.
7. **Firebase Authentication Ecosystem:** Customer Google Sign-In with automated database cart and watchlist synchronization across sessions, plus timing-safe administrative access control.
8. **Automated Maintenance via Vercel Cron:** `/api/cron/sync-cj` periodically audits inventory, deactivates variants below the 16-unit threshold (`us_warehouse_stock > 15`), syncs USPS tracking numbers, and revalidates static catalog pages and Google Merchant XML feeds.

### What This MVP Is NOT (Explicit Non-Goals & Deprecated Scope):
- **No Stripe or Razorpay:** Deprecated and removed from production. PayPal REST API v2 is the exclusive payment processor.
- **No Python / Render Backend:** Retired per ADR Option A. All production traffic routes to Next.js on Vercel.
- **No Cross-Border or International Shipping:** Sourcing and shipping are strictly domestic US to the 48 Contiguous States.
- **No Multi-Vendor Marketplace:** CJ Dropshipping US domestic warehouses are the sole fulfillment partner.
- **No Paid Advertising Dependencies:** 100% organic programmatic SEO, Pinterest catalog feeds, and short-form video hooks.

---

## 2. MoSCoW Feature Matrix (Delivered vs. Scope)

| Feature / Capability | Priority | Status | Implemented Module |
|---|---|---|---|
| **Unified Next.js 15 Full-Stack Backend** | Must Have | **DELIVERED** | [`storefront/src/app/api/`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/) |
| **Neon Serverless PostgreSQL Schema** | Must Have | **DELIVERED** | [`storefront/src/lib/db.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/db.ts) |
| **PayPal Smart Buttons Checkout (Capture Intent)** | Must Have | **DELIVERED** | [`PayPalButton.tsx`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/components/PayPalButton.tsx) |
| **Server-Authoritative Pricing (Zero Client Trust)** | Must Have | **DELIVERED** | [`pricing.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/pricing.ts) |
| **Cryptographic HMAC Cart Commitment** | Must Have | **DELIVERED** | [`paypal.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/paypal.ts) |
| **PayPal Settlement Verification (`COMPLETED`)** | Must Have | **DELIVERED** | [`capture/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/paypal/capture/route.ts) |
| **PayPal Webhook Receiver (Disputes & Reversals)** | Must Have | **DELIVERED** | [`webhook/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/paypal/webhook/route.ts) |
| **Native CJ Dropshipping v2.0 Client** | Must Have | **DELIVERED** | [`cjClient.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/cjClient.ts) |
| **`logisticsMiss` & Postage Defensive Gate** | Must Have | **DELIVERED** | [`cjClient.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/cjClient.ts), [`capture/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/paypal/capture/route.ts) |
| **CJ Idempotency Code `1603003` Handling** | Must Have | **DELIVERED** | [`cjClient.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/cjClient.ts) |
| **Postgres Dead-Letter Queue (DLQ)** | Must Have | **DELIVERED** | `orders.fulfillment_status`, `fulfillment_error` |
| **Admin Command Center (`/admin/orders`)** | Must Have | **DELIVERED** | [`admin/orders/page.tsx`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/admin/orders/page.tsx) |
| **1-Click Admin DLQ Fulfillment Retry** | Must Have | **DELIVERED** | [`retry-fulfillment/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/admin/orders/retry-fulfillment/route.ts) |
| **30-Minute Grace Window with Instant Refund** | Must Have | **DELIVERED** | [`cancel/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/cancel/route.ts) |
| **48 Contiguous US States Validation (No AK/HI/PO)** | Must Have | **DELIVERED** | [`usAddressValidation.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/usAddressValidation.ts) |
| **Firebase Auth (Google Sign-In) + DB Cart Sync** | Must Have | **DELIVERED** | [`firebase.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/firebase.ts), [`auth/sync/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/auth/sync/route.ts) |
| **Transactional Order Email via Resend** | Must Have | **DELIVERED** | [`email.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/email.ts) |
| **Upstash Redis Caching & Rate Limiting** | Must Have | **DELIVERED** | [`redis.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/redis.ts) |
| **Automated Inventory Sync (`> 15` Units Floor)** | Must Have | **DELIVERED** | [`sync-cj/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/cron/sync-cj/route.ts) |
| **Dynamic Tiered Pricing & Amazon Matching** | Must Have | **DELIVERED** | [`database.py`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/src/models/database.py), [`PRODUCT_PIPELINE_RULES.md`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/PRODUCT_PIPELINE_RULES.md) |
| **Volume Bundles (1x, 2x -12%, 3x -18%)** | Must Have | **DELIVERED** | [`bundlePricing.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/bundlePricing.ts) |
| **Google Merchant Center XML Feed** | Should Have | **DELIVERED** | [`merchant-feed.xml/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/merchant-feed.xml/route.ts) |
| **Dynamic XML Sitemap & Robots.txt** | Should Have | **DELIVERED** | [`sitemap.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/sitemap.ts), [`robots.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/robots.ts) |
| **Pinterest Bulk Pins CSV Generator** | Should Have | **DELIVERED** | `generate_pinterest_csv.js` |
| **Personalized Recommendations Algorithm** | Could Have | **DELIVERED** | [`recommendations.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/recommendations.ts) |
| **Production Test Suite (P0/P1/P2)** | Must Have | **DELIVERED** | `npm run test:production` (37 tests) |
| **Stripe / Razorpay Checkout** | Won't Have | **DEPRECATED** | Omitted in favor of exclusive PayPal v2 |
| **FastAPI Backend on Render** | Won't Have | **RETIRED** | Consolidated onto Vercel App Router |
| **Cross-Border / India Logistics** | Won't Have | **DISQUALIFIED** | Prohibited due to 12–50 day transit |

---

## 3. Implemented API & Component Blueprint

### 3.1 Next.js App Router API Routes (`storefront/src/app/api/`)

| Endpoint Path | HTTP Method | Auth Level | Purpose |
|---|---|---|---|
| `/api/orders/paypal/config` | `GET` | Public | Returns authoritative `clientId`, `currency: "USD"`, and environment mode |
| `/api/orders/paypal/create` | `POST` | Public | Validates US address, computes authoritative price, returns PayPal order with HMAC |
| `/api/orders/paypal/capture` | `POST` | Public | Captures payment, verifies settlement, persists to DB, triggers CJ & Resend |
| `/api/orders/paypal/webhook` | `POST` | Cryptographic | Official PayPal webhook handler for refunds, reversals, and disputes |
| `/api/orders/cancel` | `POST` | Customer/Admin | 30-minute grace window self-serve cancellation and automated PayPal refund |
| `/api/orders/address` | `PATCH` | Customer/Admin | Updates shipping address within 30-minute pre-fulfillment grace period |
| `/api/orders/lookup` | `GET` | Customer | Order lookup by `orderNumber` and `email` for guest checkout tracking |
| `/api/orders` | `GET` | Customer | Lists order history for authenticated customer email / Firebase UID |
| `/api/admin/orders` | `GET` | Admin (Zero-Trust) | Admin Command Center: lists all orders with grace timers and DLQ status |
| `/api/admin/orders/retry-fulfillment` | `POST` | Admin (Zero-Trust) | 1-click manual retry for failed supplier submissions |
| `/api/cron/sync-cj` | `GET` / `POST` | Cron / Admin | Scheduled cron: stock audits (`> 15`), tracking sync, and ISR cache revalidation |
| `/api/auth/sync` | `POST` | Public / Auth | Upserts Firebase user, merges guest cart and watchlist to PostgreSQL |
| `/api/auth/state` | `GET` | Auth | Retrieves user profile, saved addresses, and active orders |
| `/api/auth/cart/save` | `POST` | Auth | Persists customer cart items to `user_carts` table |
| `/api/auth/watchlist/toggle` | `POST` | Auth | Toggles product bookmark in `user_watchlists` table |
| `/api/catalog` | `GET` | Public | Dynamic filtered catalog endpoint with active stock checks |

### 3.2 Frontend Storefront Pages (`storefront/src/app/`)

| Page Route | Component Description |
|---|---|
| `/` | High-converting homepage featuring category tabs, hero spotlight, and trust badges |
| `/products/[slug]` | Product Detail Page (PDP): PAS copy, image gallery, specs, bundle selector (1x/2x/3x), stock floor check |
| `/collections/[slug]` | Category collection pages with SEO metadata and faceted filters |
| `/cart` | Dynamic cart drawer and dedicated cart page with volume tier savings indicators |
| `/checkout` | 1-page checkout: Contiguous US address validation, PayPal Smart Buttons, 5s success animation |
| `/orders` | Customer order tracking portal with real-time tracking numbers and cancellation buttons |
| `/admin/orders` | Admin Command Center: order table, live grace countdowns, 1-click DLQ retry |
| `/profile` | Customer profile management with saved addresses and Google account details |
| `/watchlist` | Customer saved items dashboard |
| `/shipping-policy` | Explicit 3–5 business day contiguous domestic shipping policy |
| `/refund-policy` | Explicit 30-minute cancellation grace period and domestic warranty terms |

---

## 4. Production Database Schema (Neon PostgreSQL)

### 4.1 Tables in Active Production

1. **`orders`**:
   - `id` (SERIAL PRIMARY KEY)
   - `internal_order_number` (VARCHAR, UNIQUE) — e.g. `ORD-1731500000-A1B2`
   - `cj_order_id` (VARCHAR, NULLABLE) — CJ Dropshipping order identifier
   - `customer_email` (VARCHAR, INDEXED)
   - `customer_phone` (VARCHAR)
   - `stripe_payment_intent_id` (VARCHAR, INDEXED) — Stores PayPal Order ID (`cleanPayPalOrderId`)
   - `status` (VARCHAR) — `ORDER_PLACED`, `SUPPLIER_PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`
   - `total_retail` (NUMERIC)
   - `total_wholesale` (NUMERIC)
   - `net_profit` (NUMERIC)
   - `shipping_name`, `shipping_address`, `shipping_city`, `shipping_province`, `shipping_zip`, `shipping_country`
   - `carrier_name` (VARCHAR, default `USPS`)
   - `tracking_number` (VARCHAR, NULLABLE)
   - `fulfillment_status` (VARCHAR) — `PENDING`, `SUPPLIER_PROCESSING`, `FULFILLMENT_FAILED`, `SANDBOX_SKIPPED`
   - `fulfillment_error` (TEXT, NULLABLE) — Stores raw failure diagnostics for DLQ review
   - `dlq_retry_count` (INTEGER, default 0)
   - `items_json` (JSONB / JSON) — Complete verified line-item array with SKU, VID, tier, and price
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **`users`**:
   - `id` (SERIAL PRIMARY KEY)
   - `firebase_uid` (VARCHAR, UNIQUE, INDEXED)
   - `email` (VARCHAR, UNIQUE, INDEXED)
   - `display_name`, `photo_url`, `phone_number`
   - `created_at`, `last_login_at` (TIMESTAMPTZ)

3. **`user_carts`**:
   - `id` (SERIAL PRIMARY KEY)
   - `user_id` (INTEGER, FK to `users.id`)
   - `product_pid`, `variant_vid`, `title`, `image_url`, `tier`, `selected_size`, `quantity`, `unit_price`, `updated_at`

4. **`user_watchlists`**:
   - `id` (SERIAL PRIMARY KEY)
   - `user_id` (INTEGER, FK to `users.id`)
   - `product_pid` (VARCHAR)
   - `created_at` (TIMESTAMPTZ)

5. **`products` & `product_variants`**:
   - Curated catalog tables containing PID, VID, titles, categories, rich PAS copy, specs, volume tier prices, verified US warehouse inventory, and availability flags (`is_active`, `is_available`).
   - Synced with fallback to [`seedCatalog.json`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/seedCatalog.json) (90+ curated products).

6. **`sync_audit_logs`**:
   - Audit trail of automated catalog synchronization runs (`sync-cj`).

---

## 5. Security & Verification Milestones

### Hardened Production Implementation:
- **Zero Client Trust:** Client prices in order submission payloads are strictly ignored. Authoritative prices are re-computed server-side from database/seed catalog records.
- **Cryptographic Anti-Tampering:** HMAC-SHA256 signature commitments verify that the captured PayPal transaction matches the exact items, quantities, and USD total authorized at checkout. Any mismatch triggers an automated refund.
- **Timing-Safe Admin Auth:** Administrative API keys are validated using `crypto.timingSafeEqual`, preventing timing attacks.
- **Firebase Token Verification:** Administrative Google accounts are validated against Google Identity Toolkit and authorized emails (`ADMIN_EMAILS`).
- **PayPal Webhook Verification:** Official verification via PayPal API `/v1/notifications/verify-webhook-signature` with certificate host pinning.
- **Test Suite Coverage:**
  - `npm run test:production`: **37/37 tests passed** (Phase P0: Core API & DB, Phase P1: Fulfillment & DLQ, Phase P2: Security & Multi-Tenant Resiliency).
  - `pytest tests/`: **46/46 legacy Python tests passed** (Pricing formulas, CJ API schemas, pipeline rules).
  - Production build: `npm run build` compiles **106/106 static/SSG pages** cleanly with 0 TypeScript errors.

---

*End of MVP Scope & Delivery Architecture — Version 2.0.0*

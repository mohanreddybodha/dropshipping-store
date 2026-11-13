# Vastire Storefront & Unified Backend (Next.js 15 + React 19)

This repository contains the complete full-stack web application for **Vastire**, an autonomous, conversion-optimized headless e-commerce brand operating on a unified Vercel deployment.

Architected with Next.js 15 (App Router), React 19, Tailwind CSS, and Lucide React, it combines a high-speed customer storefront with an authoritative serverless backend handling payments, order fulfillment, customer accounts, and catalog operations.

---

## 1. Quick Start (Local Development)

```bash
# Navigate to the storefront directory
cd storefront

# Install dependencies
npm install

# Run the local development server (http://localhost:3000)
npm run dev
```

---

## 2. Environment Variables (`.env.local`)

Create a `.env.local` file inside `storefront/`:

```env
# Database (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-...neon.tech/neondb?sslmode=require"

# PayPal REST API v2 (Production: live, Testing: sandbox)
PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret"
PAYPAL_MODE="live"
PAYPAL_WEBHOOK_ID="your_paypal_webhook_id"

# CJ Dropshipping API v2.0
CJ_API_KEY="your_cj_api_key_32_hex"

# Administration & Zero-Trust Security
ADMIN_API_KEY="your_secure_random_admin_api_key"
ADMIN_EMAILS="ceo@vastire.com,admin@vastire.com"

# Transactional Emails (Resend)
RESEND_API_KEY="re_..."

# Upstash Redis (Distributed CJ Token Cache & Rate Limiting)
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# Vercel Cron Security
CRON_SECRET="your_secure_cron_secret"

# Canonical Domain URL
NEXT_PUBLIC_SITE_URL="https://vastire.com"
```

---

## 3. Production Verification & Testing

The application includes an end-to-end automated production test suite covering API routes, database connections, PayPal verification, and Dead-Letter Queue fulfillment logic:

```bash
# Run production verification tests (37 tests across P0, P1, P2)
npm run test:production

# Verify TypeScript type integrity (0 errors expected)
npx tsc --noEmit

# Test production build & SSG compilation (106 pages expected)
npm run build
```

---

## 4. Key Architectural Features

1. **Unified Vercel Backend:**
   - Serverless route handlers (`/api/orders/*`, `/api/admin/*`, `/api/cron/*`, `/api/auth/*`) serve as the sole authoritative backend (eliminating split-brain routing and retired external services).
2. **Authoritative PayPal REST API v2:**
   - Real-time Smart Buttons with server-authoritative catalog pricing, cryptographic HMAC cart commitments in `custom_id`, capture settlement verification, and automatic refund on tampering.
3. **Automated Supplier Fulfillment:**
   - Native TypeScript client (`src/lib/cjClient.ts`) creating domestic US orders via CJ Dropshipping API v2.0 with `logisticsMiss` defensive assertions.
4. **30-Minute Grace Window & DLQ:**
   - Self-serve line-item and whole-order cancellation with instant PayPal refund.
   - Postgres-embedded Dead-Letter Queue (DLQ) with 1-click retry in the Admin Command Center (`/admin/orders`).
5. **Strict Contiguous 48 US States Shipping Boundary:**
   - Enforces 3–5 day USPS Ground Advantage domestic fulfillment, strictly blocking Alaska, Hawaii, US territories, APO/FPO bases, and P.O. Boxes.
6. **Firebase Authentication:**
   - Google Sign-In for customers with persistent multi-device carts (`user_carts`) and watchlists (`user_watchlists`).

---

## 5. Security & CSP Headers

The application enforces strict zero-trust security:
- **Zero Client Trust:** Client prices in order requests are strictly ignored.
- **Timing-Safe Auth:** `crypto.timingSafeEqual` prevents side-channel timing attacks on admin endpoints.
- **Webhook Signature Verification:** Cryptographic signature check via PayPal's official API with certificate URL host pinning.
- **Strict Content Security Policy:** Script sources restricted to `'self'`, `'unsafe-inline'`, and PayPal SDK (`https://www.paypal.com`, `https://*.paypalobjects.com`).

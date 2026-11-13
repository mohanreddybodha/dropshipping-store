# 05 — Solo Operator Operations Runbook (Vastire)

> **Document Version:** 2.0.0 (Production-Aligned)  
> **Status:** Active Operational Standard  
> **Audience:** Solo Operator / CEO / Antigravity AI  
> **Architecture:** Unified Next.js 15 App Router (Vercel) + Neon Serverless PostgreSQL  
> **Payment Gateway:** PayPal REST API v2 (`PAYPAL_MODE=live`)  
> **Fulfillment:** CJ Dropshipping API v2.0 (US Domestic Warehouses Only)  
> **Last Reviewed:** 2026-11-14  

---

## 1. Overview & Philosophy

### What This Platform Is
Vastire is a **high-margin, autonomous headless e-commerce store** operating on a unified full-stack Vercel deployment. Products are sourced exclusively from **CJ Dropshipping US Domestic Warehouses**, guaranteeing 3–5 business day delivery (USPS Ground Advantage, 7 days max) within the **48 Contiguous United States and Washington, D.C.**

Following the consolidation in [`docs/ARCHITECTURE_DECISION_RECORD.md`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/docs/ARCHITECTURE_DECISION_RECORD.md), the system operates on a single authoritative backend: Next.js 15 App Router serverless route handlers on Vercel. All payments are processed through **PayPal REST API v2**, and all supplier orders are dispatched natively in TypeScript (`storefront/src/lib/cjClient.ts`).

### Operational Objectives & Time Budget
The system is architected for a **solo operator spending < 2 hours per week** on maintenance:
1. **Automated Inventory & Tracking Maintenance:** Vercel Cron (`/api/cron/sync-cj`) runs periodically to audit inventory, deactivate any variant dropping to $\le 15$ units (`MIN_ACTIVE_US_STOCK = 16`), fetch carrier tracking numbers, and revalidate static caches.
2. **Admin Command Center:** Access `/admin/orders` on desktop or mobile to monitor orders in real time, view active 30-minute grace period timers, and execute 1-click retries for any failed supplier submissions.
3. **Zero Idle Cloud Bills:** Fixed monthly hosting cost is **\$0.00** across Vercel Hobby, Neon PostgreSQL free tier, Upstash Redis, and Resend.

---

## 2. Environment Variables & Production Configuration

All production environment variables are configured in **Vercel Project Settings > Environment Variables**:

| Variable Name | Required Runtime | Secret? | Description & Value Format |
|---|---|---|---|
| `DATABASE_URL` | Server | **YES** | Neon PostgreSQL connection string: `postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require` |
| `PAYPAL_CLIENT_ID` | Server + Client | Public | Production PayPal REST API Client ID from PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | Server Only | **YES** | Production PayPal REST API Secret |
| `PAYPAL_MODE` | Server Only | Config | Must be set to `live` for real money processing (`sandbox` for testing) |
| `PAYPAL_WEBHOOK_ID` | Server Only | **YES** | Webhook ID created in PayPal Developer Dashboard for `/api/orders/paypal/webhook` |
| `CJ_API_KEY` | Server Only | **YES** | CJ Dropshipping API v2.0 developer key (32-character hex) |
| `ADMIN_API_KEY` | Server Only | **YES** | High-entropy random key used for timing-safe API authorization |
| `ADMIN_EMAILS` | Server Only | Config | Comma-separated list of authorized administrator Google emails (e.g. `ceo@vastire.com`) |
| `RESEND_API_KEY` | Server Only | **YES** | Resend API key for transactional order confirmation emails (`re_...`) |
| `UPSTASH_REDIS_REST_URL` | Server Only | **YES** | Upstash Redis REST URL for distributed token caching |
| `UPSTASH_REDIS_REST_TOKEN` | Server Only | **YES** | Upstash Redis REST Token |
| `CRON_SECRET` | Server Only | **YES** | High-entropy secret authorizing Vercel Cron requests to `/api/cron/sync-cj` |
| `NEXT_PUBLIC_SITE_URL` | Server + Client | Public | Canonical production URL (e.g. `https://vastire.com`) |

---

## 3. Routine Weekly Operations SOP

### Task 1: Monitoring Orders in the Admin Command Center (`/admin/orders`)
**Cadence:** 5 minutes daily or as orders occur  
1. Open `https://vastire.com/admin/orders` in your browser.
2. Authenticate with your authorized administrator Google account (or enter your `x-admin-api-key`).
3. Inspect the live orders table:
   - **Order Status:** `ORDER_PLACED`, `SUPPLIER_PROCESSING`, `SHIPPED`, or `DELIVERED`.
   - **Grace Period Timer:** Displays countdown for the 30-minute customer cancellation window.
   - **Fulfillment Status:** Displays `SUPPLIER_PROCESSING` (success), `SANDBOX_SKIPPED` (test), or `FULFILLMENT_FAILED` (supplier error).
4. If any order displays `FULFILLMENT_FAILED`:
   - Inspect the `fulfillment_error` diagnostic column.
   - Verify your CJ Dropshipping wallet has sufficient funds to cover the wholesale cost.
   - Click the **"Retry Fulfillment"** button to trigger `/api/admin/orders/retry-fulfillment`.

### Task 2: Automated Inventory & Tracking Audit (`/api/cron/sync-cj`)
**Cadence:** Automated via Vercel Cron (or manual trigger when desired)  
- The cron job performs three operations in sequence:
  1. **Carrier Tracking Sync:** Queries CJ Dropshipping for all active orders with unassigned tracking numbers. When assigned by the warehouse, updates status to `SHIPPED` with carrier and tracking ID.
  2. **Inventory Stock Floor Audit:** Queries CJ API for candidate variants at 0.87 QPS. If physical US stock drops to $\le 15$ units (`MIN_ACTIVE_US_STOCK = 16`), marks `is_available = FALSE`. If all variants fail, deactivates the product.
  3. **Cache & Feed Revalidation:** Revalidates homepage (`/`), collection pages, product pages, `/sitemap.xml`, and Google Merchant Center feed (`/merchant-feed.xml`).
- To manually trigger the sync:
  ```powershell
  curl -X GET "https://vastire.com/api/cron/sync-cj" -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```

### Task 3: Catalog Discovery & Expansion (`ops_sync.py`)
**Cadence:** Every 72–96 hours or when adding new winning products  
1. Activate Python virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
2. Verify `.env` contains `CJ_API_KEY` and `DATABASE_URL`.
3. Run discovery scan adhering to [`PRODUCT_PIPELINE_RULES.md`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/PRODUCT_PIPELINE_RULES.md):
   ```powershell
   python ops_sync.py --discover
   ```
4. Verify all new candidate products satisfy:
   - Wholesale cost: \$3.00–\$22.00
   - Physical US warehouse stock: $\ge 50$ units
   - Category: Matches one of the 5 approved verticals (Home & Kitchen, Workspace & Tech, Smart Lighting, Outdoor & Patio, Everyday Carry & Auto)
   - Zero prohibited tokens (no skincare, cosmetics, supplements, clothing, trademarked brands)
   - Net Profit $\ge \$4.00$, Net Margin $\ge 20\%$, Gross Margin $\ge 35\%$

---

## 4. Emergency & Incident Runbooks

### Incident 1: Supplier Fulfillment Failure (`logisticsMiss = true` or `FULFILLMENT_FAILED`)

#### Symptoms
- Admin Command Center displays an order with `fulfillment_status = 'FULFILLMENT_FAILED'`.
- Error diagnostics indicate `logisticsMiss: true`, carrier unserviceable, or insufficient CJ wallet balance.

#### Root Causes & Solutions
1. **Insufficient CJ Wallet Balance:**
   - *Cause:* CJ Dropshipping requires merchant funds in balance to deduct wholesale cost upon API order creation.
   - *Fix:* Log into `https://cjdropshipping.com` > **Wallet** > Recharge \$50–\$100 via PayPal or credit card.
   - Return to `/admin/orders` and click **"Retry Fulfillment"**.
2. **Logistics Miss on Shipping Address:**
   - *Cause:* Customer entered an unserviceable remote address or invalid street format that passed frontend validation but failed CJ carrier routing.
   - *Fix:* Contact customer via phone/email to confirm physical street address. Update address via `/api/orders/address` (or directly in Neon DB), then click **"Retry Fulfillment"**.
3. **Permanent Fulfillment Impossibility:**
   - *Fix:* If the item cannot be fulfilled, issue a full refund immediately to the customer via the PayPal transaction dashboard and update order status to `CANCELLED`.

---

### Incident 2: Customer Requests Cancellation within 30 Minutes

#### Standard Self-Serve Flow
1. Customers can cancel their own order directly from the order confirmation page or `/orders` portal during the **30-minute grace window**.
2. The system automatically calls PayPal's Refund API (`refundPayPalCapture`), credits 100% of the funds back to the customer's payment method, and sets `orders.status = 'CANCELLED'`.
3. Because the order has not yet been dispatched to CJ Dropshipping (`cj_order_id` is null), zero supplier cancellation fees are incurred.

#### Manual Operator Cancellation (After Grace Window or via Support)
If a customer emails support requesting cancellation:
1. Check the order in the Admin Command Center:
   - If `cj_order_id` is already assigned, fulfillment has been submitted to the warehouse. Log into CJ Dropshipping > **My CJ** > **Dropshipping Orders** and check if the order status is "Pending" (cancellable) or "Dispatched" (cannot cancel).
   - If CJ permits cancellation, cancel on CJ first, then issue the refund in the PayPal Dashboard and update the order status in Neon DB:
     ```sql
     UPDATE orders SET status = 'CANCELLED', fulfillment_status = 'CANCELLED', updated_at = NOW() WHERE internal_order_number = 'ORD-XXXXX';
     ```

---

### Incident 3: Price Verification or HMAC Mismatch Alert

#### Symptoms
- Error log: `[SECURITY ALERT] PayPal capture integrity mismatch for ... Initiating automatic refund.`
- HTTP 400 returned to checkout client with code `PAYMENT_VERIFICATION_FAILED`.

#### What This Means
- A malicious client attempted to modify the order price, change quantities, or alter currency parameters during checkout.
- The server-side pricing engine detected that the captured PayPal transaction did not match the authoritative catalog calculation or HMAC commitment in `custom_id`.
- **Automatic Defense:** The server automatically called PayPal's Refund API to return the funds to the payer, and aborted order creation.
- **Action Required:** None. The attack was neutralized automatically. Review the IP address or customer email in logs if persistent.

---

### Incident 4: CJ API Authentication or Rate Limit Failure (Code `1600200` / `1601001`)

#### Symptoms
- API logs display HTTP 429 or `{"code": "1600200", "message": "Too Many Requests"}`.
- Automated sync is paused.

#### Solution
- The native TypeScript client (`cjClient.ts`) automatically spaces calls at $\ge 1,150$ms intervals (0.87 QPS), well under CJ's 1.0 QPS ceiling.
- If a temporary rate limit burst occurs, wait 60 seconds. The token-bucket will clear.
- Access tokens are cached in-memory and shared across instances via Upstash Redis with a 14-day validity window. If token rotation is needed, trigger:
  ```powershell
  # Clear cached token in Redis (if needed)
  # Fresh token will be fetched automatically on next API call using CJ_API_KEY
  ```

---

## 5. Monthly Maintenance & Financial Audits

Execute these 5 verification tasks on the 1st of every month:

1. **Neon PostgreSQL Storage Audit:**
   - Log into [Neon Console](https://console.neon.tech).
   - Verify database storage usage is well below the 0.5 GB free-tier boundary.
   - Run row count check on `orders` and `sync_audit_logs`.
2. **PayPal Merchant Account Health Check:**
   - Log into [PayPal Business Dashboard](https://www.paypal.com).
   - Check Dispute Resolution Center for open buyer inquiries or claims (target: 0 disputes).
   - Verify transaction volume and reserve balance.
3. **CJ Dropshipping Account & Wallet Check:**
   - Verify CJ wallet balance maintains at least \$50.00 buffer for domestic order deductions.
   - Verify default logistics remains set to **USPS US to US**.
4. **Google Merchant Center Feed Health:**
   - Log into [Google Merchant Center](https://merchants.google.com).
   - Check Feed Status for `https://vastire.com/merchant-feed.xml`.
   - Verify active approved products match active catalog (target: 100% approval, zero brand mismatch disapprovals).
5. **Production Verification Test Run:**
   - Run the automated production test suite locally to ensure no API contract regressions:
     ```powershell
     cd storefront
     npm run test:production
     ```
   - Target: **37/37 tests passing**.

---

## 6. Key SQL Queries Reference (Neon PostgreSQL)

Run these queries in the Neon SQL Editor or via a local database client:

### 6.1 Orders Placed Today & Live Status
```sql
SELECT
  id,
  internal_order_number,
  status,
  fulfillment_status,
  total_retail,
  net_profit,
  customer_email,
  shipping_city,
  shipping_province,
  carrier_name,
  tracking_number,
  created_at
FROM orders
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

### 6.2 Failed Supplier Fulfillments (Dead-Letter Queue Audit)
```sql
SELECT
  id,
  internal_order_number,
  status,
  fulfillment_status,
  fulfillment_error,
  dlq_retry_count,
  total_retail,
  customer_email,
  created_at
FROM orders
WHERE fulfillment_status = 'FULFILLMENT_FAILED'
ORDER BY created_at DESC;
```

### 6.3 30-Day Revenue, Wholesale Cost & Realized Net Profit
```sql
SELECT
  COUNT(*) AS total_orders,
  ROUND(SUM(total_retail), 2) AS gross_revenue_usd,
  ROUND(SUM(total_wholesale), 2) AS total_cogs_usd,
  ROUND(SUM(net_profit), 2) AS net_profit_usd,
  ROUND((SUM(net_profit) / NULLIF(SUM(total_retail), 0)) * 100, 1) AS blended_net_margin_pct
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND status NOT IN ('CANCELLED', 'REFUNDED');
```

### 6.4 Active Storefront Stock Health (Variants Floor Check)
```sql
SELECT
  p.id AS product_id,
  p.title,
  p.category,
  COUNT(v.id) AS total_variants,
  COUNT(v.id) FILTER (WHERE v.is_available = TRUE AND v.us_warehouse_stock > 15) AS in_stock_variants,
  MIN(v.us_warehouse_stock) AS min_variant_stock,
  MAX(v.us_warehouse_stock) AS max_variant_stock
FROM products p
LEFT JOIN product_variants v ON v.product_id = p.id
WHERE p.is_active = TRUE
GROUP BY p.id, p.title, p.category
ORDER BY min_variant_stock ASC;
```

### 6.5 Orders Awaiting Tracking Sync (> 24 Hours Old)
```sql
SELECT
  id,
  internal_order_number,
  cj_order_id,
  status,
  created_at,
  NOW() - created_at AS elapsed_time
FROM orders
WHERE cj_order_id IS NOT NULL
  AND tracking_number IS NULL
  AND status NOT IN ('CANCELLED', 'DELIVERED')
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC;
```

---

## 7. Mermaid Diagram: Ops Sync & Inventory Decision Logic

```mermaid
flowchart TD
    Start([Start Automated Cron / Ingestion]) --> Auth{Authenticate to CJ API}
    Auth -- Fails --> Telemetry[Log Telemetry Error & Abort Sync safely]
    Auth -- Succeeds --> FetchStock[Query US Warehouse Stock at <=0.87 QPS]

    FetchStock --> StockCheck{Physical US Stock > 15 units?}
    StockCheck -- No: Stock <= 15 --> DeactVariant[Set is_available = FALSE]
    DeactVariant --> CheckProductVariants{Any remaining variants > 15?}
    CheckProductVariants -- No --> DeactProduct[Set products.is_active = FALSE]
    CheckProductVariants -- Yes --> NextVariant[Proceed to Next Variant]

    StockCheck -- Yes: Stock >= 16 --> MarginCheck{Net Profit >= $4.00 AND Net Margin >= 20%?}
    MarginCheck -- No --> DeactVariant
    MarginCheck -- Yes --> ContentCheck{Passes Whitelist & Zero Prohibited Words?}
    ContentCheck -- No --> DeactProduct
    ContentCheck -- Yes --> KeepActive[Variant marked is_available = TRUE]

    DeactProduct --> RevalidateCache[Clear Catalog Server Cache]
    KeepActive --> RevalidateCache
    RevalidateCache --> NextjsISR[revalidatePath('/', '/sitemap.xml', '/merchant-feed.xml')]
    NextjsISR --> Finish([Sync Complete — 100% In-Stock Catalog])
```

---

*End of Solo Operator Operations Runbook — Version 2.0.0*

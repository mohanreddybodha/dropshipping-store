# 03 — System Design Document: Production Architecture

> **Document Version:** 2.0.0 (Production-Aligned)  
> **Status:** Production Standard  
> **Architecture Topology:** Option A — Unified Full-Stack Next.js 15 App Router on Vercel  
> **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)  
> **Payment Engine:** PayPal REST API v2 (Smart Buttons, Capture Intent, HMAC Commitments)  
> **Supplier Integration:** CJ Dropshipping API v2.0 (Native TypeScript Client)  
> **Last Updated:** 2026-11-14  

---

## Table of Contents

1. [Architecture Principles & Goals](#1-architecture-principles--goals)
2. [C4 Container Diagram](#2-c4-container-diagram)
3. [Component Breakdown](#3-component-breakdown)
4. [Database Schema & ERD (Neon PostgreSQL)](#4-database-schema--erd-neon-postgresql)
5. [Sequence Diagram 1 — Automated Catalog & Inventory Sync](#5-sequence-diagram-1--automated-catalog--inventory-sync)
6. [Sequence Diagram 2 — Zero-Touch Checkout & Order Fulfillment](#6-sequence-diagram-2--zero-touch-checkout--order-fulfillment)
7. [Sequence Diagram 3 — 30-Minute Grace Period & Self-Serve Cancellation](#7-sequence-diagram-3--30-minute-grace-period--self-serve-cancellation)
8. [Sequence Diagram 4 — Admin Command Center & DLQ Retry](#8-sequence-diagram-4--admin-command-center--dlq-retry)
9. [Order Lifecycle State Machine](#9-order-lifecycle-state-machine)
10. [Security & Anti-Fraud Architecture](#10-security--anti-fraud-architecture)
11. [Deployment & Infrastructure Topology](#11-deployment--infrastructure-topology)

---

## 1. Architecture Principles & Goals

Following the architectural consolidation detailed in [`docs/ARCHITECTURE_DECISION_RECORD.md`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/docs/ARCHITECTURE_DECISION_RECORD.md), the system is deployed as a **Unified Full-Stack Next.js 15 App Router application on Vercel**. The legacy FastAPI backend on Render is retired.

### Core Architectural Goals:
1. **Single Source of Truth:** Next.js App Router serverless route handlers serve as the sole authoritative backend, eliminating split-brain routing and phantom orders.
2. **Zero-Trust Security:** Server-authoritative catalog pricing strictly ignores client prices; cryptographic HMAC commitments protect order integrity; timing-safe comparisons guard admin operations.
3. **Automated Supplier Fulfillment:** Seamless dispatch to CJ Dropshipping US domestic warehouses upon live payment capture, backed by defensive `logisticsMiss` assertion gates.
4. **Resilient Error Recovery:** An embedded Postgres Dead-Letter Queue (DLQ) state machine captures fulfillment exceptions and exposes a 1-click retry interface in the Admin Command Center (`/admin/orders`).
5. **Zero Baseline Operational Cost:** Optimized within the free tiers of Vercel and Neon Serverless PostgreSQL.
6. **Strict Domestic Fulfillment Boundary:** Delivery is limited to the **48 Contiguous United States and Washington, D.C.** via USPS Ground Advantage (3–5 business days), actively rejecting Alaska, Hawaii, US territories, APO/FPO military addresses, and P.O. Boxes.

---

## 2. C4 Container Diagram

```mermaid
flowchart TD
    subgraph CustomerDevice ["🛒 Customer / Admin Browser"]
        Client["React 19 Storefront Client\n(Tailwind CSS + Lucide Icons)"]
    end

    subgraph VercelCloud ["☁️ Vercel Global Edge & Serverless Platform"]
        EdgeRouter["Vercel Edge Network\n(CDN, Caching, SSL Termination)"]
        
        subgraph NextAppRouter ["Next.js 15 Full-Stack App Router"]
            UI["Server & Client Components\n(SSG / ISR Product Pages, Cart, Checkout)"]
            
            subgraph APIRoutes ["Authoritative API Route Handlers"]
                OrdersAPI["/api/orders/paypal/*\n(config, create, capture, webhook)"]
                CancelAPI["/api/orders/cancel\n(30-Min Grace Window, Refund)"]
                AddressAPI["/api/orders/address\n(Grace Period Address Update)"]
                AdminAPI["/api/admin/orders/*\n(Admin Command Center, DLQ Retry)"]
                CronAPI["/api/cron/sync-cj\n(Stock Audit >15, Tracking, ISR Purge)"]
                AuthAPI["/api/auth/*\n(Firebase User Sync, Cart & Watchlist)"]
            end
            
            subgraph CoreLibraries ["Shared Server Modules"]
                CJClient["cjClient.ts\n(CJ API v2.0, logisticsMiss Guard)"]
                PayPalLib["paypal.ts\n(HMAC Commitments, Tokens, Refunds)"]
                PricingLib["pricing.ts & bundlePricing.ts\n(Authoritative Catalog Pricing)"]
                AddressLib["usAddressValidation.ts\n(48 Contiguous US State Validation)"]
                AdminAuthLib["adminAuth.ts\n(Timing-Safe Key & Firebase Verification)"]
                EmailLib["email.ts\n(Transactional Resend Email)"]
                RedisLib["redis.ts\n(Upstash Redis Token Cache)"]
            end
        end
    end

    subgraph DataStorage ["🗄️ Managed Persistence Layer"]
        NeonDB[("Neon Serverless PostgreSQL\n(@neondatabase/serverless)\norders, users, carts, watchlists, products")]
        UpstashRedis[("Upstash Redis\n(Distributed CJ Token Cache)")]
    end

    subgraph ExternalServices ["🌐 External Cloud APIs"]
        PayPalAPI["PayPal REST API v2\n(OAuth2, Orders, Captures, Webhooks)"]
        CJAPI["CJ Dropshipping API v2.0\n(US Domestic Warehouses, 0.87 QPS)"]
        FirebaseAuth["Firebase Authentication\n(Google Sign-In, Identity Toolkit)"]
        ResendAPI["Resend Email API\n(Order Confirmation Delivery)"]
    end

    Client -->|HTTPS / Requests| EdgeRouter
    EdgeRouter --> UI
    EdgeRouter --> APIRoutes

    APIRoutes --> CoreLibraries
    CoreLibraries --> NeonDB
    CoreLibraries --> UpstashRedis

    OrdersAPI -->|OAuth & Payments| PayPalAPI
    CancelAPI -->|Refund Capture| PayPalAPI
    OrdersAPI -->|Cryptographic Webhook| PayPalAPI

    CJClient -->|createOrderV2 / Tracking| CJAPI
    AdminAuthLib -->|Token Verification| FirebaseAuth
    EmailLib -->|Transactional Email| ResendAPI
```

---

## 3. Component Breakdown

| Component | Technology | File Location | Responsibility |
|---|---|---|---|
| **Storefront UI** | Next.js 15, React 19, Tailwind CSS | [`storefront/src/app/`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/) | Renders high-converting homepage, PDPs, cart, checkout, customer order tracker, and admin center |
| **Payment Controller** | Next.js Serverless Route Handlers | [`storefront/src/app/api/orders/paypal/`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/paypal/) | Generates config, creates orders with HMAC commitments, captures funds, verifies settlements, and processes webhooks |
| **Cancellation & Grace Manager** | Next.js Route Handler | [`storefront/src/app/api/orders/cancel/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/orders/cancel/route.ts) | Enforces 30-minute server-side grace window; triggers instant PayPal refunds on line-item or order cancellations |
| **Address & Shipping Gate** | Next.js Route Handler & Library | [`storefront/src/lib/usAddressValidation.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/usAddressValidation.ts) | Validates domestic street addresses, cities, states, ZIP codes, and phones against the 48 Contiguous US States (rejects AK/HI/PO) |
| **Fulfillment Client** | Native TypeScript CJ Client | [`storefront/src/lib/cjClient.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/cjClient.ts) | Manages CJ API v2.0 authentication, order submission via `/shopping/order/createOrderV2`, `logisticsMiss` assertions, and idempotency |
| **Authoritative Pricing Engine** | TypeScript Module | [`storefront/src/lib/pricing.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/pricing.ts) | Recomputes line-item prices, wholesale costs, volume discounts (1x/2x/3x), and cart totals server-side |
| **Admin Command Center** | Next.js UI & Admin API | [`storefront/src/app/admin/orders/`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/admin/orders/) | Real-time monitoring of orders, active grace countdowns, DLQ failure inspection, and 1-click manual retry |
| **Maintenance Cron** | Vercel Cron Route Handler | [`storefront/src/app/api/cron/sync-cj/route.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/cron/sync-cj/route.ts) | Scheduled stock audits (`> 15` units floor), tracking sync, compliance checks, and ISR cache revalidation |
| **Authentication Sync** | Next.js Route Handlers | [`storefront/src/app/api/auth/`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/app/api/auth/) | Merges guest carts and watchlists into Neon PostgreSQL on Firebase Google Sign-In |

---

## 4. Database Schema & ERD (Neon PostgreSQL)

```mermaid
erDiagram
    users ||--o{ user_carts : owns
    users ||--o{ user_watchlists : saves
    users ||--o{ orders : places
    products ||--o{ product_variants : contains

    users {
        int id PK
        string firebase_uid UK
        string email UK
        string display_name
        string photo_url
        string phone_number
        timestamptz created_at
        timestamptz last_login_at
    }

    orders {
        int id PK
        string internal_order_number UK
        string cj_order_id
        string customer_email
        string customer_phone
        string stripe_payment_intent_id
        string status
        numeric total_retail
        numeric total_wholesale
        numeric net_profit
        string shipping_name
        string shipping_address
        string shipping_city
        string shipping_province
        string shipping_zip
        string shipping_country
        string carrier_name
        string tracking_number
        string fulfillment_status
        text fulfillment_error
        int dlq_retry_count
        jsonb items_json
        timestamptz created_at
        timestamptz updated_at
    }

    user_carts {
        int id PK
        int user_id FK
        string product_pid
        string variant_vid
        string title
        string image_url
        int tier
        string selected_size
        int quantity
        numeric unit_price
        timestamptz updated_at
    }

    user_watchlists {
        int id PK
        int user_id FK
        string product_pid
        timestamptz created_at
    }

    products {
        int id PK
        string pid UK
        string title
        string brand_title
        string slug UK
        string category
        string hero_image_url
        jsonb images_json
        text pas_description_html
        jsonb features_json
        jsonb specs_json
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    product_variants {
        int id PK
        string vid UK
        int product_id FK
        string sku
        string image_url
        numeric wholesale_cost
        numeric shipping_cost
        numeric retail_price
        numeric bundle_2_price
        numeric bundle_3_price
        int us_warehouse_stock
        string carrier_name
        string delivery_sla
        boolean is_available
        timestamptz stock_synced_at
    }

    sync_audit_logs {
        int id PK
        string sync_type
        int items_processed
        int items_updated
        jsonb errors_json
        timestamptz timestamp
    }
```

---

## 5. Sequence Diagram 1 — Automated Catalog & Inventory Sync

Executed on a scheduled cadence via Vercel Cron or manual admin trigger.

```mermaid
sequenceDiagram
    autonumber
    participant Vercel as Vercel Cron Scheduler
    participant Cron as /api/cron/sync-cj
    participant DB as Neon PostgreSQL
    participant CJ as CJ Dropshipping API v2.0
    participant ISR as Next.js Cache & Revalidation

    Vercel->>Cron: GET /api/cron/sync-cj (Header: Bearer CRON_SECRET)
    Cron->>Cron: Timing-safe authentication check (CRON_SECRET / ADMIN_API_KEY)
    
    rect rgb(240, 248, 255)
        Note over Cron,CJ: 1. Order Tracking Sync
        Cron->>DB: Query orders where status NOT IN ('CANCELLED','DELIVERED') & tracking_number IS NULL
        loop For eligible orders (max 20 per run)
            Cron->>CJ: fetchCjOrderTracking(cj_order_id)
            alt Tracking Found
                Cron->>DB: UPDATE orders SET tracking_number, carrier_name, status = 'SHIPPED'
            end
        end
    end

    rect rgb(255, 250, 240)
        Note over Cron,CJ: 2. Time-Budgeted Live Inventory Audit (0.87 QPS Throttled)
        Cron->>CJ: getCjAccessToken()
        Cron->>DB: Query active variants batch (ordered by stock_synced_at ASC)
        loop For variants within 42s budget deadline
            Cron->>Cron: Sleep 1,150ms (0.87 QPS throttle)
            Cron->>CJ: queryVariantUsStockByVid(vid)
            CJ-->>Cron: usStock count
            Cron->>Cron: Evaluate liveStock >= 16 (MIN_ACTIVE_US_STOCK) & Net_Profit >= $4.00
            Cron->>DB: UPDATE product_variants SET us_warehouse_stock, is_available, stock_synced_at
        end
    end

    rect rgb(240, 255, 240)
        Note over Cron,ISR: 3. Deterministic Compliance & Cache Invalidation
        Cron->>DB: Deactivate products failing prohibited keywords or content specs
        Cron->>DB: Deactivate products where all variants have us_warehouse_stock <= 15
        Cron->>Cron: clearCatalogCache() & clearPricingCache()
        Cron->>ISR: revalidatePath('/', '/sitemap.xml', '/merchant-feed.xml')
    end

    Cron-->>Vercel: HTTP 200 OK (Processed & Updated Summary)
```

---

## 6. Sequence Diagram 2 — Zero-Touch Checkout & Order Fulfillment

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Storefront as Next.js Storefront (/checkout)
    participant PayPalBtn as PayPalButton.tsx
    participant ConfigRoute as /api/orders/paypal/config
    participant CreateRoute as /api/orders/paypal/create
    participant CaptureRoute as /api/orders/paypal/capture
    participant PayPal as PayPal REST API v2
    participant DB as Neon PostgreSQL
    participant CJ as CJ Dropshipping API v2.0
    participant Resend as Resend Email API

    Storefront->>ConfigRoute: GET /api/orders/paypal/config
    ConfigRoute-->>Storefront: { clientId, currency: "USD", mode: "live" }
    Storefront->>PayPalBtn: Initialize SDK with authorized clientId

    Customer->>PayPalBtn: Clicks PayPal Checkout Button
    PayPalBtn->>CreateRoute: POST /api/orders/paypal/create (customer shipping, items)
    CreateRoute->>CreateRoute: Validate Contiguous 48 US States address (usAddressValidation.ts)
    CreateRoute->>CreateRoute: Recompute authoritative catalog prices & wholesale costs (pricing.ts)
    CreateRoute->>CreateRoute: Generate HMAC-SHA256 commitment hash
    CreateRoute->>PayPal: POST /v2/checkout/orders (intent: CAPTURE, custom_id: HMAC)
    PayPal-->>CreateRoute: { id: "PAYPAL_ORDER_ID" }
    CreateRoute-->>PayPalBtn: { orderID: "PAYPAL_ORDER_ID" }

    PayPalBtn->>Customer: Opens PayPal Smart Buttons payment modal
    Customer->>PayPal: Approves payment transaction
    PayPal-->>PayPalBtn: onApprove trigger

    PayPalBtn->>CaptureRoute: POST /api/orders/paypal/capture (paypal_order_id, shipping, items)
    CaptureRoute->>CaptureRoute: Pre-capture address & cart validation (fail-closed)
    CaptureRoute->>DB: Check Anti-Replay (SELECT FROM orders WHERE stripe_payment_intent_id = id)
    CaptureRoute->>PayPal: POST /v2/checkout/orders/{id}/capture
    PayPal-->>CaptureRoute: Capture Response Object
    CaptureRoute->>CaptureRoute: Assert capture.status == "COMPLETED" & currency == "USD"
    CaptureRoute->>CaptureRoute: Verify captured amount matches authoritative cart
    CaptureRoute->>CaptureRoute: Verify HMAC commitment hash in custom_id

    alt HMAC or Amount Mismatch (Anti-Tampering Trigger)
        CaptureRoute->>PayPal: POST /v2/payments/captures/{id}/refund (Immediate automatic refund)
        CaptureRoute-->>PayPalBtn: HTTP 400 (Order pricing verification mismatch. Refunded.)
    else Integrity Validated
        CaptureRoute->>DB: Atomic INSERT INTO orders (status: 'ORDER_PLACED')
        CaptureRoute->>DB: Atomic stock decrement on product_variants
        CaptureRoute->>Resend: Non-blocking sendOrderConfirmationEmail()
        
        alt Live Mode (PAYPAL_MODE=live)
            CaptureRoute->>CJ: POST /shopping/order/createOrderV2 (USPS US to US, payType: 3)
            alt CJ Submission Successful
                CJ-->>CaptureRoute: { code: 200, data: { cjOrderId: "CJ12345" } }
                CaptureRoute->>DB: UPDATE orders SET cj_order_id, status = 'SUPPLIER_PROCESSING'
            else CJ Submission Exception / Failure
                CaptureRoute->>DB: UPDATE orders SET fulfillment_status = 'FULFILLMENT_FAILED', fulfillment_error = err
            end
        else Sandbox Mode
            CaptureRoute->>DB: UPDATE orders SET fulfillment_status = 'SANDBOX_SKIPPED'
        end
        
        CaptureRoute-->>Storefront: Confirmed Order Object
        Storefront->>Customer: Renders Triumphant Success Animation (5s)
        Storefront->>Customer: Renders Order Details with Active 30-Minute Grace Window
    end
```

---

## 7. Sequence Diagram 3 — 30-Minute Grace Period & Self-Serve Cancellation

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Storefront as /orders or /checkout
    participant CancelRoute as /api/orders/cancel
    participant DB as Neon PostgreSQL
    participant PayPal as PayPal REST API v2

    Customer->>Storefront: Clicks "Cancel Order" (or specific line-item)
    Storefront->>CancelRoute: POST /api/orders/cancel { orderNumber, customer_email, itemIndex?, reason }
    
    CancelRoute->>DB: SELECT * FROM orders WHERE internal_order_number = orderNumber
    CancelRoute->>CancelRoute: Verify authorization (customer_email match OR admin key)
    CancelRoute->>CancelRoute: Assert order.cj_order_id IS NULL (supplier unfulfilled)
    CancelRoute->>CancelRoute: Calculate elapsed time = NOW() - order.created_at
    
    alt Elapsed Time > 30 Minutes
        CancelRoute-->>Storefront: HTTP 403 (GRACE_PERIOD_EXPIRED)
        Storefront->>Customer: "Cancellation window expired. Order is locked for fulfillment."
    else Elapsed Time <= 30 Minutes
        CancelRoute->>CancelRoute: Calculate refundable amount (capped by remaining balance)
        CancelRoute->>PayPal: POST /v2/payments/captures/{capture_id}/refund { amount: refundAmount }
        PayPal-->>CancelRoute: Refund Completed
        
        alt Full Order Cancelled
            CancelRoute->>DB: UPDATE orders SET status = 'CANCELLED', fulfillment_status = 'CANCELLED'
        else Line-Item Cancelled
            CancelRoute->>DB: UPDATE orders SET status = 'PARTIALLY_CANCELLED', items_json = updatedItems
        end
        
        CancelRoute-->>Storefront: HTTP 200 { success: true, refundAmount, status }
        Storefront->>Customer: Displays cancellation confirmation and refund notification
    end
```

---

## 8. Sequence Diagram 4 — Admin Command Center & DLQ Retry

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Store Administrator
    participant AdminUI as /admin/orders
    participant AdminAPI as /api/admin/orders
    participant RetryAPI as /api/admin/orders/retry-fulfillment
    participant DB as Neon PostgreSQL
    participant CJ as CJ Dropshipping API v2.0

    Admin->>AdminUI: Navigates to Admin Command Center
    AdminUI->>AdminAPI: GET /api/admin/orders (Header: Authorization Bearer ID_TOKEN)
    AdminAPI->>AdminAPI: verifyAdminAuth() (Timing-safe key OR Google token in ADMIN_EMAILS)
    AdminAPI->>DB: SELECT * FROM orders ORDER BY created_at DESC LIMIT 200
    AdminAPI->>AdminAPI: Compute remaining grace seconds & active status
    AdminAPI-->>AdminUI: Orders List with Grace Timers & DLQ Errors

    Note over Admin,AdminUI: Admin reviews order with status 'FULFILLMENT_FAILED'
    Admin->>AdminUI: Clicks "Retry Fulfillment" Button
    AdminUI->>RetryAPI: POST /api/admin/orders/retry-fulfillment { internal_order_number }
    RetryAPI->>RetryAPI: verifyAdminAuth()
    RetryAPI->>DB: SELECT * FROM orders WHERE internal_order_number = num
    
    alt Order already has cj_order_id
        RetryAPI-->>AdminUI: Order already fulfilled ({ cj_order_id })
    else Unfulfilled Failed Order
        RetryAPI->>RetryAPI: Parse items_json and resolve variant IDs (VIDs)
        RetryAPI->>CJ: createCjOrder(orderParams)
        alt Retry Successful
            CJ-->>RetryAPI: { success: true, cjOrderId: "CJ67890" }
            RetryAPI->>DB: UPDATE orders SET cj_order_id, status = 'SUPPLIER_PROCESSING', fulfillment_status = 'SUPPLIER_PROCESSING'
            RetryAPI-->>AdminUI: HTTP 200 { success: true, cj_order_id: "CJ67890" }
        else Retry Failed
            CJ-->>RetryAPI: Error details
            RetryAPI->>DB: UPDATE orders SET dlq_retry_count = dlq_retry_count + 1, fulfillment_error = err
            RetryAPI-->>AdminUI: HTTP 500 { error: "CJ_FULFILLMENT_FAILED", message: err }
        end
    end
```

---

## 9. Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PAYMENT_PENDING: Customer initiates checkout
    
    PAYMENT_PENDING --> ORDER_PLACED: PayPal Capture Settled (COMPLETED)
    PAYMENT_PENDING --> CANCELLED: Payment aborted or rejected
    
    state ORDER_PLACED {
        [*] --> GRACE_ACTIVE: 30-Minute Timer Running
        GRACE_ACTIVE --> CANCELLED: Customer cancels via self-serve API (100% Refund)
        GRACE_ACTIVE --> GRACE_EXPIRED: 30 Minutes Elapse
    }
    
    ORDER_PLACED --> SUPPLIER_PROCESSING: Live order dispatched to CJ Dropshipping
    ORDER_PLACED --> SANDBOX_SKIPPED: Test order in Sandbox mode
    ORDER_PLACED --> FULFILLMENT_FAILED: CJ submission rejected (logisticsMiss / auth error)
    
    FULFILLMENT_FAILED --> SUPPLIER_PROCESSING: Admin 1-Click Retry via Command Center
    
    SUPPLIER_PROCESSING --> SHIPPED: Tracking number assigned by CJ warehouse
    SHIPPED --> DELIVERED: Carrier confirms delivery
    
    ORDER_PLACED --> REFUNDED: Disputed / reversed via PayPal Webhook
    SUPPLIER_PROCESSING --> REFUNDED: Webhook reversal
```

---

## 10. Security & Anti-Fraud Architecture

1. **Zero Client Trust Pricing:** All pricing calculations occur server-side inside [`storefront/src/lib/pricing.ts`](file:///c:/Users/bodha/OneDrive/Desktop/DropShipping/storefront/src/lib/pricing.ts). Client price fields are ignored.
2. **Cryptographic HMAC Commitment:** When an order is created on PayPal, the server embeds an HMAC-SHA256 signature of `{ total, currency, items: [{ vid, quantity }] }` keyed with `PAYPAL_CLIENT_SECRET` into `purchase_units[0].custom_id`. On capture, the server recomputes the HMAC and verifies that the captured payment matches the exact cart state.
3. **Automated Price Mismatch Refund:** If a price difference $> \$0.05$ or an invalid HMAC commitment is detected on capture, an immediate automated refund is issued via PayPal API to protect the store from manipulated requests.
4. **Anti-Replay Idempotency:** The database indexes `stripe_payment_intent_id` (storing the PayPal transaction ID). If a duplicate capture request arrives, it returns the existing order record without double-capturing or creating secondary orders.
5. **Cryptographic Webhook Signature Verification:** Incoming webhooks are validated using PayPal's `/v1/notifications/verify-webhook-signature` API, with certificate URLs pinned strictly to official PayPal domains (`api.paypal.com`, `api-m.paypal.com`).
6. **Timing-Safe Admin Authentication:** Administrative keys are verified using `crypto.timingSafeEqual` to eliminate side-channel timing attacks. Firebase tokens are validated against Google Identity Toolkit and checked against authorized `ADMIN_EMAILS`.
7. **Strict Geographic Address Gate:** Non-contiguous states (Alaska, Hawaii), US territories, military installations, and P.O. Boxes are blocked prior to payment authorization.

---

## 11. Deployment & Infrastructure Topology

- **Vercel Project:** Hosts the entire full-stack application (Next.js 15 App Router).
- **Database:** Neon Serverless PostgreSQL with auto-scaling compute and connection pooling over WebSocket/HTTP.
- **Cache:** Upstash Serverless Redis for distributed CJ access token sharing and rate-limit counters.
- **Environment Configuration:**
  - `DATABASE_URL`: Connection string to Neon PostgreSQL
  - `PAYPAL_CLIENT_ID`: Authoritative PayPal REST API Client ID
  - `PAYPAL_CLIENT_SECRET`: Authoritative PayPal Secret
  - `PAYPAL_MODE`: `live` (Production) or `sandbox` (Testing)
  - `PAYPAL_WEBHOOK_ID`: PayPal Webhook ID for signature verification
  - `CJ_API_KEY`: CJ Dropshipping API key
  - `ADMIN_API_KEY`: High-entropy timing-safe secret for admin endpoints
  - `ADMIN_EMAILS`: Comma-separated list of authorized administrator Google accounts
  - `RESEND_API_KEY`: API key for transactional emails
  - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis credentials
  - `CRON_SECRET`: High-entropy secret authorizing scheduled cron runs

---

*End of System Design Document — Version 2.0.0 (Production-Aligned)*

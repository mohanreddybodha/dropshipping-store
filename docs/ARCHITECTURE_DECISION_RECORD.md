# Architecture Decision Record (ADR): Unified Vercel Next.js 15 Backend

## Status
**ACCEPTED & IMPLEMENTED** (Phase P0 & P1 Completed)

## Context
Prior to this architectural consolidation, the platform suffered from a critical split-brain design:
1. **Frontend / Next.js on Vercel**: The storefront made direct calls to Next.js route handlers (`/api/orders`, `/api/orders/checkout`, `/api/orders/paypal/*`), writing order records to PostgreSQL but completely omitting fulfillment calls to suppliers.
2. **Backend / FastAPI on Render**: The Python backend contained a robust `CJClient` and `OrderRouter`, but was completely bypassed by the live customer journey because `NEXT_PUBLIC_API_URL` defaulted to `/api` (same-origin Next.js).
3. **Double Failure Surface**: The business was forced to maintain, monitor, and pay for two separate cloud platforms (Vercel + Render), two separate runtime environments (Node.js + Python), and two disjoint database connection pools, while customers experienced zero automated fulfillment.

## Decision
Consolidate authoritatively onto **Option A: Vercel-Unified Full-Stack Architecture**:
- Next.js 15 App Router serverless route handlers serve as the sole authoritative backend.
- The Python Render service is retired.
- All supplier integrations (CJ Dropshipping API v2.0) are implemented natively in TypeScript serverless functions (`storefront/src/lib/cjClient.ts`).
- Payment capture on PayPal triggers automated supplier order creation with defensive gates (`logisticsMiss` assertions and idempotency checks).
- A Dead-Letter Queue (DLQ) state machine is embedded directly in PostgreSQL (`fulfillment_status`, `fulfillment_error`, `dlq_retry_count`) with 1-click manual retry capabilities in the Admin Command Center (`/admin/orders`).
- Centralized cryptographic zero-trust authentication (`storefront/src/lib/adminAuth.ts`) governs all administrative and order management operations.

## Consequences & Trade-offs
### Positive
- **Single Source of Truth**: Completely eliminates split-brain routing and phantom orders.
- **Automated Fulfillment**: Orders captured via PayPal are automatically submitted to CJ Dropshipping for US domestic fulfillment.
- **Zero Idle Infrastructure Costs**: Retiring the Render backend eliminates cold start latency and unneeded service bills.
- **Unified Environment Configuration**: All environment variables (`DATABASE_URL`, `PAYPAL_*`, `CJ_API_KEY`, `ADMIN_API_KEY`, `ADMIN_EMAILS`) reside in a single Vercel project configuration.

### Operational Requirements
- Vercel project environment must have `CJ_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, and `ADMIN_API_KEY` configured.

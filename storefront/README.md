# Storefront Deployment & Architecture Guide (Next.js 15 + React 19)

This storefront is a high-performance, conversion-rate-optimized (CRO) headless e-commerce web application engineered with Next.js 15 (App Router), React 19, Tailwind CSS, and Lucide React.

It connects to the secure FastAPI dropshipping fulfillment backend.

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

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL for FastAPI Backend | `http://localhost:8000/api` (Local) or `https://api.yourdomain.com/api` (Prod) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key | `pk_live_...` |
| `NEXT_PUBLIC_SITE_URL` | Canonical Storefront URL | `https://yourdomain.com` |

---

## 3. Production Deployment on Vercel (Recommended)

### Step 1: Connect GitHub Repository
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New Project** and select your GitHub repository.
3. Set **Root Directory** to `storefront`.
4. Framework Preset: **Next.js**.

### Step 2: Configure Environment Variables
Add the following in Vercel Project Settings > Environment Variables:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Step 3: Edge Caching & ISR (Incremental Static Regeneration)
- Homepage (`/`) and Catalog (`/products/[slug]`) utilize Next.js fetch caching (`next: { revalidate: 3600 }`).
- Real-time stock status is validated during bundle selection and final checkout submission to prevent out-of-stock ordering.

---

## 4. Standalone Docker Deployment

The storefront is configured with `output: "standalone"` in `next.config.js`.

```bash
# Build Docker image
docker build -t dropship-storefront ./storefront

# Run Docker container
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL="http://backend:8000/api" dropship-storefront
```

---

## 5. Security & CSP Headers

In production, ensure your reverse proxy (Cloudflare/Vercel) enforces strict Content Security Policy (CSP):
- Script source: `'self'`, Stripe JS (`https://js.stripe.com`)
- Connect source: `'self'`, Backend API (`https://api.yourdomain.com`), Stripe API (`https://api.stripe.com`)
- Image source: `'self'`, CJ Dropshipping CDN (`https://*.cjdropshipping.com`, `https://cc-west-usa.oss-us-west-1.aliyuncs.com`)

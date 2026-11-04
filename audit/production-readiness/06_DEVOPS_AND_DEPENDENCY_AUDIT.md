# Production Readiness Audit: DevOps, CI/CD, and Deployment Security

**Focus Area**: GitHub Actions Workflows, Dockerfile Construction, Container Hardening, Environment Separation, and Cloud Deployments  

---

## 1. CI/CD Workflows (`.github/workflows/ci.yml`)

### 1.1 Workflow Configuration Audit
```yaml
name: CI/CD Pipeline & Quality Gate
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
```

### 1.2 Security & Execution Analysis
- **Job 1: `backend-tests`**:
  - Uses `actions/checkout@v4` and `actions/setup-python@v5`.
  - Runs `pytest -v tests/` with pinned environment variables (`DATABASE_URL: "sqlite:///data/test.db"`, dummy `ADMIN_API_KEY`, dummy `WEBHOOK_SECRET`, dummy `CJ_API_KEY`).
  - **Strength**: Specifying `tests/` explicitly avoids running `test_cj_api.py` located in the root directory, preventing live third-party API execution in CI.
  - **Weakness**: Does not run static security analysis tools (such as `bandit` or `flake8`). Does not check dependencies against vulnerability databases (`pip-audit` or `safety`).
- **Job 2: `frontend-build`**:
  - Uses `actions/setup-node@v4` with Node.js 20 and `npm ci`.
  - Runs `npm run build` in `storefront/`.
  - **Critical Gap (TEST-01)**: The frontend job runs NO test suite! There are no unit tests, integration tests, or Playwright E2E checkout tests executed in CI. Any frontend regression (including the form Enter key bypass) will build cleanly and pass CI.

---

## 2. Dockerfile & Container Security (`Dockerfile`)

### 2.1 Multi-Stage Build Analysis
- **Stage 1 (`builder`)**: Uses `python:3.11-slim`, installs `build-essential` and `libpq-dev`, builds wheels with `pip install --user`, and strips apt caches.
- **Stage 2 (`runner`)**: Uses `python:3.11-slim`, installs runtime `libpq5` and `curl`, copies built dependencies from builder.
- **User Permissions**:
  ```dockerfile
  RUN addgroup --system --gid 1001 appgroup && \
      adduser --system --uid 1001 --ingroup appgroup --no-create-home appuser
  ...
  USER appuser
  ```
  - **Verdict**: Excellent container hardening practice. Runs as an unprivileged non-root user (`appuser`, UID 1001), mitigating container escape risks.

### 2.2 Operational Deficiencies in Dockerfile
1. **Multiprocess Rate Limiter Conflict (Finding REL-01)**:
   - Line 54: `CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--access-log"]`
   - Spawns 4 workers. The in-memory rate limiter in `cj_client.py` and circuit breaker in `order_router.py` are unshared across workers, defeating the 0.9 QPS rate limit.
2. **Ephemeral SQLite Data Directory in Container (Finding ARCH-02)**:
   - Line 43: `RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data`
   - If the container runs on Render or Railway without a mounted persistent volume and `DATABASE_URL` is omitted, the backend defaults to `sqlite:///data/ecommerce.db`. Any container restart or redeployment will destroy the database, wiping out all orders and customer records. Production MUST require an external PostgreSQL connection.

---

## 3. Deployment Configurations (Render & Railway)

### 3.1 Render Configuration (`render.yaml`)
```yaml
services:
  - type: web
    name: dropshipping-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn src.api.main:app --host 0.0.0.0 --port $PORT --workers 2
    healthCheckPath: /health
```
- Notice that `render.yaml` specifies `--workers 2`, while `Dockerfile` specifies `--workers 4`.
- If deployed via Docker on Render, `Dockerfile` takes precedence; if deployed via native Python buildpack, `render.yaml` takes precedence.
- In both cases, multiple workers are spawned, which undermines process-local rate limiting.

### 3.2 Vercel Deployment Configuration
- Storefront is configured for Next.js 15 on Vercel.
- `storefront/next.config.js` enables standard App Router optimizations.
- Missing custom HTTP headers for security (CSP, HSTS, X-Content-Type-Options).

---

## 4. Operational Maintenance Tooling (`ops_sync.py`)

- **Script Analysis**:
  - `ops_sync.py` is an operational CLI for catalog discovery, bulk seeding, and stock auditing.
  - Correctly implements token-bucket rate limiting (0.75 QPS) for CLI usage.
  - Accurately parses US warehouse availability and filters prohibited products via extensive keywords.
- **Operational Risks**:
  - `ops_sync.py` writes directly to the local or cloud database (`products`, `product_variants`).
  - Because Next.js uses `seedCatalog.json`, running `ops_sync.py` does not update the live storefront until `seedCatalog.json` is exported and the storefront is redeployed.
  - The script does NOT process or submit customer orders (confirmed by code inspection).

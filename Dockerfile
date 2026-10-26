# syntax=docker/dockerfile:1.4
# ==============================================================================
# Production Multi-Stage Dockerfile for FastAPI E-Commerce Backend
# Security Hardening: Non-root user, slim base image, pinned layers
# ==============================================================================

FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime dependencies for psycopg2 and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create secure non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup --no-create-home appuser

# Copy installed python packages from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy source code and default data directory
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup ops_sync.py ./ops_sync.py

# Create persistent storage directory for local SQLite fallback and file locks
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

USER appuser

EXPOSE 8000

# Healthcheck probe every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn with 4 worker processes
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--access-log"]

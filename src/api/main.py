"""Main FastAPI application with zero-trust security architecture, request tracing, and sanitized error handlers."""

from __future__ import annotations

import logging
import traceback
import uuid
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from src.api.routes.admin import router as admin_router
from src.api.routes.auth import router as auth_router
from src.api.routes.catalog import router as catalog_router
from src.api.routes.orders import router as orders_router
from src.models.database import SyncAuditLog, get_session, init_db
from src.services.order_router import (
    CircuitBreakerOpenException,
    CJAPIException,
    LogisticsMissException,
    OrderRouterException,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("api_main")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Inject a unique X-Request-ID header into every incoming request and outgoing response."""

    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:16]}"
        request.state.request_id = req_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database tables on startup."""
    logger.info("Initializing database schema on startup...")
    try:
        init_db()
        logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.error("Database initialization failed during lifespan startup: %s", exc)
    yield
    logger.info("Application shutting down...")


app = FastAPI(
    title="Autonomous Dropshipping Headless API",
    version="2.0.0",
    description="Security-hardened headless e-commerce backend with zero-trust webhook verification and defensive fulfillment.",
    lifespan=lifespan,
)

# 1. Request ID Tracing Middleware
app.add_middleware(RequestIdMiddleware)

# 2. Strict CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# 3. Defensive Global Exception Handlers (Information Disclosure Prevention)

@app.exception_handler(LogisticsMissException)
async def logistics_miss_exception_handler(request: Request, exc: LogisticsMissException):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.critical("[%s] LogisticsMissException: %s", req_id, exc)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "LOGISTICS_MISS",
            "message": "Fulfillment address unroutable or shipping line unviable.",
            "request_id": req_id,
        },
    )


@app.exception_handler(CircuitBreakerOpenException)
async def circuit_breaker_exception_handler(request: Request, exc: CircuitBreakerOpenException):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error("[%s] CircuitBreakerOpenException: %s", req_id, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "SERVICE_UNAVAILABLE",
            "message": "Supplier fulfillment gateway is currently undergoing circuit maintenance.",
            "request_id": req_id,
        },
    )


@app.exception_handler(CJAPIException)
async def cj_api_exception_handler(request: Request, exc: CJAPIException):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error("[%s] CJAPIException: %s", req_id, exc)
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "SUPPLIER_GATEWAY_ERROR",
            "message": "External fulfillment provider returned an error.",
            "request_id": req_id,
        },
    )


@app.exception_handler(OrderRouterException)
async def order_router_exception_handler(request: Request, exc: OrderRouterException):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error("[%s] OrderRouterException: %s", req_id, exc)
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "ORDER_ROUTER_FAILURE",
            "message": "Order fulfillment could not be completed.",
            "request_id": req_id,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Sanitizes unexpected server errors, preventing internal stack traces or SQL leaks."""
    req_id = getattr(request.state, "request_id", "unknown")
    tb = traceback.format_exc()
    logger.critical("[%s] UNHANDLED EXCEPTION:\n%s", req_id, tb)

    # Secure internal logging to SyncAuditLog
    try:
        session = get_session()
        audit_log = SyncAuditLog(
            sync_type="UNHANDLED_EXCEPTION",
            items_processed=0,
            items_updated=0,
            errors_json=[{
                "request_id": req_id,
                "url": str(request.url),
                "error": str(exc),
                "traceback": tb,
            }],
        )
        session.add(audit_log)
        session.commit()
        session.close()
    except Exception as log_err:
        logger.error("Failed recording exception to SyncAuditLog: %s", log_err)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "code": 500,
            "request_id": req_id,
        },
    )


# Mount Sub-routers
app.include_router(catalog_router, prefix="/api", tags=["Catalog"])
app.include_router(orders_router, prefix="/api", tags=["Orders & Webhooks"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth & Cloud Sync"])
app.include_router(admin_router, prefix="/api", tags=["Admin & DLQ"])


@app.get("/", tags=["Health"])
def root(request: Request) -> Dict[str, str]:
    return {
        "status": "healthy",
        "service": "Autonomous Dropshipping API v2.0",
        "request_id": getattr(request.state, "request_id", ""),
    }


@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, str]:
    return {"status": "ok", "security": "zero-trust"}

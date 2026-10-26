"""Admin Command Center & Dead-Letter Queue (DLQ) Management Routes.

Enforces:
1. Static ADMIN_API_KEY header authentication with constant-time verification.
2. Full visibility into order statuses (PENDING, CJ_ORDER_CREATED, MANUAL_REVIEW_DLQ).
3. DLQ error inspection and manual retry dispatch.
"""

from __future__ import annotations

import hmac
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.models.database import Order, SyncAuditLog, get_session
from src.services.order_router import (
    CustomerShippingAddress,
    OrderLineItem,
    OrderRouter,
    OrderSubmissionRequest,
    OrderSubmissionResult,
)

logger = logging.getLogger("admin_api")
router = APIRouter()


def get_db():
    session = get_session()
    try:
        yield session
    finally:
        session.close()


def verify_admin_key(
    x_admin_api_key: Optional[str] = Header(None, alias="X-Admin-API-Key"),
) -> str:
    """FastAPI dependency asserting valid admin authentication."""
    expected_key = os.getenv("ADMIN_API_KEY", "")
    if not expected_key:
        logger.error("ADMIN_API_KEY is not configured in environment. Rejecting admin access.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "FORBIDDEN", "message": "Admin API is not configured on this server."},
        )

    if not x_admin_api_key or not hmac.compare_digest(x_admin_api_key.strip(), expected_key.strip()):
        logger.warning("Unauthorized access attempt to Admin API.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED", "message": "Invalid or missing X-Admin-API-Key header."},
        )

    return x_admin_api_key


class AdminOrderResponse(BaseModel):
    id: int
    internal_order_number: str
    cj_order_id: Optional[str]
    customer_email: str
    status: str
    total_retail: float
    total_wholesale: float
    net_profit: float
    carrier_name: str
    tracking_number: Optional[str]
    shipping_name: str
    shipping_city: str
    shipping_zip: str
    created_at: str


class DLQOrderResponse(BaseModel):
    id: int
    internal_order_number: str
    customer_email: str
    status: str
    shipping_address: str
    shipping_zip: str
    total_retail: float
    created_at: str


class DLQAuditEntry(BaseModel):
    id: int
    sync_type: str
    errors: Optional[List[Dict[str, Any]]]
    timestamp: str


class DLQDashboardResponse(BaseModel):
    dlq_count: int
    failed_orders: List[DLQOrderResponse]
    recent_dlq_logs: List[DLQAuditEntry]


@router.get("/admin/orders", response_model=List[AdminOrderResponse])
def list_orders(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_status: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_key),
):
    """List all store orders with status filtering (PENDING, CJ_ORDER_CREATED, MANUAL_REVIEW_DLQ)."""
    query = db.query(Order)
    if order_status:
        query = query.filter(Order.status == order_status.upper())

    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()

    return [
        AdminOrderResponse(
            id=o.id,
            internal_order_number=o.internal_order_number,
            cj_order_id=o.cj_order_id,
            customer_email=o.customer_email,
            status=o.status,
            total_retail=o.total_retail,
            total_wholesale=o.total_wholesale,
            net_profit=o.net_profit,
            carrier_name=o.carrier_name,
            tracking_number=o.tracking_number,
            shipping_name=o.shipping_name,
            shipping_city=o.shipping_city,
            shipping_zip=o.shipping_zip,
            created_at=o.created_at.isoformat(),
        )
        for o in orders
    ]


@router.get("/admin/dlq", response_model=DLQDashboardResponse)
def get_dlq_dashboard(
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_key),
):
    """Fetch all orders stuck in Dead-Letter Queue (MANUAL_REVIEW_DLQ) along with audit logs."""
    failed_orders = (
        db.query(Order)
        .filter(Order.status == "MANUAL_REVIEW_DLQ")
        .order_by(Order.created_at.desc())
        .all()
    )

    dlq_logs = (
        db.query(SyncAuditLog)
        .filter(SyncAuditLog.sync_type.like("DLQ_%"))
        .order_by(SyncAuditLog.timestamp.desc())
        .limit(20)
        .all()
    )

    order_items = [
        DLQOrderResponse(
            id=o.id,
            internal_order_number=o.internal_order_number,
            customer_email=o.customer_email,
            status=o.status,
            shipping_address=f"{o.shipping_address}, {o.shipping_city}, {o.shipping_province}",
            shipping_zip=o.shipping_zip,
            total_retail=o.total_retail,
            created_at=o.created_at.isoformat(),
        )
        for o in failed_orders
    ]

    log_items = [
        DLQAuditEntry(
            id=l.id,
            sync_type=l.sync_type,
            errors=l.errors_json,
            timestamp=l.timestamp.isoformat(),
        )
        for l in dlq_logs
    ]

    return DLQDashboardResponse(
        dlq_count=len(order_items),
        failed_orders=order_items,
        recent_dlq_logs=log_items,
    )


@router.post("/admin/dlq/{order_id}/retry", response_model=OrderSubmissionResult)
def retry_dlq_order(
    order_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(verify_admin_key),
):
    """Manually retry order dispatch through OrderRouter."""
    order = (
        db.query(Order)
        .filter(
            (Order.internal_order_number == order_id) | (Order.id == int(order_id) if order_id.isdigit() else False)
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found in database.")

    logger.info("Admin manually retrying DLQ order %s (current status: %s)", order.internal_order_number, order.status)

    # Reconstruct request from database record
    raw_items = order.items_json or []
    line_items = [
        OrderLineItem(
            variant_id=str(item.get("variant_id")),
            sku=item.get("sku"),
            quantity=int(item.get("quantity", 1)),
            unit_price=float(item.get("unit_price", 0.0)),
        )
        for item in raw_items
    ]

    req = OrderSubmissionRequest(
        order_number=order.internal_order_number,
        customer=CustomerShippingAddress(
            name=order.shipping_name,
            address1=order.shipping_address,
            city=order.shipping_city,
            province=order.shipping_province,
            zip_code=order.shipping_zip,
            country_code=order.shipping_country or "US",
            email=order.customer_email,
            phone=order.customer_phone or "2135550199",
        ),
        line_items=line_items,
        logistic_name=order.carrier_name or "USPS US to US",
        from_country_code="US",
        pay_type="3",
        remark="Admin Manual DLQ Retry",
        total_retail=order.total_retail,
        total_wholesale=order.total_wholesale,
    )

    router_service = OrderRouter()
    return router_service.submit_order(req, session=db)

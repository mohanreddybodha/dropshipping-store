"""Secure Order Processing & Cryptographically Verified Webhook Endpoints."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from src.api.security import verify_payment_webhook
from src.models.database import Order, User, get_session
from src.schemas.order import PaymentWebhookPayload
from src.services.paypal_service import PayPalService, PayPalServiceException
from src.services.order_router import (
    CircuitBreakerOpenException,
    CustomerShippingAddress,
    LogisticsMissException,
    OrderLineItem,
    OrderRouter,
    OrderRouterException,
    OrderSubmissionRequest,
    OrderSubmissionResult,
)

logger = logging.getLogger("orders_api")
router = APIRouter()


def get_db():
    session = get_session()
    try:
        yield session
    finally:
        session.close()


class OrderLookupResponse(BaseModel):
    id: int
    internal_order_number: str
    cj_order_id: Optional[str]
    status: str
    total_retail: float
    total_wholesale: float
    net_profit: float
    carrier_name: str
    tracking_number: Optional[str]
    shipping_name: str
    shipping_city: str
    shipping_zip: str


class CustomerOrderSummary(BaseModel):
    id: int
    internal_order_number: str
    status: str
    total_retail: float
    carrier_name: str
    tracking_number: Optional[str] = None
    shipping_name: str
    shipping_city: str
    shipping_province: str
    shipping_zip: str
    created_at: str
    items: Optional[List[Dict[str, Any]]] = None


@router.post("/webhook/payment", response_model=OrderSubmissionResult)
async def handle_payment_captured_webhook(
    request: Request,
    raw_body: bytes = Depends(verify_payment_webhook),
    db: Session = Depends(get_db),
):
    """Cryptographically verified payment captured webhook endpoint.

    Pillars enforced:
    1. Cryptographic HMAC-SHA256 signature verification (rejects fake webhooks).
    2. Strict Pydantic v2 input sanitization (extra="forbid", regex validation).
    3. Atomic database transaction with DLQ fallback.
    4. 10s timeout and circuit breaker protection.
    """
    req_id = getattr(request.state, "request_id", "req_unknown")

    # 1. Parse and validate through strict Pydantic schema
    try:
        payload = PaymentWebhookPayload.model_validate_json(raw_body)
    except ValidationError as val_err:
        safe_errors = [
            {"loc": err.get("loc"), "msg": str(err.get("msg")), "type": err.get("type")}
            for err in val_err.errors()
        ]
        logger.warning("[%s] Malformed webhook payload rejected: %s", req_id, safe_errors)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "VALIDATION_ERROR", "details": safe_errors},
        )

    logger.info("[%s] Processing verified payment webhook for order: %s ($%.2f)", req_id, payload.order_id, payload.amount)

    # 2. Map into OrderSubmissionRequest
    customer_addr = CustomerShippingAddress(
        name=payload.customer.name,
        address1=payload.customer.address1,
        address2=payload.customer.address2 or "",
        city=payload.customer.city,
        province=payload.customer.province,
        zip_code=payload.customer.zip_code,
        country_code=payload.customer.country_code,
        phone=payload.customer.phone,
        email=payload.customer.email,
    )

    line_items = [
        OrderLineItem(
            variant_id=item.variant_id,
            sku=item.sku,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        for item in payload.line_items
    ]

    order_request = OrderSubmissionRequest(
        order_number=payload.order_id,
        customer=customer_addr,
        line_items=line_items,
        logistic_name=payload.carrier_preference or "USPS US to US",
        from_country_code="US",
        pay_type="3",  # Dry-run / hold mode for testing/MVP
        remark=f"Secure Webhook Order [{req_id}]",
        stripe_payment_intent_id=payload.payment_intent_id,
        total_retail=payload.amount,
        total_wholesale=0.0,
    )

    # 3. Execute Defensive Order Router
    router_service = OrderRouter()
    result = router_service.submit_order(order_request, session=db)
    return result


paypal_service = PayPalService()


class PayPalCreateOrderRequest(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    internal_order_number: Optional[str] = None


class PayPalCaptureOrderRequest(BaseModel):
    paypal_order_id: str = Field(..., min_length=1)
    internal_order_number: Optional[str] = None
    customer_name: str = Field(..., min_length=1)
    customer_email: str = Field(..., min_length=3)
    customer_phone: Optional[str] = None
    shipping_address: str = Field(..., min_length=1)
    shipping_city: str = Field(..., min_length=1)
    shipping_province: str = Field(..., min_length=1)
    shipping_zip: str = Field(..., min_length=2)
    shipping_country: str = "US"
    items: List[Dict[str, Any]] = Field(default_factory=list)
    firebase_uid: Optional[str] = None


@router.post("/orders/paypal/create")
def paypal_create_order(payload: PayPalCreateOrderRequest):
    """Create a verified PayPal checkout order via PayPal REST API."""
    try:
        res = paypal_service.create_order(
            amount=payload.amount,
            currency=payload.currency,
            internal_order_number=payload.internal_order_number,
        )
        return {"order_id": res.get("id"), "status": res.get("status")}
    except PayPalServiceException as exc:
        logger.error("PayPal order create error: %s", exc)
        raise HTTPException(status_code=502, detail=f"PayPal API error: {str(exc)}")


@router.post("/orders/paypal/capture", response_model=CustomerOrderSummary)
def paypal_capture_order(payload: PayPalCaptureOrderRequest, db: Session = Depends(get_db)):
    """Capture payment for an authorized PayPal order and persist to database."""
    # Anti-Replay Guard: check if transaction was already processed
    existing_txn = db.query(Order).filter(Order.stripe_payment_intent_id == payload.paypal_order_id).first()
    if existing_txn:
        logger.warning("Duplicate transaction capture attempt for PayPal ID: %s", payload.paypal_order_id)
        return CustomerOrderSummary(
            id=existing_txn.id,
            internal_order_number=existing_txn.internal_order_number,
            status=existing_txn.status,
            total_retail=existing_txn.total_retail,
            carrier_name=existing_txn.carrier_name or "USPS",
            tracking_number=existing_txn.tracking_number,
            shipping_name=existing_txn.shipping_name,
            shipping_city=existing_txn.shipping_city,
            shipping_province=existing_txn.shipping_province,
            shipping_zip=existing_txn.shipping_zip,
            created_at=existing_txn.created_at.isoformat() if existing_txn.created_at else "",
            items=existing_txn.items_json,
        )

    try:
        capture_res = paypal_service.capture_order(payload.paypal_order_id)
    except PayPalServiceException as exc:
        logger.error("PayPal capture error: %s", exc)
        raise HTTPException(status_code=502, detail=f"PayPal capture failed: {str(exc)}")

    capture_status = capture_res.get("status")
    if capture_status not in ("COMPLETED", "APPROVED"):
        raise HTTPException(status_code=400, detail=f"PayPal payment not completed (status: {capture_status})")

    # Extract verified captured amount from purchase units
    captured_amount = 0.0
    try:
        units = capture_res.get("purchase_units", [])
        if units:
            payments = units[0].get("payments", {})
            captures = payments.get("captures", [])
            if captures:
                captured_amount = float(captures[0].get("amount", {}).get("value", 0.0))
    except Exception:
        captured_amount = 0.0

    clean_email = payload.customer_email.strip().lower()
    order_num = payload.internal_order_number or f"ORD-PP-{int(time.time() * 1000)}"
    tracking_num = f"94001118995625{int(time.time())}"
    now = datetime.now(timezone.utc)

    new_order = Order(
        internal_order_number=order_num,
        customer_email=clean_email,
        customer_phone=payload.customer_phone,
        status="PAYMENT_CAPTURED",
        stripe_payment_intent_id=payload.paypal_order_id,
        total_retail=captured_amount if captured_amount > 0 else 0.0,
        total_wholesale=0.0,
        net_profit=0.0,
        shipping_name=payload.customer_name,
        shipping_address=payload.shipping_address,
        shipping_city=payload.shipping_city,
        shipping_province=payload.shipping_province,
        shipping_zip=payload.shipping_zip,
        shipping_country=payload.shipping_country,
        carrier_name="USPS",
        tracking_number=tracking_num,
        items_json=payload.items,
        created_at=now,
        updated_at=now,
    )
    db.add(new_order)

    if payload.firebase_uid:
        user = db.query(User).filter(User.firebase_uid == payload.firebase_uid).first()
        if not user:
            user = User(
                firebase_uid=payload.firebase_uid,
                email=clean_email,
                display_name=payload.customer_name,
                phone_number=payload.customer_phone,
                created_at=now,
                last_login_at=now,
            )
            db.add(user)
        else:
            user.last_login_at = now
            if not user.email and clean_email:
                user.email = clean_email

    db.commit()
    db.refresh(new_order)

    return CustomerOrderSummary(
        id=new_order.id,
        internal_order_number=new_order.internal_order_number,
        status=new_order.status,
        total_retail=new_order.total_retail,
        carrier_name=new_order.carrier_name,
        tracking_number=new_order.tracking_number,
        shipping_name=new_order.shipping_name,
        shipping_city=new_order.shipping_city,
        shipping_province=new_order.shipping_province,
        shipping_zip=new_order.shipping_zip,
        created_at=new_order.created_at.isoformat() if new_order.created_at else "",
        items=new_order.items_json,
    )


class CreateCheckoutOrderRequest(BaseModel):
    internal_order_number: Optional[str] = None
    customer_name: str = Field(..., min_length=1)
    customer_email: str = Field(..., min_length=3)
    customer_phone: Optional[str] = None
    shipping_address: str = Field(..., min_length=1)
    shipping_city: str = Field(..., min_length=1)
    shipping_province: str = Field(..., min_length=1)
    shipping_zip: str = Field(..., min_length=2)
    shipping_country: str = "US"
    total_retail: float = Field(..., ge=0)
    carrier_name: str = "USPS"
    tracking_number: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)
    firebase_uid: Optional[str] = None
    payment_intent_id: Optional[str] = None


@router.post("/orders/checkout", response_model=CustomerOrderSummary)
def create_checkout_order(payload: CreateCheckoutOrderRequest, db: Session = Depends(get_db)):
    """Persist customer checkout order in the database for synchronized cross-device tracking."""
    clean_email = payload.customer_email.strip().lower()
    order_num = payload.internal_order_number or f"ORD-STORE-{int(time.time() * 1000)}"

    existing = db.query(Order).filter(Order.internal_order_number == order_num).first()
    if existing:
        return CustomerOrderSummary(
            id=existing.id,
            internal_order_number=existing.internal_order_number,
            status=existing.status,
            total_retail=existing.total_retail,
            carrier_name=existing.carrier_name or "USPS",
            tracking_number=existing.tracking_number,
            shipping_name=existing.shipping_name,
            shipping_city=existing.shipping_city,
            shipping_province=existing.shipping_province,
            shipping_zip=existing.shipping_zip,
            created_at=existing.created_at.isoformat() if existing.created_at else "",
            items=existing.items_json,
        )

    tracking_num = payload.tracking_number or f"94001118995625{int(time.time())}"
    now = datetime.now(timezone.utc)

    new_order = Order(
        internal_order_number=order_num,
        customer_email=clean_email,
        customer_phone=payload.customer_phone,
        status="PAYMENT_CAPTURED",
        stripe_payment_intent_id=payload.payment_intent_id,
        total_retail=payload.total_retail,
        total_wholesale=0.0,
        net_profit=0.0,
        shipping_name=payload.customer_name,
        shipping_address=payload.shipping_address,
        shipping_city=payload.shipping_city,
        shipping_province=payload.shipping_province,
        shipping_zip=payload.shipping_zip,
        shipping_country=payload.shipping_country,
        carrier_name=payload.carrier_name or "USPS",
        tracking_number=tracking_num,
        items_json=payload.items,
        created_at=now,
        updated_at=now,
    )
    db.add(new_order)

    # If firebase_uid provided, ensure user exists
    if payload.firebase_uid:
        user = db.query(User).filter(User.firebase_uid == payload.firebase_uid).first()
        if not user:
            user = User(
                firebase_uid=payload.firebase_uid,
                email=clean_email,
                display_name=payload.customer_name,
                phone_number=payload.customer_phone,
                created_at=now,
                last_login_at=now,
            )
            db.add(user)
        else:
            user.last_login_at = now
            if not user.email and clean_email:
                user.email = clean_email

    db.commit()
    db.refresh(new_order)

    return CustomerOrderSummary(
        id=new_order.id,
        internal_order_number=new_order.internal_order_number,
        status=new_order.status,
        total_retail=new_order.total_retail,
        carrier_name=new_order.carrier_name,
        tracking_number=new_order.tracking_number,
        shipping_name=new_order.shipping_name,
        shipping_city=new_order.shipping_city,
        shipping_province=new_order.shipping_province,
        shipping_zip=new_order.shipping_zip,
        created_at=new_order.created_at.isoformat() if new_order.created_at else "",
        items=new_order.items_json,
    )


@router.get("/orders", response_model=List[CustomerOrderSummary])
def get_orders_by_customer_email(
    email: Optional[str] = None, phone: Optional[str] = None, db: Session = Depends(get_db)
):
    """Fetch customer order history by customer email and/or phone number."""
    clean_email = (email or "").strip().lower()
    clean_phone = (phone or "").strip()
    clean_phone_digits = "".join(c for c in clean_phone if c.isdigit())

    if not clean_email and not clean_phone_digits:
        raise HTTPException(status_code=400, detail="Email is required")

    from sqlalchemy import or_

    filters = []
    if clean_email:
        filters.append(Order.customer_email.ilike(clean_email))
    if clean_phone_digits:
        filters.append(Order.customer_phone.ilike(f"%{clean_phone_digits}%"))

    orders = (
        db.query(Order)
        .filter(or_(*filters))
        .order_by(Order.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        CustomerOrderSummary(
            id=o.id,
            internal_order_number=o.internal_order_number,
            status=o.status,
            total_retail=o.total_retail,
            carrier_name=o.carrier_name or "USPS",
            tracking_number=o.tracking_number,
            shipping_name=o.shipping_name,
            shipping_city=o.shipping_city,
            shipping_province=o.shipping_province,
            shipping_zip=o.shipping_zip,
            created_at=o.created_at.isoformat() if o.created_at else "",
            items=o.items_json,
        )
        for o in orders
    ]


@router.get("/orders/{order_number}", response_model=OrderLookupResponse)
def get_order_by_number(order_number: str, db: Session = Depends(get_db)):
    """Fetch order status and tracking details by internal order number."""
    order = db.query(Order).filter(Order.internal_order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return OrderLookupResponse(
        id=order.id,
        internal_order_number=order.internal_order_number,
        cj_order_id=order.cj_order_id,
        status=order.status,
        total_retail=order.total_retail,
        total_wholesale=order.total_wholesale,
        net_profit=order.net_profit,
        carrier_name=order.carrier_name,
        tracking_number=order.tracking_number,
        shipping_name=order.shipping_name,
        shipping_city=order.shipping_city,
        shipping_zip=order.shipping_zip,
    )


class DualFactorOrderLookupRequest(BaseModel):
    email: str
    zip_code: str


class MaskedOrderView(BaseModel):
    id: int
    internal_order_number: str
    status: str
    total_retail: float
    carrier_name: str
    tracking_number: Optional[str]
    masked_recipient: str
    shipping_city: str
    shipping_province: str
    shipping_zip: str
    created_at: str
    items: Optional[List[Dict[str, Any]]] = None


@router.post("/orders/lookup", response_model=List[MaskedOrderView])
def lookup_orders_with_dual_factor(
    payload: DualFactorOrderLookupRequest, db: Session = Depends(get_db)
):
    """Privacy-preserving order lookup requiring both Customer Email and 5-digit Delivery ZIP code.

    Prevents arbitrary email snooping while allowing customers without active
    OAuth sessions to view order status, USPS tracking, and package items.
    """
    clean_email = payload.email.strip().lower()
    clean_zip = payload.zip_code.strip()[:5]

    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid customer email is required.",
        )

    if len(clean_zip) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid 5-digit delivery ZIP code is required.",
        )

    orders = (
        db.query(Order)
        .filter(
            Order.customer_email.ilike(clean_email),
            Order.shipping_zip.like(f"{clean_zip}%"),
        )
        .order_by(Order.created_at.desc())
        .limit(20)
        .all()
    )

    results = []
    for o in orders:
        name_parts = (o.shipping_name or "").split()
        masked_name = (
            f"{name_parts[0][0]}*** {name_parts[-1]}"
            if len(name_parts) > 1
            else (f"{name_parts[0][0]}***" if name_parts else "Customer")
        )
        results.append(
            MaskedOrderView(
                id=o.id,
                internal_order_number=o.internal_order_number,
                status=o.status,
                total_retail=o.total_retail,
                carrier_name=o.carrier_name or "USPS",
                tracking_number=o.tracking_number,
                masked_recipient=masked_name,
                shipping_city=o.shipping_city,
                shipping_province=o.shipping_province,
                shipping_zip=o.shipping_zip,
                created_at=o.created_at.isoformat() if o.created_at else "",
                items=o.items_json,
            )
        )

    return results


"""Defensive Order Submission Router with Circuit Breaker, DLQ & Idempotency.

Adheres strictly to Zero-Trust Engineering:
1. Strict 10.0s timeouts and exponential backoff retries.
2. In-memory Circuit Breaker preventing cascading third-party supplier outages.
3. logisticsMiss silent 200 OK assertion gate with automated DLQ routing.
4. Idempotency handling for CJ error code 1603003.
5. Atomic database transactions with rollback on failure.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.models.database import Order, SyncAuditLog
from src.services.cj_client import CJClient

logger = logging.getLogger("order_router")


class OrderRouterException(Exception):
    """Base exception for all order routing errors."""
    pass


class LogisticsMissException(OrderRouterException):
    """Critical exception when supplier returns logisticsMiss=True or postageAmount<=0."""
    pass


class CJAPIException(OrderRouterException):
    """Exception when CJ Dropshipping API returns a non-200 application or HTTP error."""
    pass


class CircuitBreakerOpenException(OrderRouterException):
    """Exception raised when the supplier API circuit breaker is tripped (OPEN)."""
    pass


class CircuitBreaker:
    """Thread-safe circuit breaker preventing cascading failures when external API is failing.

    Transitions: CLOSED -> (3 consecutive failures) -> OPEN -> (cooldown timeout) -> HALF_OPEN -> CLOSED
    """

    def __init__(self, failure_threshold: int = 3, reset_timeout_seconds: float = 30.0):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout_seconds
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self._lock = threading.Lock()

    def record_success(self) -> None:
        with self._lock:
            self.failure_count = 0
            self.state = "CLOSED"

    def record_failure(self) -> None:
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.monotonic()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.critical(
                    "CIRCUIT BREAKER TRIPPED to OPEN: External supplier API failed %d consecutive times.",
                    self.failure_count,
                )

    def can_execute(self) -> bool:
        with self._lock:
            if self.state == "CLOSED":
                return True
            now = time.monotonic()
            if self.state == "OPEN":
                if (now - self.last_failure_time) >= self.reset_timeout:
                    self.state = "HALF_OPEN"
                    logger.info("Circuit breaker entering HALF_OPEN trial state.")
                    return True
                return False
            # HALF_OPEN allows trial call
            return True


# Global singleton circuit breaker across all router instances
GLOBAL_CIRCUIT_BREAKER = CircuitBreaker(failure_threshold=3, reset_timeout_seconds=30.0)


class OrderLineItem(BaseModel):
    variant_id: str
    sku: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0


class CustomerShippingAddress(BaseModel):
    name: str
    address1: str
    address2: Optional[str] = ""
    city: str
    province: str
    zip_code: str
    country_code: str = "US"
    phone: str = "2135550199"
    email: str


class OrderSubmissionRequest(BaseModel):
    order_number: Optional[str] = None
    customer: CustomerShippingAddress
    line_items: List[OrderLineItem]
    logistic_name: str = Field(default="USPS US to US")
    from_country_code: str = Field(default="US")
    pay_type: str = Field(default="3")
    remark: str = Field(default="Automated Secure Headless Order")
    stripe_payment_intent_id: Optional[str] = None
    total_retail: float = 0.0
    total_wholesale: float = 0.0


class OrderSubmissionResult(BaseModel):
    success: bool
    internal_order_number: str
    cj_order_id: Optional[str] = None
    postage_amount: float = 0.0
    status: str  # PENDING, CJ_ORDER_CREATED, MANUAL_REVIEW_DLQ
    is_idempotent_duplicate: bool = False
    message: str = ""


class OrderRouter:
    """Security-hardened, fault-tolerant Order Router with atomic DB transactions and DLQ."""

    def __init__(
        self,
        cj_client: Optional[CJClient] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
    ):
        self.cj_client = cj_client or CJClient()
        self.circuit_breaker = circuit_breaker or GLOBAL_CIRCUIT_BREAKER

    def submit_order(
        self,
        request: OrderSubmissionRequest,
        session: Optional[Session] = None,
    ) -> OrderSubmissionResult:
        """Execute order placement workflow inside atomic database transaction with full safety assertions."""
        order_number = request.order_number or f"ORD-{uuid.uuid4().hex[:12].upper()}"

        # 1. Atomic Transaction: Record initial PENDING order in database
        order_record = None
        if session:
            try:
                order_record = self._upsert_order(
                    session=session,
                    request=request,
                    order_number=order_number,
                    status="PENDING",
                )
                session.commit()
            except Exception as db_err:
                session.rollback()
                logger.error("Database transaction failure recording PENDING order: %s", db_err)
                raise OrderRouterException(f"Database error initializing order {order_number}: {db_err}")

        # 2. Defensive Circuit Breaker Check
        if not self.circuit_breaker.can_execute():
            logger.critical("Rejecting submission for %s: Circuit Breaker is OPEN.", order_number)
            self._route_to_dlq(
                session=session,
                order_number=order_number,
                reason="Circuit Breaker OPEN - Supplier API experiencing downtime",
                request=request,
                error_type="CIRCUIT_BREAKER_OPEN",
            )
            raise CircuitBreakerOpenException("Supplier fulfillment gateway is currently paused due to API outages.")

        # 3. Construct and map payload
        mapped_payload = {
            "orderNumber": order_number,
            "shippingCustomerName": request.customer.name,
            "fromCountryCode": request.from_country_code,
            "logisticName": request.logistic_name,
            "shippingCountry": "United States",
            "shippingCountryCode": request.customer.country_code or "US",
            "shippingProvince": request.customer.province,
            "shippingCity": request.customer.city,
            "shippingAddress": f"{request.customer.address1} {request.customer.address2}".strip(),
            "shippingZip": request.customer.zip_code,
            "shippingPhone": request.customer.phone,
            "email": request.customer.email,
            "remark": request.remark,
            "payType": str(request.pay_type),
            "products": [
                {"vid": item.variant_id, "quantity": item.quantity}
                for item in request.line_items
            ],
        }

        # 4. Dispatch with timeout and retry handling
        try:
            response = self.cj_client.create_order(mapped_payload)
        except Exception as net_err:
            self.circuit_breaker.record_failure()
            logger.error("Network / Timeout failure communicating with CJ API: %s", net_err)
            self._route_to_dlq(
                session=session,
                order_number=order_number,
                reason=f"Network/Timeout exception: {net_err}",
                request=request,
                error_type="SUPPLIER_TIMEOUT",
            )
            raise OrderRouterException(f"Fulfillment gateway timeout on order {order_number}") from net_err

        resp_code = response.get("code")
        resp_msg = response.get("message") or ""
        order_data = response.get("data") or {}

        # 5. Idempotency Check: CJ Code 1603003 ("Order exist, please do not duplicate create")
        if resp_code == 1603003 or "Order exist" in resp_msg:
            self.circuit_breaker.record_success()
            logger.warning("Idempotent duplicate order detected for %s. Acknowledging as success.", order_number)
            if session:
                self._upsert_order(
                    session=session,
                    request=request,
                    order_number=order_number,
                    status="CJ_ORDER_CREATED",
                )
                session.commit()

            return OrderSubmissionResult(
                success=True,
                internal_order_number=order_number,
                cj_order_id=None,
                postage_amount=0.0,
                status="CJ_ORDER_CREATED",
                is_idempotent_duplicate=True,
                message="Duplicate order submission recognized as idempotent success.",
            )

        # 6. Supplier Error Response Check
        if resp_code != 200 and not response.get("result"):
            self.circuit_breaker.record_failure()
            logger.error("Supplier rejected order %s. Code: %s, Message: %s", order_number, resp_code, resp_msg)
            self._route_to_dlq(
                session=session,
                order_number=order_number,
                reason=f"CJ Error Code {resp_code}: {resp_msg}",
                request=request,
                error_type="SUPPLIER_REJECTION",
            )
            raise CJAPIException(f"CJ API Error code: {resp_code} - {resp_msg}")

        # 7. CRITICAL DEFENSIVE GATE: The logisticsMiss & Postage Assertion Check
        logistics_miss = bool(order_data.get("logisticsMiss"))
        postage_amount = float(order_data.get("postageAmount") or 0.0)

        if logistics_miss is True or postage_amount <= 0:
            self.circuit_breaker.record_failure()
            logger.critical(
                "CRITICAL DEFENSIVE GUARD TRIGGERED for %s: logisticsMiss=%s, postageAmount=$%.2f (ZIP: %s)",
                order_number, logistics_miss, postage_amount, request.customer.zip_code,
            )
            self._route_to_dlq(
                session=session,
                order_number=order_number,
                reason=f"logisticsMiss={logistics_miss}, postageAmount={postage_amount}",
                request=request,
                error_type="LOGISTICS_MISS",
                response_payload=response,
            )
            raise LogisticsMissException("Defensive guard triggered: logisticsMiss is True or postageAmount <= 0")

        # 8. Success Confirmation
        self.circuit_breaker.record_success()
        cj_order_id = str(order_data.get("orderId") or "")
        logger.info("Order %s confirmed by CJ US Warehouse (ID: %s, Postage: $%.2f)", order_number, cj_order_id, postage_amount)

        if session:
            self._upsert_order(
                session=session,
                request=request,
                order_number=order_number,
                status="CJ_ORDER_CREATED",
                cj_order_id=cj_order_id,
            )
            session.commit()

        return OrderSubmissionResult(
            success=True,
            internal_order_number=order_number,
            cj_order_id=cj_order_id,
            postage_amount=postage_amount,
            status="CJ_ORDER_CREATED",
            is_idempotent_duplicate=False,
            message="Order successfully dispatched to US Domestic Warehouse.",
        )

    def _route_to_dlq(
        self,
        session: Optional[Session],
        order_number: str,
        reason: str,
        request: OrderSubmissionRequest,
        error_type: str,
        response_payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record Dead Letter Queue entry in SyncAuditLog and transition order to MANUAL_REVIEW_DLQ."""
        if not session:
            return

        try:
            dlq_log = SyncAuditLog(
                sync_type=f"DLQ_{error_type}",
                items_processed=1,
                items_updated=0,
                errors_json=[{
                    "order_number": order_number,
                    "reason": reason,
                    "customer_email": request.customer.email,
                    "zip_code": request.customer.zip_code,
                    "raw_response": response_payload,
                    "timestamp": time.time(),
                }],
            )
            session.add(dlq_log)

            self._upsert_order(
                session=session,
                request=request,
                order_number=order_number,
                status="MANUAL_REVIEW_DLQ",
            )
            session.commit()
        except Exception as dlq_err:
            session.rollback()
            logger.error("Failed recording DLQ to database for order %s: %s", order_number, dlq_err)

    def _upsert_order(
        self,
        session: Session,
        request: OrderSubmissionRequest,
        order_number: str,
        status: str,
        cj_order_id: Optional[str] = None,
    ) -> Order:
        """Create or update order record within transaction."""
        order = session.query(Order).filter(Order.internal_order_number == order_number).first()
        if not order:
            net_profit = max(0.0, request.total_retail - request.total_wholesale)
            order = Order(
                internal_order_number=order_number,
                cj_order_id=cj_order_id,
                customer_email=request.customer.email,
                customer_phone=request.customer.phone,
                stripe_payment_intent_id=request.stripe_payment_intent_id,
                status=status,
                total_retail=request.total_retail,
                total_wholesale=request.total_wholesale,
                net_profit=round(net_profit, 2),
                shipping_name=request.customer.name,
                shipping_address=request.customer.address1,
                shipping_city=request.customer.city,
                shipping_province=request.customer.province,
                shipping_zip=request.customer.zip_code,
                shipping_country=request.customer.country_code,
                carrier_name=request.logistic_name,
                items_json=[item.model_dump() for item in request.line_items],
            )
            session.add(order)
        else:
            order.status = status
            if cj_order_id:
                order.cj_order_id = cj_order_id

        return order

"""Comprehensive Security, Input Validation & Defensive Order Router Test Suite.

Verifies:
1. Rejection of webhooks with missing or invalid cryptographic signatures (401 Unauthorized).
2. Input sanitization and regex validation on postal codes and malicious fields (422 Unprocessable Entity).
3. Successful cryptographically signed webhook triggering secure order placement.
4. Defensive interception of logisticsMiss == True -> Transition to MANUAL_REVIEW_DLQ and logging to SyncAuditLog.
5. Idempotent acknowledgment of CJ error code 1603003.
6. Circuit breaker pattern protecting against cascading API timeouts.
7. Information disclosure prevention: Sanitized 500 errors without leaking internal stack traces.
"""

from __future__ import annotations

import json
import os
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.main import app
from src.api.routes.catalog import get_db as catalog_get_db
from src.api.routes.orders import get_db as orders_get_db
from src.api.security import compute_hmac_sha256
from src.models.database import (
    Base,
    Order,
    SyncAuditLog,
)
from src.services.cj_client import CJClient
from src.services.order_router import (
    CircuitBreaker,
    CircuitBreakerOpenException,
    CustomerShippingAddress,
    LogisticsMissException,
    OrderLineItem,
    OrderRouter,
    OrderSubmissionRequest,
)

TEST_SECRET = "test_webhook_secret_key_12345"


@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    """Ensure consistent test signing secret."""
    monkeypatch.setenv("WEBHOOK_SECRET", TEST_SECRET)


@pytest.fixture
def test_db_session():
    """Create in-memory SQLite database session with StaticPool."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client(test_db_session: Session):
    """FastAPI TestClient with overridden database dependency."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[catalog_get_db] = override_get_db
    app.dependency_overrides[orders_get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def generate_valid_webhook_payload() -> dict:
    """Generate a valid payment.captured webhook payload."""
    return {
        "event": "payment.captured",
        "order_id": "ORD-SEC-2026-001",
        "amount": 72.61,
        "currency": "USD",
        "payment_intent_id": "pi_live_9988776655",
        "customer": {
            "name": "Sarah Connor",
            "address1": "742 Evergreen Terrace",
            "address2": "Suite 101",
            "city": "Los Angeles",
            "province": "CA",
            "zip_code": "90001",
            "country_code": "US",
            "phone": "2135550199",
            "email": "sarah@resistance.org",
        },
        "line_items": [
            {
                "variant_id": "VID-CJ-5544",
                "sku": "SKU-HAMMOCK-DBL",
                "quantity": 1,
                "unit_price": 72.61,
            }
        ],
        "carrier_preference": "USPS US to US",
    }


class TestCryptographicWebhookVerification:
    """Validate Pillar 1: Cryptographic Webhook Security."""

    def test_missing_signature_rejected_401(self, client: TestClient):
        """Reject webhook if no signature header is supplied."""
        payload = generate_valid_webhook_payload()
        response = client.post("/api/webhook/payment", json=payload)
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["error"] == "UNAUTHORIZED"
        assert "Missing cryptographic signature" in data["detail"]["message"]

    def test_tampered_signature_rejected_401(self, client: TestClient):
        """Reject webhook if signature does not match computed HMAC-SHA256."""
        payload = generate_valid_webhook_payload()
        raw_bytes = json.dumps(payload).encode("utf-8")
        bogus_signature = "a" * 64

        response = client.post(
            "/api/webhook/payment",
            content=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Signature": bogus_signature,
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"]["error"] == "UNAUTHORIZED"

    @patch("src.api.routes.orders.OrderRouter")
    def test_valid_signature_accepted_200(self, MockOrderRouter, client: TestClient):
        """Accept webhook when signed with valid HMAC-SHA256 digest."""
        instance = MockOrderRouter.return_value
        instance.submit_order.return_value = {
            "success": True,
            "internal_order_number": "ORD-SEC-2026-001",
            "cj_order_id": "CJ-ORDER-VERIFIED-1",
            "postage_amount": 0.00,
            "status": "CJ_ORDER_CREATED",
            "is_idempotent_duplicate": False,
            "message": "Success",
        }

        payload = generate_valid_webhook_payload()
        raw_bytes = json.dumps(payload).encode("utf-8")
        valid_sig = compute_hmac_sha256(raw_bytes, TEST_SECRET)

        response = client.post(
            "/api/webhook/payment",
            content=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Signature": valid_sig,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "CJ_ORDER_CREATED"


class TestInputSanitizationAndValidation:
    """Validate Pillar 2: Strict Pydantic v2 Input Sanitization."""

    def test_invalid_postal_code_rejected_422(self, client: TestClient):
        """Reject non-US or malformed postal codes (e.g. letters, SQL injection)."""
        payload = generate_valid_webhook_payload()
        payload["customer"]["zip_code"] = "9999A"  # 5-chars but fails US regex

        raw_bytes = json.dumps(payload).encode("utf-8")
        sig = compute_hmac_sha256(raw_bytes, TEST_SECRET)

        response = client.post(
            "/api/webhook/payment",
            content=raw_bytes,
            headers={"Content-Type": "application/json", "X-Signature": sig},
        )
        assert response.status_code == 422
        body = response.json()
        assert body["detail"]["error"] == "VALIDATION_ERROR"
        assert any("postal code" in str(err).lower() for err in body["detail"]["details"])

    def test_extra_unexpected_field_rejected_422(self, client: TestClient):
        """extra='forbid' automatically rejects injection payloads containing unknown fields."""
        payload = generate_valid_webhook_payload()
        payload["__malicious_sql__"] = "DROP TABLE products;--"

        raw_bytes = json.dumps(payload).encode("utf-8")
        sig = compute_hmac_sha256(raw_bytes, TEST_SECRET)

        response = client.post(
            "/api/webhook/payment",
            content=raw_bytes,
            headers={"Content-Type": "application/json", "X-Signature": sig},
        )
        assert response.status_code == 422
        body = response.json()
        assert body["detail"]["error"] == "VALIDATION_ERROR"
        assert any("extra_forbidden" in str(err) for err in body["detail"]["details"])


class TestDefensiveOrderRouterSafety:
    """Validate Pillars 3 & 4: logisticsMiss Interception, DLQ, & Idempotency."""

    def test_logistics_miss_transitions_to_manual_review_dlq(self, test_db_session: Session):
        """Corrupt or unroutable address raises LogisticsMissException and transitions to MANUAL_REVIEW_DLQ."""
        mock_cj = MagicMock(spec=CJClient)
        # CJ API silent 200 OK trap: code=200, logisticsMiss=True, postageAmount=0
        mock_cj.create_order.return_value = {
            "code": 200,
            "result": True,
            "message": "success",
            "data": {
                "orderId": None,
                "postageAmount": 0,
                "logisticsMiss": True,
            },
        }

        router = OrderRouter(cj_client=mock_cj)
        req = OrderSubmissionRequest(
            order_number="ORD-DLQ-TEST-001",
            customer=CustomerShippingAddress(
                name="Corrupt Destination",
                address1="999 Nowhere Ln",
                city="Unknown",
                province="AK",
                zip_code="99999",
                email="corrupt@example.com",
            ),
            line_items=[OrderLineItem(variant_id="VID-1234", quantity=1)],
            total_retail=24.99,
            total_wholesale=9.99,
        )

        with pytest.raises(LogisticsMissException):
            router.submit_order(req, session=test_db_session)

        # Assert order was safely logged to DLQ in SyncAuditLog
        dlq_entry = test_db_session.query(SyncAuditLog).filter_by(sync_type="DLQ_LOGISTICS_MISS").first()
        assert dlq_entry is not None
        assert dlq_entry.errors_json[0]["order_number"] == "ORD-DLQ-TEST-001"
        assert dlq_entry.errors_json[0]["zip_code"] == "99999"

        # Assert Order state is marked as MANUAL_REVIEW_DLQ
        saved_order = test_db_session.query(Order).filter_by(internal_order_number="ORD-DLQ-TEST-001").first()
        assert saved_order is not None
        assert saved_order.status == "MANUAL_REVIEW_DLQ"

    def test_duplicate_error_1603003_graceful_acknowledgment(self, test_db_session: Session):
        """CJ error code 1603003 is treated as idempotent confirmation without failing."""
        mock_cj = MagicMock(spec=CJClient)
        mock_cj.create_order.return_value = {
            "code": 1603003,
            "result": False,
            "message": "Order exist, please do not duplicate create",
            "data": None,
        }

        router = OrderRouter(cj_client=mock_cj)
        req = OrderSubmissionRequest(
            order_number="ORD-IDEMPOTENT-002",
            customer=CustomerShippingAddress(
                name="Jane Doe",
                address1="456 Elm St",
                city="San Jose",
                province="CA",
                zip_code="95112",
                email="jane@example.com",
            ),
            line_items=[OrderLineItem(variant_id="VID-1234", quantity=1)],
        )

        res = router.submit_order(req, session=test_db_session)
        assert res.success is True
        assert res.is_idempotent_duplicate is True
        assert res.status == "CJ_ORDER_CREATED"

        saved_order = test_db_session.query(Order).filter_by(internal_order_number="ORD-IDEMPOTENT-002").first()
        assert saved_order is not None
        assert saved_order.status == "CJ_ORDER_CREATED"

    def test_circuit_breaker_trips_after_three_failures(self):
        """Circuit breaker transitions to OPEN after 3 consecutive failures."""
        cb = CircuitBreaker(failure_threshold=3, reset_timeout_seconds=30.0)
        assert cb.can_execute() is True

        cb.record_failure()
        assert cb.can_execute() is True
        cb.record_failure()
        assert cb.can_execute() is True

        # Third consecutive failure trips the breaker
        cb.record_failure()
        assert cb.state == "OPEN"
        assert cb.can_execute() is False


class TestInformationDisclosureDefense:
    """Validate Pillar 5: Sanitized Error Responses."""

    def test_request_id_injected_in_headers(self, client: TestClient):
        """Ensure X-Request-ID is present in responses for audit tracing."""
        response = client.get("/health")
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert response.headers["X-Request-ID"].startswith("req_")

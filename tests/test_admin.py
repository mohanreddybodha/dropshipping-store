"""Integration and security tests for the Admin Command Center & DLQ Router."""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.main import app
from src.api.routes.admin import get_db
from src.models.database import Base, Order, SyncAuditLog
from src.services.order_router import OrderSubmissionResult

ADMIN_TEST_KEY = "test_admin_secret_key_12345"


@pytest.fixture(scope="function")
def admin_test_db(monkeypatch):
    """Isolated in-memory SQLite database for Admin API tests."""
    monkeypatch.setenv("ADMIN_API_KEY", ADMIN_TEST_KEY)
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()

    # Seed an active order
    order_success = Order(
        internal_order_number="ORD-ADMIN-001",
        cj_order_id="CJ-20261025-001",
        customer_email="alice@example.com",
        customer_phone="2135550199",
        status="CJ_ORDER_CREATED",
        total_retail=49.99,
        total_wholesale=15.00,
        net_profit=34.99,
        carrier_name="USPS US to US",
        tracking_number="9400100000000000000000",
        shipping_name="Alice Smith",
        shipping_address="123 Main St",
        shipping_city="Los Angeles",
        shipping_province="CA",
        shipping_zip="90001",
        shipping_country="US",
        items_json=[{"variant_id": "V-001", "sku": "SKU-001", "quantity": 1, "unit_price": 15.00}],
    )

    # Seed a DLQ order
    order_dlq = Order(
        internal_order_number="ORD-ADMIN-DLQ-002",
        customer_email="bob@example.com",
        customer_phone="3125550188",
        status="MANUAL_REVIEW_DLQ",
        total_retail=29.99,
        total_wholesale=12.00,
        net_profit=17.99,
        carrier_name="USPS US to US",
        shipping_name="Bob Jones",
        shipping_address="456 Elm St",
        shipping_city="Chicago",
        shipping_province="IL",
        shipping_zip="60601",
        shipping_country="US",
        items_json=[{"variant_id": "V-002", "sku": "SKU-002", "quantity": 1, "unit_price": 12.00}],
    )

    # Seed DLQ audit log
    dlq_log = SyncAuditLog(
        sync_type="DLQ_LOGISTICS_MISS",
        items_processed=1,
        items_updated=0,
        errors_json=[{
            "order_number": "ORD-ADMIN-DLQ-002",
            "error": "Simulated unroutable domestic zip code",
        }],
    )

    db.add_all([order_success, order_dlq, dlq_log])
    db.commit()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    yield db

    app.dependency_overrides.clear()
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(admin_test_db):
    return TestClient(app)


class TestAdminAuthentication:
    """Test zero-trust authentication header enforcement."""

    def test_missing_admin_key_returns_401(self, client):
        resp = client.get("/api/admin/orders")
        assert resp.status_code == 401
        assert "Invalid or missing X-Admin-API-Key header" in resp.json()["detail"]["message"]

    def test_invalid_admin_key_returns_401(self, client):
        resp = client.get("/api/admin/orders", headers={"X-Admin-API-Key": "wrong_key"})
        assert resp.status_code == 401
        assert "Invalid or missing X-Admin-API-Key header" in resp.json()["detail"]["message"]

    def test_unconfigured_admin_key_returns_403(self, client, monkeypatch):
        monkeypatch.delenv("ADMIN_API_KEY", raising=False)
        resp = client.get("/api/admin/orders", headers={"X-Admin-API-Key": ADMIN_TEST_KEY})
        assert resp.status_code == 403
        assert "Admin API is not configured on this server" in resp.json()["detail"]["message"]

    def test_valid_admin_key_accepted_200(self, client):
        resp = client.get("/api/admin/orders", headers={"X-Admin-API-Key": ADMIN_TEST_KEY})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestAdminOrderListing:
    """Test order listing, pagination, and status filters."""

    def test_list_all_orders(self, client):
        resp = client.get("/api/admin/orders", headers={"X-Admin-API-Key": ADMIN_TEST_KEY})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        order_numbers = [o["internal_order_number"] for o in data]
        assert "ORD-ADMIN-001" in order_numbers
        assert "ORD-ADMIN-DLQ-002" in order_numbers

    def test_filter_orders_by_status_dlq(self, client):
        resp = client.get(
            "/api/admin/orders?status=MANUAL_REVIEW_DLQ",
            headers={"X-Admin-API-Key": ADMIN_TEST_KEY},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["internal_order_number"] == "ORD-ADMIN-DLQ-002"
        assert data[0]["status"] == "MANUAL_REVIEW_DLQ"

    def test_filter_orders_by_status_created(self, client):
        resp = client.get(
            "/api/admin/orders?status=CJ_ORDER_CREATED",
            headers={"X-Admin-API-Key": ADMIN_TEST_KEY},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["internal_order_number"] == "ORD-ADMIN-001"
        assert data[0]["status"] == "CJ_ORDER_CREATED"

    def test_pagination_limit(self, client):
        resp = client.get(
            "/api/admin/orders?limit=1&offset=0",
            headers={"X-Admin-API-Key": ADMIN_TEST_KEY},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1


class TestAdminDLQManagement:
    """Test Dead-Letter Queue dashboard and manual retry triggering."""

    def test_get_dlq_dashboard(self, client):
        resp = client.get("/api/admin/dlq", headers={"X-Admin-API-Key": ADMIN_TEST_KEY})
        assert resp.status_code == 200
        body = resp.json()
        assert body["dlq_count"] == 1
        assert len(body["failed_orders"]) == 1
        assert body["failed_orders"][0]["internal_order_number"] == "ORD-ADMIN-DLQ-002"
        assert len(body["recent_dlq_logs"]) >= 1
        assert body["recent_dlq_logs"][0]["sync_type"] == "DLQ_LOGISTICS_MISS"

    @patch("src.api.routes.admin.OrderRouter.submit_order")
    def test_retry_dlq_order_success(self, mock_submit, client):
        mock_submit.return_value = OrderSubmissionResult(
            success=True,
            internal_order_number="ORD-ADMIN-DLQ-002",
            cj_order_id="CJ-RETRY-SUCCESS-999",
            status="CJ_ORDER_CREATED",
            carrier_name="USPS US to US",
            message="Order successfully retried and created.",
        )

        resp = client.post(
            "/api/admin/dlq/ORD-ADMIN-DLQ-002/retry",
            headers={"X-Admin-API-Key": ADMIN_TEST_KEY},
        )
        assert resp.status_code == 200
        res_data = resp.json()
        assert res_data["success"] is True
        assert res_data["cj_order_id"] == "CJ-RETRY-SUCCESS-999"
        assert res_data["status"] == "CJ_ORDER_CREATED"
        mock_submit.assert_called_once()

    def test_retry_nonexistent_order_returns_404(self, client):
        resp = client.post(
            "/api/admin/dlq/ORD-DOES-NOT-EXIST/retry",
            headers={"X-Admin-API-Key": ADMIN_TEST_KEY},
        )
        assert resp.status_code == 404
        assert "Order not found in database" in resp.json()["detail"]

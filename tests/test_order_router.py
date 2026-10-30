"""Integration test suite for Sprint 2: FastAPI catalog API and defensive order router."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from src.api.security import compute_hmac_sha256

from src.api.main import app
from src.api.routes.catalog import get_db as catalog_get_db
from src.api.routes.orders import get_db as orders_get_db
from src.api.routes.auth import get_db as auth_get_db
from src.models.database import (
    Base,
    Order,
    Product,
    ProductVariant,
    SyncAuditLog,
)
from src.services.cj_client import CJClient
from src.services.order_router import (
    CustomerShippingAddress,
    LogisticsMissException,
    OrderLineItem,
    OrderRouter,
    OrderSubmissionRequest,
)


from sqlalchemy.pool import StaticPool

@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    """Ensure consistent test signing secret."""
    monkeypatch.setenv("WEBHOOK_SECRET", "test_webhook_secret_key_12345")


@pytest.fixture
def test_db_session():
    """Create shared in-memory SQLite database session for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()

    # Seed an active product with variant
    prod = Product(
        pid="PID-TEST-100",
        title="Ergonomic Under Desk Cable Tray",
        brand_title="WorkSpace Flow",
        slug="workspace-under-desk-cable-tray",
        pas_description_html="<p>Organize your messy desk cables instantly.</p>",
        features_json=[{"title": "Clamp On", "desc": "No screws needed"}],
        seo_meta_json={"meta_title": "Under Desk Cable Tray"},
        faq_schema_json=[{"question": "How fast?", "answer": "3-7 Days"}],
        viral_scripts_json=[{"index": 1, "hook": "Stop doing this"}],
        fallback_affiliate_url="https://amazon.com/dp/B000TEST",
        is_active=True,
    )
    session.add(prod)
    session.flush()

    variant = ProductVariant(
        vid="VID-TEST-200",
        product_id=prod.id,
        sku="SKU-TRAY-BLK",
        wholesale_cost=9.99,
        shipping_cost=0.00,
        retail_price=24.99,
        bundle_2_price=43.98,
        bundle_3_price=61.47,
        us_warehouse_stock=75,
        carrier_name="USPS",
        delivery_sla="3-7 Days",
        is_available=True,
    )
    session.add(variant)
    session.commit()

    yield session
    session.close()


@pytest.fixture
def client(test_db_session: Session):
    """FastAPI TestClient with overridden database dependencies."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[catalog_get_db] = override_get_db
    app.dependency_overrides[orders_get_db] = override_get_db
    app.dependency_overrides[auth_get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


class TestCatalogAPI:
    """Validate storefront catalog consumption endpoints."""

    def test_get_catalog_list(self, client: TestClient):
        """GET /api/catalog returns active products with variants and bundle pricing."""
        response = client.get("/api/catalog")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        product = data[0]
        assert product["slug"] == "workspace-under-desk-cable-tray"
        assert product["is_active"] is True
        assert len(product["variants"]) == 1
        variant = product["variants"][0]
        assert variant["retail_price_1x"] == 24.99
        assert variant["bundle_2_price"] == 43.98
        assert variant["bundle_3_price"] == 61.47
        assert variant["us_warehouse_stock"] == 75

    def test_get_product_by_slug(self, client: TestClient):
        """GET /api/catalog/{slug} returns single product details."""
        response = client.get("/api/catalog/workspace-under-desk-cable-tray")
        assert response.status_code == 200
        data = response.json()
        assert data["pid"] == "PID-TEST-100"
        assert data["title"] == "Ergonomic Under Desk Cable Tray"

    def test_get_nonexistent_product_by_slug(self, client: TestClient):
        """GET /api/catalog/non-existent-slug returns 404."""
        response = client.get("/api/catalog/non-existent-product-slug")
        assert response.status_code == 404
        assert response.json()["detail"] == "Product not found"

    def test_paginated_catalog_and_category_filtering(self, client: TestClient):
        """GET /api/catalog with page and category returns paginated envelope."""
        response = client.get("/api/catalog?page=1&limit=10&paginate=true")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_count" in data
        assert "total_pages" in data
        assert "categories_summary" in data
        assert data["total_count"] >= 1
        assert len(data["items"]) >= 1

    def test_catalog_search_filtering(self, client: TestClient):
        """GET /api/catalog with search query matches product title."""
        response = client.get("/api/catalog?search=Cable&paginate=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] >= 1
        assert "Cable" in data["items"][0]["title"]


class TestDefensiveOrderRouter:
    """Validate order router defensive mechanisms."""

    def test_successful_order_submission(self, test_db_session: Session):
        """Order router successfully dispatches order and persists confirmed state."""
        mock_cj = MagicMock(spec=CJClient)
        mock_cj.create_order.return_value = {
            "code": 200,
            "result": True,
            "message": "success",
            "data": {
                "orderId": "CJ26102599999",
                "postageAmount": 5.80,
                "logisticsMiss": False,
            },
        }

        router = OrderRouter(cj_client=mock_cj)
        req = OrderSubmissionRequest(
            order_number="ORD-TEST-SUCCESS-1",
            customer=CustomerShippingAddress(
                name="John Doe",
                address1="123 Main St",
                city="Los Angeles",
                province="CA",
                zip_code="90001",
                email="john@example.com",
            ),
            line_items=[OrderLineItem(variant_id="VID-TEST-200", quantity=1)],
            total_retail=24.99,
            total_wholesale=9.99,
        )

        res = router.submit_order(req, session=test_db_session)
        assert res.success is True
        assert res.cj_order_id == "CJ26102599999"
        assert res.status == "CJ_ORDER_CREATED"
        assert res.postage_amount == 5.80

        # Verify database record
        saved_order = test_db_session.query(Order).filter_by(internal_order_number="ORD-TEST-SUCCESS-1").first()
        assert saved_order is not None
        assert saved_order.status == "CJ_ORDER_CREATED"
        assert saved_order.cj_order_id == "CJ26102599999"

    def test_logistics_miss_interception(self, test_db_session: Session):
        """Order router intercepts logisticsMiss=True, logs to DLQ, and raises LogisticsMissException."""
        mock_cj = MagicMock(spec=CJClient)
        # CJ API returns code: 200 with logisticsMiss: true on bad zip/unserviceable address!
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
            order_number="ORD-TEST-MISS-1",
            customer=CustomerShippingAddress(
                name="Bad Address Customer",
                address1="000 Unknown Way",
                city="Nowhere",
                province="ZZ",
                zip_code="00000",
                email="bad@example.com",
            ),
            line_items=[OrderLineItem(variant_id="VID-TEST-200", quantity=1)],
            total_retail=24.99,
            total_wholesale=9.99,
        )

        with pytest.raises(LogisticsMissException) as exc_info:
            router.submit_order(req, session=test_db_session)

        assert "logisticsMiss" in str(exc_info.value)

        # Verify DLQ entry was logged to SyncAuditLog
        dlq_entry = test_db_session.query(SyncAuditLog).filter_by(sync_type="DLQ_LOGISTICS_MISS").first()
        assert dlq_entry is not None
        assert dlq_entry.errors_json[0]["order_number"] == "ORD-TEST-MISS-1"
        assert dlq_entry.errors_json[0]["zip_code"] == "00000"

        # Verify order in DB marked as MANUAL_REVIEW_DLQ
        failed_order = test_db_session.query(Order).filter_by(internal_order_number="ORD-TEST-MISS-1").first()
        assert failed_order is not None
        assert failed_order.status == "MANUAL_REVIEW_DLQ"

    def test_idempotency_error_1603003_handled_gracefully(self, test_db_session: Session):
        """Order router treats CJ code 1603003 as idempotent success without error."""
        mock_cj = MagicMock(spec=CJClient)
        mock_cj.create_order.return_value = {
            "code": 1603003,
            "result": False,
            "message": "Order exist, please do not duplicate create",
            "data": None,
        }

        router = OrderRouter(cj_client=mock_cj)
        req = OrderSubmissionRequest(
            order_number="ORD-TEST-DUPLICATE-1",
            customer=CustomerShippingAddress(
                name="Jane Doe",
                address1="456 Elm St",
                city="San Jose",
                province="CA",
                zip_code="95112",
                email="jane@example.com",
            ),
            line_items=[OrderLineItem(variant_id="VID-TEST-200", quantity=1)],
        )

        # Should not raise exception
        res = router.submit_order(req, session=test_db_session)
        assert res.success is True
        assert res.is_idempotent_duplicate is True
        assert res.status == "CJ_ORDER_CREATED"
        assert "idempotent" in res.message.lower()


class TestPaymentWebhookEndpoint:
    """Validate webhook endpoint end-to-end integration."""

    @patch("src.api.routes.orders.OrderRouter")
    def test_webhook_payment_captured_success(self, MockOrderRouter, client: TestClient):
        """POST /api/webhook/payment processes payment and dispatches order."""
        instance = MockOrderRouter.return_value
        instance.submit_order.return_value = {
            "success": True,
            "internal_order_number": "ORD-HOOK-001",
            "cj_order_id": "CJ-REAL-12345",
            "postage_amount": 5.80,
            "status": "CJ_ORDER_CREATED",
            "is_idempotent_duplicate": False,
            "message": "Order successfully confirmed by supplier.",
        }

        payload = {
            "event": "payment.captured",
            "order_id": "ORD-HOOK-001",
            "amount": 43.98,
            "currency": "USD",
            "payment_intent_id": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
            "customer": {
                "name": "Sarah Connor",
                "address1": "100 Cyberdyne Way",
                "city": "Sunnyvale",
                "province": "CA",
                "zip_code": "94086",
                "country_code": "US",
                "phone": "4085551212",
                "email": "sarah@resistance.org",
            },
            "line_items": [
                {
                    "variant_id": "VID-TEST-200",
                    "quantity": 2,
                    "unit_price": 21.99,
                }
            ],
            "carrier_preference": "USPS US to US",
        }

        raw_bytes = json.dumps(payload).encode("utf-8")
        secret = os.getenv("WEBHOOK_SECRET", "test_webhook_secret_key_12345")
        sig = compute_hmac_sha256(raw_bytes, secret)

        response = client.post(
            "/api/webhook/payment",
            content=raw_bytes,
            headers={"Content-Type": "application/json", "X-Signature": sig},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["internal_order_number"] == "ORD-HOOK-001"
        assert data["status"] == "CJ_ORDER_CREATED"

    @patch("src.api.routes.orders.OrderRouter")
    def test_webhook_payment_logistics_miss_returns_422(self, MockOrderRouter, client: TestClient):
        """POST /api/webhook/payment returns 422 if logisticsMiss is triggered."""
        instance = MockOrderRouter.return_value
        instance.submit_order.side_effect = LogisticsMissException("Invalid zip routing")

        payload = {
            "event": "payment.captured",
            "order_id": "ORD-HOOK-FAIL-002",
            "amount": 24.99,
            "currency": "USD",
            "customer": {
                "name": "Corrupt Zip Customer",
                "address1": "999 Bad Road",
                "city": "Lost",
                "province": "XX",
                "zip_code": "00000",
                "country_code": "US",
                "phone": "2135550199",
                "email": "corrupt@example.com",
            },
            "line_items": [
                {
                    "variant_id": "VID-TEST-200",
                    "quantity": 1,
                    "unit_price": 24.99,
                }
            ],
        }

        raw_bytes = json.dumps(payload).encode("utf-8")
        secret = os.getenv("WEBHOOK_SECRET", "test_webhook_secret_key_12345")
        sig = compute_hmac_sha256(raw_bytes, secret)

        response = client.post(
            "/api/webhook/payment",
            content=raw_bytes,
            headers={"Content-Type": "application/json", "X-Signature": sig},
        )
        assert response.status_code == 422
        body = response.json()
        assert body["error"] == "LOGISTICS_MISS"

    def test_lookup_orders_by_customer_email(self, test_db_session: Session, client: TestClient):
        """GET /api/orders?email=... returns list of matching customer orders."""
        order1 = Order(
            internal_order_number="ORD-CUST-001",
            customer_email="buyer@example.com",
            status="PAYMENT_CAPTURED",
            total_retail=29.99,
            total_wholesale=10.0,
            net_profit=19.99,
            shipping_name="John Buyer",
            shipping_address="123 Main St",
            shipping_city="New York",
            shipping_province="NY",
            shipping_zip="10001",
            shipping_country="US",
            carrier_name="USPS",
            tracking_number="9400111899562537628101",
            items_json=[{"title": "Smart Light", "quantity": 1, "price": 29.99}],
        )
        test_db_session.add(order1)
        test_db_session.commit()

        resp = client.get("/api/orders?email=buyer@example.com")
        assert resp.status_code == 200
        orders = resp.json()
        assert len(orders) >= 1
        assert orders[0]["internal_order_number"] == "ORD-CUST-001"
        assert orders[0]["tracking_number"] == "9400111899562537628101"

    def test_lookup_orders_empty_email_returns_400(self, client: TestClient):
        """GET /api/orders with empty email returns 400."""
        resp = client.get("/api/orders?email=   ")
        assert resp.status_code == 400

    def test_create_checkout_order_persists_in_db(self, client: TestClient):
        """POST /api/orders/checkout stores order in DB and returns rich summary."""
        payload = {
            "internal_order_number": "ORD-STORE-TEST-99",
            "customer_name": "Alice Wonder",
            "customer_email": "alice@wonder.com",
            "customer_phone": "(213) 555-0199",
            "shipping_address": "742 Evergreen Terrace",
            "shipping_city": "Springfield",
            "shipping_province": "OR",
            "shipping_zip": "97477",
            "shipping_country": "US",
            "total_retail": 49.98,
            "carrier_name": "USPS",
            "items": [
                {
                    "title": "Turbo Fan",
                    "product_title": "Turbo Fan",
                    "slug": "turbo-fan",
                    "image_url": "https://example.com/fan.jpg",
                    "quantity": 2,
                    "price": 24.99,
                }
            ],
            "firebase_uid": "fb_alice_123",
        }
        res = client.post("/api/orders/checkout", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["internal_order_number"] == "ORD-STORE-TEST-99"
        assert data["total_retail"] == 49.98
        assert len(data["items"]) == 1

        # Check that GET /api/orders?email=alice@wonder.com finds it
        get_res = client.get("/api/orders?email=alice@wonder.com")
        assert get_res.status_code == 200
        found = get_res.json()
        assert len(found) >= 1
        assert found[0]["internal_order_number"] == "ORD-STORE-TEST-99"

    def test_get_user_auth_state_across_devices(self, client: TestClient):
        """GET /api/auth/state retrieves unified cart, watchlist, and orders."""
        # Create an order first for this session
        order_payload = {
            "internal_order_number": "ORD-SYNC-TEST-01",
            "customer_name": "Bob Builder",
            "customer_email": "bob@builder.com",
            "shipping_address": "100 Construction Way",
            "shipping_city": "Denver",
            "shipping_province": "CO",
            "shipping_zip": "80202",
            "total_retail": 19.99,
            "firebase_uid": "fb_bob_456",
        }
        create_res = client.post("/api/orders/checkout", json=order_payload)
        assert create_res.status_code == 200

        res = client.get("/api/auth/state?firebase_uid=fb_bob_456&email=bob@builder.com")
        assert res.status_code == 200
        state = res.json()
        assert "user" in state
        assert "cart" in state
        assert "watchlist" in state
        assert "orders" in state
        assert len(state["orders"]) >= 1
        assert state["orders"][0]["internal_order_number"] == "ORD-SYNC-TEST-01"


class TestCancelOrderEndpoint:
    """Validate 30-minute grace window order cancellation & automated refund."""

    def test_cancel_order_within_grace_window_success(self, client: TestClient, test_db_session: Session):
        """POST /api/orders/cancel successfully cancels order within 30-min grace period."""
        # Create an order
        order = Order(
            internal_order_number="ORD-CANCEL-TEST-01",
            customer_email="canceltest@example.com",
            shipping_name="John Doe",
            shipping_address="123 Main St",
            shipping_city="Austin",
            shipping_province="TX",
            shipping_zip="78701",
            total_retail=29.99,
            status="PAYMENT_CAPTURED",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        test_db_session.add(order)
        test_db_session.commit()

        cancel_payload = {
            "order_number": "ORD-CANCEL-TEST-01",
            "customer_email": "canceltest@example.com",
            "reason": "Ordered by mistake",
        }
        res = client.post("/api/orders/cancel", json=cancel_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["status"] == "CANCELLED"
        assert data["refund_amount"] == 29.99
        assert "100% full refund" in data["message"]

        # Verify DB status
        test_db_session.refresh(order)
        assert order.status == "CANCELLED"

    def test_cancel_order_after_grace_window_rejected(self, client: TestClient, test_db_session: Session):
        """POST /api/orders/cancel rejects cancellation after 30-minute window."""
        from datetime import timedelta

        # Order created 35 minutes ago
        old_time = datetime.now(timezone.utc) - timedelta(minutes=35)
        order = Order(
            internal_order_number="ORD-EXPIRED-TEST-02",
            customer_email="expired@example.com",
            shipping_name="Old Order",
            shipping_address="456 Elm St",
            shipping_city="Dallas",
            shipping_province="TX",
            shipping_zip="75001",
            total_retail=45.00,
            status="PAYMENT_CAPTURED",
            created_at=old_time,
            updated_at=old_time,
        )
        test_db_session.add(order)
        test_db_session.commit()

        cancel_payload = {
            "order_number": "ORD-EXPIRED-TEST-02",
            "customer_email": "expired@example.com",
            "reason": "Changed mind",
        }
        res = client.post("/api/orders/cancel", json=cancel_payload)
        assert res.status_code == 403
        assert "grace window has expired" in res.json()["detail"].lower()

    def test_cancel_already_cancelled_order_rejected(self, client: TestClient, test_db_session: Session):
        """POST /api/orders/cancel rejects already cancelled order."""
        order = Order(
            internal_order_number="ORD-ALREADY-CANCEL-03",
            customer_email="already@example.com",
            shipping_name="Cancelled Order",
            shipping_address="789 Pine St",
            shipping_city="Houston",
            shipping_province="TX",
            shipping_zip="77001",
            total_retail=15.00,
            status="CANCELLED",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        test_db_session.add(order)
        test_db_session.commit()

        res = client.post("/api/orders/cancel", json={"order_number": "ORD-ALREADY-CANCEL-03"})
        assert res.status_code == 400
        assert "already been cancelled" in res.json()["detail"].lower()


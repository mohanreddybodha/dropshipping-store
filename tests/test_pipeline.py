"""Unit test suite for Sprint 1: Database models, pricing math, and rate limiter."""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.models.database import (
    Base,
    Product,
    ProductVariant,
    SyncAuditLog,
    calculate_pricing,
    init_db,
    slugify,
)
from src.services.cj_client import CJClient, TokenBucketRateLimiter


class TestPricingAndUnitEconomics:
    """Validate mathematical correctness of pricing formulas and margin gates."""

    def test_tiered_pricing_formulas(self):
        """Verify Tier 1, Tier 2, and Tier 3 (market cap) retail pricing formulas."""
        # Tier 1 (<= $8.00): 3.5x multiplier - 0.01
        calc_tier1 = calculate_pricing(5.00, 0.00)
        assert calc_tier1["retail_price_1x"] == 17.49
        assert calc_tier1["bundle_2_price"] == round(17.49 * 2.0 * 0.88, 2) - 0.01
        assert calc_tier1["bundle_3_price"] == round(17.49 * 3.0 * 0.82, 2) - 0.01
        assert calc_tier1["is_viable"] is True
        assert calc_tier1["net_margin_pct"] >= 50.0

        # Tier 2 (8.00 < cost <= 18.00): 2.2x multiplier - 0.01
        calc_tier2 = calculate_pricing(12.00, 0.00)
        assert calc_tier2["retail_price_1x"] == 26.39
        assert calc_tier2["is_viable"] is True
        assert calc_tier2["net_margin_pct"] >= 40.0

        # Tier 3 (> 18.00): 1.6x multiplier - 0.01
        calc_tier3 = calculate_pricing(20.00, 0.00)
        assert calc_tier3["retail_price_1x"] == 31.99
        assert calc_tier3["is_viable"] is True

        # Heavy / high cost ceiling: never exceeds $49.99
        calc_capped = calculate_pricing(35.00, 0.00)
        assert calc_capped["retail_price_1x"] <= 49.99

    def test_freight_addition_in_pricing(self):
        """Verify retail price properly incorporates non-zero freight cost into tiered multiplier."""
        # wholesale 5.00 + shipping 2.00 = 7.00 total cost (Tier 1 <= 8.00)
        wholesale = 5.00
        shipping = 2.00
        calc = calculate_pricing(wholesale, shipping)

        total_cost = 7.00
        expected_retail = round(7.00 * 3.5, 2) - 0.01
        assert calc["retail_price_1x"] == expected_retail
        assert calc["net_margin_pct"] >= 20.0
        assert calc["is_viable"] is True

    def test_slugify_helper(self):
        """Verify URL slug sanitization."""
        slug = slugify("Under-Desk Heavy-Duty Cable Tray (No Drill!) - Black")
        assert "no-drill" in slug
        assert "(" not in slug
        assert "!" not in slug
        assert slug.islower()


class TestRateLimiter:
    """Validate Token Bucket Rate Limiter timing and thread safety."""

    def test_token_bucket_spacing(self):
        """Verify consecutive requests are throttled to configured rate."""
        rate = 5.0  # 5 tokens/second -> 0.20s spacing
        limiter = TokenBucketRateLimiter(rate=rate, capacity=1.0)

        t0 = time.monotonic()
        # First call has available token -> 0 wait
        w1 = limiter.acquire()
        # Second call must wait ~0.20s
        w2 = limiter.acquire()
        t1 = time.monotonic()

        elapsed = t1 - t0
        assert elapsed >= 0.18  # Allow slight timing tolerance
        assert w2 > 0.15

    def test_thread_safe_token_bucket(self):
        """Verify concurrent multi-threaded acquires do not cause race conditions."""
        rate = 20.0  # 20 tokens/sec -> 0.05s per token
        limiter = TokenBucketRateLimiter(rate=rate, capacity=1.0)

        def worker():
            return limiter.acquire()

        t0 = time.monotonic()
        with ThreadPoolExecutor(max_workers=5) as executor:
            waits = list(executor.map(lambda _: worker(), range(5)))
        t1 = time.monotonic()

        elapsed = t1 - t0
        # 5 requests at 20 QPS requires at least 4 intervals = 0.20s total
        assert elapsed >= 0.18
        assert len(waits) == 5


class TestLiabilityWhitelist:
    """Validate filtering of restricted cosmetic and ingestible categories."""

    def test_prohibited_keywords(self):
        client = CJClient(api_key="mock_key")
        assert client.is_prohibited_product("EELHOE Collagen Anti-Aging Face Cream") is True
        assert client.is_prohibited_product("Herbal Slimming Detox Tea") is True
        assert client.is_prohibited_product("Heavy Blend Fleece Cotton Hoodie") is True
        assert client.is_prohibited_product("Men's Athletic Running Shoes") is True
        assert client.is_prohibited_product("Moisturizing Face Mask Gel") is True

    def test_whitelisted_products(self):
        client = CJClient(api_key="mock_key")
        assert client.is_prohibited_product("Under Desk Cable Management Tray") is False
        assert client.is_prohibited_product("Magnetic LED Rechargeable Cabinet Bar") is False
        assert client.is_prohibited_product("Car Seat Leather Gap Storage Organizer") is False
        assert client.is_prohibited_product("Adjustable Aluminum Laptop Stand") is False
        assert client.is_prohibited_product("Electric Automatic Jar Opener") is False


class TestDatabaseModels:
    """Validate SQLAlchemy model mapping and relational integrity."""

    @pytest.fixture
    def db_session(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    def test_product_and_variant_persistence(self, db_session: Session):
        """Test creating a product with variants and cascading relationship."""
        product = Product(
            pid="CJ-TEST-PID-001",
            title="Magnetic Wireless LED Closet Light",
            brand_title="HomeLight Pro",
            slug="magnetic-wireless-led-closet-light",
            pas_description_html="<p>Test PAS copy</p>",
            features_json=[{"title": "USB-C", "desc": "Fast charging"}],
            seo_meta_json={"meta_title": "LED Closet Light"},
            faq_schema_json=[{"question": "How fast?", "answer": "3-7 days"}],
            viral_scripts_json=[{"index": 1, "hook": "Test hook"}],
            is_active=True,
        )
        db_session.add(product)
        db_session.flush()

        variant = ProductVariant(
            vid="CJ-TEST-VID-001",
            product_id=product.id,
            sku="CJST001-WHITE",
            wholesale_cost=8.50,
            shipping_cost=0.00,
            retail_price=21.24,
            bundle_2_price=37.38,
            bundle_3_price=52.25,
            us_warehouse_stock=150,
            carrier_name="USPS",
            delivery_sla="3-5 Days",
            is_available=True,
        )
        db_session.add(variant)
        db_session.commit()

        # Query back
        saved = db_session.query(Product).filter_by(pid="CJ-TEST-PID-001").first()
        assert saved is not None
        assert saved.title == "Magnetic Wireless LED Closet Light"
        assert len(saved.variants) == 1
        assert saved.variants[0].vid == "CJ-TEST-VID-001"
        assert saved.variants[0].us_warehouse_stock == 150
        assert saved.variants[0].product.pid == "CJ-TEST-PID-001"

    def test_sync_audit_log_persistence(self, db_session: Session):
        """Test persisting sync audit logs."""
        log = SyncAuditLog(
            sync_type="DISCOVER",
            items_processed=15,
            items_updated=8,
            errors_json=[{"pid": "123", "error": "Low stock"}],
        )
        db_session.add(log)
        db_session.commit()

        saved_log = db_session.query(SyncAuditLog).first()
        assert saved_log is not None
        assert saved_log.sync_type == "DISCOVER"
        assert saved_log.items_processed == 15
        assert saved_log.items_updated == 8
        assert len(saved_log.errors_json) == 1

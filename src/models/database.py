"""Database models and persistence layer for autonomous dropshipping pipeline.

Supports local SQLite development and production Supabase PostgreSQL parity.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)


def get_utc_now() -> datetime:
    """Return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy entities."""
    pass


class Product(Base):
    """Catalog product entity mapped to supplier and storefront schemas."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    brand_title: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    slug: Mapped[str] = mapped_column(String(512), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(128), default="Home & Kitchen", index=True, nullable=False)

    # Media & Visual assets
    hero_image_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    images_json: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    # Rich marketing & conversion copy
    pas_description_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    features_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    specs_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Programmatic SEO & AI Video Factory artifacts
    seo_meta_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    faq_schema_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    viral_scripts_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    # Defensive Out-of-Stock monetization
    fallback_affiliate_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False
    )

    # Relationship to variants
    variants: Mapped[List[ProductVariant]] = relationship(
        "ProductVariant", back_populates="product", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, pid='{self.pid}', title='{self.title[:30]}...', active={self.is_active})>"


class ProductVariant(Base):
    """SKU-level variant entity with pricing tiers, stock, and carrier details."""

    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sku: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # Cost layers
    wholesale_cost: Mapped[float] = mapped_column(Float, nullable=False)
    shipping_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Volume pricing tiers
    retail_price: Mapped[float] = mapped_column(Float, nullable=False)
    bundle_2_price: Mapped[float] = mapped_column(Float, nullable=False)
    bundle_3_price: Mapped[float] = mapped_column(Float, nullable=False)

    # Inventory & Fulfillment SLA
    us_warehouse_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    carrier_name: Mapped[str] = mapped_column(String(128), default="USPS", nullable=False)
    delivery_sla: Mapped[str] = mapped_column(String(64), default="3-7 Days", nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationship back to product
    product: Mapped[Product] = relationship("Product", back_populates="variants")

    def __repr__(self) -> str:
        return (
            f"<ProductVariant(id={self.id}, vid='{self.vid}', sku='{self.sku}', "
            f"retail={self.retail_price}, stock={self.us_warehouse_stock})>"
        )


class Order(Base):
    """Customer order entity with lifecycle state, payment, and CJ fulfillment metadata."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    internal_order_number: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    cj_order_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    customer_email: Mapped[str] = mapped_column(String(256), index=True, nullable=False)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    status: Mapped[str] = mapped_column(String(64), default="PAYMENT_CAPTURED", index=True, nullable=False)
    total_retail: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_wholesale: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    net_profit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    shipping_name: Mapped[str] = mapped_column(String(256), default="", nullable=False)
    shipping_address: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    shipping_city: Mapped[str] = mapped_column(String(128), default="", nullable=False)
    shipping_province: Mapped[str] = mapped_column(String(128), default="", nullable=False)
    shipping_zip: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    shipping_country: Mapped[str] = mapped_column(String(32), default="US", nullable=False)

    carrier_name: Mapped[str] = mapped_column(String(128), default="USPS", nullable=False)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    items_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<Order(id={self.id}, order_num='{self.internal_order_number}', "
            f"status='{self.status}', total={self.total_retail})>"
        )


class User(Base):
    """User account entity synced from Firebase Auth."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )
    last_login_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False
    )

    carts: Mapped[List[UserCart]] = relationship(
        "UserCart", back_populates="user", cascade="all, delete-orphan"
    )
    watchlist_items: Mapped[List[UserWatchlist]] = relationship(
        "UserWatchlist", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', uid='{self.firebase_uid}')>"


class UserCart(Base):
    """Persistent database cart entity linked to authenticated user."""

    __tablename__ = "user_carts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    product_pid: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    variant_vid: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    tier: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    selected_size: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="carts")

    def __repr__(self) -> str:
        return f"<UserCart(user_id={self.user_id}, vid='{self.variant_vid}', qty={self.quantity})>"


class UserWatchlist(Base):
    """Persistent database watchlist entity linked to authenticated user."""

    __tablename__ = "user_watchlists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    product_pid: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="watchlist_items")

    def __repr__(self) -> str:
        return f"<UserWatchlist(user_id={self.user_id}, pid='{self.product_pid}')>"


class SyncAuditLog(Base):
    """Audit log tracking catalog ingestion and automated inventory sync runs."""

    __tablename__ = "sync_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sync_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # DISCOVER, STOCK_SYNC
    items_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    errors_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<SyncAuditLog(id={self.id}, type='{self.sync_type}', "
            f"processed={self.items_processed}, updated={self.items_updated})>"
        )


def calculate_pricing(wholesale_cost: float, shipping_cost: float = 0.0) -> Dict[str, float]:
    """Calculate psychological retail price, tiered bundle discounts, and net margin.

    Dynamic Tiered Multiplier & Psychological Price Cap Engine:
        - wholesale_cost <= 8.00: Retail = ROUND(wholesale_cost * 3.5, 2) - 0.01 (e.g., $5 -> $17.49)
        - 8.00 < wholesale_cost <= 18.00: Retail = ROUND(wholesale_cost * 2.2, 2) - 0.01 (e.g., $12 -> $26.39)
        - wholesale_cost > 18.00: Retail = ROUND(MIN(wholesale_cost * 1.6, 49.99), 2) - 0.01 (Strict US market ceiling)
        - 2x Bundle: 12% off total (ROUND(Retail * 2.0 * 0.88, 2) - 0.01)
        - 3x Bundle: 18% off total (ROUND(Retail * 3.0 * 0.82, 2) - 0.01)
        - Gateway Fee = 0.025 * Retail_Price + 0.30
        - RTO Buffer = 0.08 * Retail_Price
        - Net Profit = Retail_Price - (Total_Cost + Gateway + RTO)
        - Net Margin % = (Net Profit / Retail_Price) * 100
    """
    total_cost = wholesale_cost + shipping_cost

    # Dynamic Tiered Multiplier & Psychological Price Cap Engine
    if total_cost <= 8.00:
        raw_retail = round(total_cost * 3.5, 2) - 0.01
    elif total_cost <= 18.00:
        raw_retail = round(total_cost * 2.2, 2) - 0.01
    else:
        raw_retail = round(min(total_cost * 1.6, 49.99), 2) - 0.01

    retail_1x = round(raw_retail, 2)

    # Multi-unit bundle calculations (using free incremental shipping on domestic)
    bundle_2 = round(retail_1x * 2.0 * 0.88, 2) - 0.01
    bundle_3 = round(retail_1x * 3.0 * 0.82, 2) - 0.01

    # Gateway and RTO protections
    payment_fee = round(0.025 * retail_1x + 0.30, 2)
    rto_buffer = round(0.08 * retail_1x, 2)
    net_profit = round(retail_1x - (total_cost + payment_fee + rto_buffer), 2)
    net_margin_pct = round((net_profit / retail_1x) * 100, 2) if retail_1x > 0 else 0.0

    return {
        "wholesale_cost": round(wholesale_cost, 2),
        "shipping_cost": round(shipping_cost, 2),
        "total_cost": round(total_cost, 2),
        "retail_price_1x": retail_1x,
        "bundle_2_price": round(bundle_2, 2),
        "bundle_3_price": round(bundle_3, 2),
        "payment_fee": payment_fee,
        "rto_buffer": rto_buffer,
        "net_profit": net_profit,
        "net_margin_pct": net_margin_pct,
        "is_viable": net_profit > 0 and net_margin_pct >= 20.0,
    }


def slugify(text: str) -> str:
    """Generate clean URL-safe slug from text."""
    clean = re.sub(r"[^\w\s-]", "", text).strip().lower()
    slug = re.sub(r"[-\s]+", "-", clean)
    return slug[:120] if slug else "product"


def get_engine(database_url: Optional[str] = None) -> Engine:
    """Create and return SQLAlchemy engine configured for SQLite or PostgreSQL."""
    url = database_url or os.getenv("DATABASE_URL", "sqlite:///data/ecommerce.db")

    # Normalize Heroku / Supabase postgres:// dialect string for SQLAlchemy 2.0+
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if url.startswith("sqlite:///"):
        # Ensure SQLite data folder exists
        db_file = url.replace("sqlite:///", "")
        db_path = Path(db_file)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})

    return create_engine(url, pool_pre_ping=True)


def init_db(engine: Optional[Engine] = None) -> Engine:
    """Initialize all database tables with self-healing column sync."""
    eng = engine or get_engine()
    Base.metadata.create_all(bind=eng)

    # Self-healing column sync for SQLite dev environments
    if str(eng.url).startswith("sqlite"):
        try:
            with eng.connect() as conn:
                res = conn.exec_driver_sql("PRAGMA table_info(products)").fetchall()
                cols = {row[1] for row in res}
                if "specs_json" not in cols:
                    conn.exec_driver_sql("ALTER TABLE products ADD COLUMN specs_json JSON")
                if "category" not in cols:
                    conn.exec_driver_sql("ALTER TABLE products ADD COLUMN category VARCHAR(128) DEFAULT 'Home & Kitchen'")
                conn.commit()
        except Exception:
            pass

    return eng


def get_session(engine: Optional[Engine] = None) -> Session:
    """Provide a new SQLAlchemy session."""
    eng = engine or get_engine()
    session_factory = sessionmaker(bind=eng, autoflush=False, autocommit=False)
    return session_factory()

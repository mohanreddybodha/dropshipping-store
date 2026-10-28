"""Authentication, identity synchronization, and cloud storage persistence routes."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.models.database import Order, User, UserCart, UserWatchlist, get_session

logger = logging.getLogger("auth_api")
router = APIRouter()


def get_db():
    session = get_session()
    try:
        yield session
    finally:
        session.close()


class CartItemSync(BaseModel):
    variant_vid: str
    product_pid: str
    title: str
    image_url: Optional[str] = None
    tier: int = 1
    selected_size: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0


class AuthSyncRequest(BaseModel):
    firebase_uid: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    guest_cart: Optional[List[CartItemSync]] = None
    guest_watchlist: Optional[List[str]] = None


class UserProfileResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str
    display_name: Optional[str]
    photo_url: Optional[str]


class SavedCartItem(BaseModel):
    variant_vid: str
    product_pid: str
    title: str
    image_url: Optional[str]
    tier: int
    selected_size: Optional[str]
    quantity: int
    unit_price: float


class CustomerOrderView(BaseModel):
    id: int
    internal_order_number: str
    status: str
    total_retail: float
    carrier_name: str
    tracking_number: Optional[str]
    shipping_name: str
    shipping_city: str
    shipping_province: str
    shipping_zip: str
    created_at: str
    items: Optional[List[Dict[str, Any]]] = None


class AuthSyncResponse(BaseModel):
    user: UserProfileResponse
    cart: List[SavedCartItem]
    watchlist: List[str]
    orders: List[CustomerOrderView]


@router.post("/sync", response_model=AuthSyncResponse)
def sync_user_data(payload: AuthSyncRequest, db: Session = Depends(get_db)):
    """Synchronize Firebase authenticated user with PostgreSQL/SQLite.

    Merges anonymous guest cart & watchlist into persistent database tables,
    and returns full unified user state including verified orders.
    """
    clean_email = payload.email.strip().lower()
    if "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid email address is required.",
        )

    # 1. Upsert User
    user = (
        db.query(User)
        .filter((User.firebase_uid == payload.firebase_uid) | (User.email == clean_email))
        .first()
    )

    now = datetime.now(timezone.utc)

    if not user:
        user = User(
            firebase_uid=payload.firebase_uid,
            email=clean_email,
            display_name=payload.display_name or "",
            photo_url=payload.photo_url or "",
            created_at=now,
            last_login_at=now,
        )
        db.add(user)
        db.flush()
    else:
        user.firebase_uid = payload.firebase_uid
        user.email = clean_email
        if payload.display_name:
            user.display_name = payload.display_name
        if payload.photo_url:
            user.photo_url = payload.photo_url
        user.last_login_at = now
        db.flush()

    # 2. Merge Guest Cart Items
    if payload.guest_cart:
        existing_cart_items = {
            item.variant_vid: item
            for item in db.query(UserCart).filter(UserCart.user_id == user.id).all()
        }

        for incoming in payload.guest_cart:
            if incoming.variant_vid in existing_cart_items:
                # Update quantity if guest has higher or matching
                existing_item = existing_cart_items[incoming.variant_vid]
                existing_item.quantity = max(existing_item.quantity, incoming.quantity)
                existing_item.updated_at = now
            else:
                new_item = UserCart(
                    user_id=user.id,
                    variant_vid=incoming.variant_vid,
                    product_pid=incoming.product_pid,
                    title=incoming.title,
                    image_url=incoming.image_url,
                    tier=incoming.tier,
                    selected_size=incoming.selected_size,
                    quantity=max(1, incoming.quantity),
                    unit_price=incoming.unit_price,
                    updated_at=now,
                )
                db.add(new_item)
        db.flush()

    # 3. Merge Guest Watchlist Items
    if payload.guest_watchlist:
        existing_pids = {
            item.product_pid
            for item in db.query(UserWatchlist).filter(UserWatchlist.user_id == user.id).all()
        }
        for pid in payload.guest_watchlist:
            clean_pid = pid.strip()
            if clean_pid and clean_pid not in existing_pids:
                new_watch = UserWatchlist(
                    user_id=user.id,
                    product_pid=clean_pid,
                    created_at=now,
                )
                db.add(new_watch)
                existing_pids.add(clean_pid)
        db.flush()

    db.commit()

    # 4. Fetch Synced Cart Items
    all_cart = (
        db.query(UserCart)
        .filter(UserCart.user_id == user.id)
        .order_by(UserCart.updated_at.desc())
        .all()
    )
    cart_response = [
        SavedCartItem(
            variant_vid=c.variant_vid,
            product_pid=c.product_pid,
            title=c.title,
            image_url=c.image_url,
            tier=c.tier,
            selected_size=c.selected_size,
            quantity=c.quantity,
            unit_price=c.unit_price,
        )
        for c in all_cart
    ]

    # 5. Fetch Synced Watchlist
    all_watchlist = (
        db.query(UserWatchlist.product_pid)
        .filter(UserWatchlist.user_id == user.id)
        .order_by(UserWatchlist.created_at.desc())
        .all()
    )
    watchlist_pids = [row[0] for row in all_watchlist]

    # 6. Fetch Orders for this verified email
    orders = (
        db.query(Order)
        .filter(Order.customer_email.ilike(clean_email))
        .order_by(Order.created_at.desc())
        .limit(50)
        .all()
    )
    orders_response = [
        CustomerOrderView(
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

    return AuthSyncResponse(
        user=UserProfileResponse(
            id=user.id,
            firebase_uid=user.firebase_uid,
            email=user.email,
            display_name=user.display_name,
            photo_url=user.photo_url,
        ),
        cart=cart_response,
        watchlist=watchlist_pids,
        orders=orders_response,
    )


class CartReplaceRequest(BaseModel):
    firebase_uid: str
    items: List[CartItemSync]


@router.post("/cart/save")
def replace_user_cart(payload: CartReplaceRequest, db: Session = Depends(get_db)):
    """Persist current cart items for authenticated user."""
    user = db.query(User).filter(User.firebase_uid == payload.firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Clear old items
    db.query(UserCart).filter(UserCart.user_id == user.id).delete()

    now = datetime.now(timezone.utc)
    for it in payload.items:
        new_item = UserCart(
            user_id=user.id,
            variant_vid=it.variant_vid,
            product_pid=it.product_pid,
            title=it.title,
            image_url=it.image_url,
            tier=it.tier,
            selected_size=it.selected_size,
            quantity=it.quantity,
            unit_price=it.unit_price,
            updated_at=now,
        )
        db.add(new_item)

    db.commit()
    return {"status": "ok", "count": len(payload.items)}


class WatchlistToggleRequest(BaseModel):
    firebase_uid: str
    product_pid: str


@router.post("/watchlist/toggle")
def toggle_user_watchlist(payload: WatchlistToggleRequest, db: Session = Depends(get_db)):
    """Toggle product in user's saved watchlist."""
    user = db.query(User).filter(User.firebase_uid == payload.firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    clean_pid = payload.product_pid.strip()
    existing = (
        db.query(UserWatchlist)
        .filter(UserWatchlist.user_id == user.id, UserWatchlist.product_pid == clean_pid)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed", "product_pid": clean_pid}
    else:
        new_item = UserWatchlist(
            user_id=user.id,
            product_pid=clean_pid,
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_item)
        db.commit()
        return {"status": "added", "product_pid": clean_pid}

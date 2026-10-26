"""Catalog API endpoints for Next.js storefront consumption with search, filtering, and pagination."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.models.database import Product, ProductVariant, get_session

router = APIRouter()


def get_db():
    """FastAPI database session dependency."""
    session = get_session()
    try:
        yield session
    finally:
        session.close()


class VariantResponse(BaseModel):
    id: int
    vid: str
    sku: str
    image_url: Optional[str] = None
    wholesale_cost: float
    shipping_cost: float
    retail_price_1x: float
    bundle_2_price: float
    bundle_3_price: float
    us_warehouse_stock: int
    carrier_name: str
    delivery_sla: str
    is_available: bool


class ProductResponse(BaseModel):
    id: int
    pid: str
    title: str
    brand_title: Optional[str] = "Domestic Lab"
    slug: str
    category: str = "Home & Kitchen"
    rating: float = 4.8
    review_count: int = 142
    hero_image_url: Optional[str] = None
    images: Optional[List[str]] = None
    pas_description_html: Optional[str] = None
    features: Optional[List[Dict[str, Any]]] = None
    seo_meta: Optional[Dict[str, Any]] = None
    faq_schema: Optional[List[Dict[str, Any]]] = None
    viral_scripts: Optional[List[Dict[str, Any]]] = None
    fallback_affiliate_url: Optional[str] = None
    is_active: bool = True
    variants: List[VariantResponse] = []


class PaginatedCatalogResponse(BaseModel):
    items: List[ProductResponse]
    total_count: int
    total_pages: int
    current_page: int
    categories_summary: Dict[str, int]


def _build_product_response(prod: Product) -> ProductResponse:
    variant_list = [
        VariantResponse(
            id=v.id,
            vid=v.vid,
            sku=v.sku,
            image_url=v.image_url,
            wholesale_cost=v.wholesale_cost,
            shipping_cost=v.shipping_cost,
            retail_price_1x=v.retail_price,
            bundle_2_price=v.bundle_2_price,
            bundle_3_price=v.bundle_3_price,
            us_warehouse_stock=v.us_warehouse_stock,
            carrier_name=v.carrier_name,
            delivery_sla=v.delivery_sla,
            is_available=v.is_available,
        )
        for v in prod.variants
    ]

    # Deterministic rating / reviews if available in seo_meta_json
    meta = prod.seo_meta_json or {}
    rating = float(meta.get("rating", 4.8))
    review_count = int(meta.get("review_count", 142))
    category_val = getattr(prod, "category", None) or meta.get("category", "Home & Kitchen")

    return ProductResponse(
        id=prod.id,
        pid=prod.pid,
        title=prod.title,
        brand_title=prod.brand_title or "Domestic Lab",
        slug=prod.slug,
        category=category_val,
        rating=rating,
        review_count=review_count,
        hero_image_url=prod.hero_image_url,
        images=prod.images_json,
        pas_description_html=prod.pas_description_html,
        features=prod.features_json,
        seo_meta=prod.seo_meta_json,
        faq_schema=prod.faq_schema_json,
        viral_scripts=prod.viral_scripts_json,
        fallback_affiliate_url=prod.fallback_affiliate_url,
        is_active=prod.is_active,
        variants=variant_list,
    )


@router.get("/catalog", response_model=Union[PaginatedCatalogResponse, List[ProductResponse]])
def get_active_catalog(
    category: Optional[str] = Query(None, description="Filter by consumer category"),
    search: Optional[str] = Query(None, description="Search by title or keyword"),
    min_price: Optional[float] = Query(None, description="Minimum retail price"),
    max_price: Optional[float] = Query(None, description="Maximum retail price"),
    sort: str = Query("featured", description="Sort order: featured, price_asc, price_desc, rating"),
    page: Optional[int] = Query(None, ge=1, description="Page number for pagination"),
    limit: int = Query(24, ge=1, le=500, description="Items per page"),
    offset: int = Query(0, ge=0, description="Offset for legacy queries"),
    paginate: bool = Query(False, description="Explicitly request paginated JSON envelope"),
    db: Session = Depends(get_db),
):
    """Fetch active catalog with multi-category filtering, live search, sorting, and pagination."""
    query = db.query(Product).filter(Product.is_active == True)

    # 1. Category Filter
    if category and category.lower() not in ("all", "all products"):
        query = query.filter(Product.category.ilike(f"%{category.strip()}%"))

    # 2. Search Filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(Product.title.ilike(term))

    # 3. Price Filter
    if min_price is not None or max_price is not None:
        query = query.join(Product.variants)
        if min_price is not None:
            query = query.filter(ProductVariant.retail_price >= min_price)
        if max_price is not None:
            query = query.filter(ProductVariant.retail_price <= max_price)

    # 4. Sorting
    if sort == "price_asc":
        query = query.join(Product.variants).order_by(ProductVariant.retail_price.asc())
    elif sort == "price_desc":
        query = query.join(Product.variants).order_by(ProductVariant.retail_price.desc())
    elif sort == "rating":
        query = query.order_by(Product.id.desc())
    else:  # featured / default
        query = query.order_by(Product.id.asc())

    # Compute category facets across all active products
    all_categories = db.query(Product.category).filter(Product.is_active == True).all()
    categories_summary: Dict[str, int] = {}
    for (cat_name,) in all_categories:
        clean_cat = cat_name or "Home & Kitchen"
        categories_summary[clean_cat] = categories_summary.get(clean_cat, 0) + 1

    total_count = query.distinct().count()

    # Determine pagination vs legacy list
    if page is not None or paginate:
        current_page = page or 1
        page_offset = (current_page - 1) * limit
        total_pages = max(1, math.ceil(total_count / limit))
        products = query.distinct().offset(page_offset).limit(limit).all()

        return PaginatedCatalogResponse(
            items=[_build_product_response(p) for p in products],
            total_count=total_count,
            total_pages=total_pages,
            current_page=current_page,
            categories_summary=categories_summary,
        )

    # Legacy flat list support
    products = query.distinct().offset(offset).limit(limit).all()
    return [_build_product_response(p) for p in products]


@router.get("/catalog/{slug}", response_model=ProductResponse)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    """Fetch single product details by slug for Next.js static / ISR page generation."""
    prod = db.query(Product).filter(Product.slug == slug).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    return _build_product_response(prod)

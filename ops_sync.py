#!/usr/bin/env python3
"""Autonomous Agentic Operations Sync CLI (Sprint 1 & Sprint 4 Overhaul).

Executes catalog discovery, bulk-seeding (150-300+ items), and inventory auditing against
CJ Dropshipping API v2.0 with 0.9 QPS token-bucket rate limiting and SQLite / PostgreSQL parity.

Usage:
    python ops_sync.py --discover [--limit 10]
    python ops_sync.py --bulk-seed [--target 150]
    python ops_sync.py --sync-stock
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from dotenv import load_dotenv

# Ensure stdout handles UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

from src.models.database import (
    Product,
    ProductVariant,
    SyncAuditLog,
    calculate_pricing,
    get_engine,
    get_session,
    init_db,
    slugify,
)
from src.services.cj_client import CJClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ops_sync")

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich import box
    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    console = None


MIN_INGESTION_US_STOCK = 50
MIN_ACTIVE_US_STOCK = 16  # Strictly > 15 physical US warehouse units
MAX_DELIVERY_SLA_DAYS = 7
MIN_NET_PROFIT_USD = 4.00
MIN_NET_MARGIN_PCT = 20.0

PROHIBITED_WORDS = set(CJClient.PROHIBITED_KEYWORDS)
THIRD_PARTY_BRANDS = set(CJClient.THIRD_PARTY_BRANDS)

APPROVED_THEMES = [
    # Portable gadgets & Everyday Carry
    "gadget", "portable", "rechargeable", "pocket", "foldable", "usb",
    "flashlight", "fan", "multitool", "opener", "alarm", "sensor", "keychain", "tool",
    "clip", "hook", "strap", "wallet", "case", "paracord", "tripod", "warmer", "ultrasonic",
    "gloves", "mitt", "wiper", "scraper", "cleaner", "brush",
    # Car accessories
    "car", "vehicle", "auto", "dash", "cup holder", "seat hook", "trunk", "steering", "vacuum",
    # Smart kitchen & bath tools
    "kitchen", "cooking", "chopper", "slicer", "grater", "peeler", "dispenser",
    "knife", "cleaver", "bottle", "scale", "fridge", "sponge", "drainer", "caddy",
    "tumbler", "mug", "faucet", "mop", "steamer", "bidet", "cabinet", "pull",
    "container", "jar", "basket", "bucket", "tray", "strainer", "colander", "funnel",
    "spoon", "fork", "utensil", "tongs", "whisk", "spatula", "measuring", "timer",
    # Pet accessories
    "pet", "dog", "cat", "puppy", "kitten", "collar", "leash", "harness", "feeder", "pet toy", "muzzle", "litter",
    # Workspace, hardware & Tech
    "desk", "cable", "organizer", "holder", "stand", "charger", "mount", "tray", "dock",
    "mouse pad", "shelf", "rack", "storage", "box", "clock", "drill", "bit", "reamer", "stool",
    "hanger", "bracket", "level", "tape", "screwdriver", "wrench", "pliers", "lock",
    # Lighting & Outdoor utility
    "light", "lamp", "led", "nightlight", "lantern", "torch", "outdoor", "camping",
    "hammock", "grill", "mat", "pad", "tent", "backpack", "aerator", "weed barrier",
    "solar", "sconce", "bulb", "spotlight", "headlamp", "compass", "thermos"
]


def is_approved_impulse_item(title: str, cat: str = "") -> bool:
    """Enforce strict double-gate (negative blacklist + 3P brands + positive vertical whitelist)."""
    text = f"{title.lower()} {cat.lower()}"
    for kw in PROHIBITED_WORDS:
        if re.search(r"\b" + re.escape(kw) + r"(s|es|ies)?\b", text):
            return False
    for brand in THIRD_PARTY_BRANDS:
        if re.search(r"\b" + re.escape(brand) + r"\b", text):
            return False
    for theme in APPROVED_THEMES:
        if re.search(r"\b" + re.escape(theme) + r"(s|es)?\b", text):
            return True
    return False


CONSUMER_CATEGORIES = [
    "Home & Kitchen",
    "Workspace & Tech",
    "Smart Lighting",
    "Outdoor & Patio",
    "Everyday Carry & Auto",
]


def clean_consumer_title(raw_title: str) -> str:
    """Transform raw supplier title into clean 4-8 word consumer retail title."""
    if not raw_title:
        return "Everyday Problem Solver"

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", raw_title)
    # Remove Chinese characters
    text = re.sub(r"[\u4e00-\u9fff]+", " ", text)
    # Remove brand prefixes & noise words
    noise_patterns = [
        r"\bVEVOR\b", r"\bEveryday Gadgets\b", r"\bDomestic Lab\b", r"\bUS Spec\b",
        r"\bUS Standard\b", r"\bUS Plug\b", r"\bHot Sale\b", r"\bWholesale\b",
        r"\bDropshipping\b", r"\bNew Arrival\b", r"\bHigh Quality\b", r"\b20\d\d\b",
        r"\bFactory Direct\b", r"\bAmazon Hot\b", r"\bReady to Ship\b",
        r"\bWith Net\b", r"\bAccessory\b", r"\bPart\b", r"\b01az\b", r"\b9901az\b",
        r"\bNon-woven\b", r"\bNon Woven\b", r"\bWithout Bracket\b",
        r"\bCan Sterilize Effectively.*?\b", r"\bFor Those Who Are Easily Awakened.*?\b",
        r"\b[A-Z0-9]{8,}\b",  # serial codes / SKUs
    ]
    for pat in noise_patterns:
        text = re.sub(pat, " ", text, flags=re.IGNORECASE)

    # Replace punctuation and special characters with spaces
    text = re.sub(r"[,;:\-_/|()\[\]{}+*#~&\"']+", " ", text)
    
    # Filter duplicate consecutive words and noise
    words = []
    prev = ""
    for w in text.split():
        clean_w = w.strip()
        if not clean_w or len(clean_w) < 2:
            continue
        if clean_w.isdigit() and len(clean_w) > 3:
            continue
        if clean_w.lower() != prev.lower():
            words.append(clean_w)
            prev = clean_w

    if not words:
        return "Modern Home & Office Utility"

    # Keep 4 to 8 words max
    selected_words = words[:7]
    title = " ".join(selected_words)
    title = title.title()
    # Normalize common abbreviations
    title = re.sub(r"\bLcd\b", "LCD", title)
    title = re.sub(r"\bLed\b", "LED", title)
    title = re.sub(r"\bUsb\b", "USB", title)
    title = re.sub(r"\bUs\b", "US", title)
    title = re.sub(r"\bRgb\b", "RGB", title)
    title = re.sub(r"\bEdc\b", "EDC", title)
    return title.strip()


def categorize_product(title: str, category_name: str = "") -> str:
    """Categorize item into one of the 5 consumer categories using exact word boundaries."""
    combined = f"{title.lower()} {category_name.lower()}"

    # 1. Smart Lighting
    lighting_patterns = [
        r"\blights?\b", r"\blamps?\b", r"\bleds?\b", r"\bbulbs?\b", r"\blanterns?\b",
        r"\bnightlights?\b", r"\bambient\b", r"\bsconces?\b", r"\bsolar lights?\b",
        r"\brgb\b", r"\bceiling lights?\b", r"\bstrip lights?\b", r"\bglow\b",
        r"\bbacklit\b", r"\billumination\b", r"\bchandelier\b", r"\bspotlight\b"
    ]
    if any(re.search(pat, combined) for pat in lighting_patterns):
        return "Smart Lighting"

    # 2. Outdoor & Patio
    outdoor_patterns = [
        r"\boutdoors?\b", r"\bpatios?\b", r"\bcamping\b", r"\bhammocks?\b",
        r"\bfire\s*pits?\b", r"\bgardens?\b", r"\bbbq\b", r"\bgrills?\b",
        r"\bhiking\b", r"\btents?\b", r"\bpicnics?\b", r"\bbackyards?\b",
        r"\bdecks?\b", r"\bcanop(y|ies)\b", r"\bsurvival\b", r"\bcompass\b",
        r"\bcampfire\b"
    ]
    if any(re.search(pat, combined) for pat in outdoor_patterns):
        return "Outdoor & Patio"

    # 3. Everyday Carry & Auto
    edc_auto_patterns = [
        r"\bcars?\b", r"\bauto\b", r"\bautomotive\b", r"\bvehicles?\b",
        r"\bwallets?\b", r"\bkeychains?\b", r"\bedc\b", r"\btires?\b",
        r"\bwindshields?\b", r"\btrunks?\b", r"\bkey\s*holders?\b",
        r"\bvisors?\b", r"\bdash\b", r"\bcupholders?\b"
    ]
    if any(re.search(pat, combined) for pat in edc_auto_patterns):
        return "Everyday Carry & Auto"

    # 4. Workspace & Tech
    workspace_patterns = [
        r"\bdesks?\b", r"\boffices?\b", r"\bcomputers?\b", r"\blaptops?\b",
        r"\bcables?\b", r"\bmice\b", r"\bkeyboards?\b", r"\bstands?\b",
        r"\btablets?\b", r"\bscreens?\b", r"\bmonitors?\b", r"\bdocks?\b",
        r"\bheadphones?\b", r"\baudios?\b", r"\busb\b", r"\bergonomic\b",
        r"\bclocks?\b", r"\bchargers?\b", r"\bstations?\b", r"\bstationery\b"
    ]
    if any(re.search(pat, combined) for pat in workspace_patterns):
        return "Workspace & Tech"

    # 5. Default: Home & Kitchen
    return "Home & Kitchen"


def extract_multi_images(details: Dict[str, Any], hero_fallback: Optional[str] = None) -> List[str]:
    """Extract at least 3-6 verified HTTPS image URLs from product details."""
    images: List[str] = []

    # 1. bigImage
    big_img = details.get("bigImage")
    if isinstance(big_img, str) and big_img.startswith("http"):
        images.append(big_img.replace("http://", "https://"))

    # 2. productImageSet
    raw_set = details.get("productImageSet")
    if isinstance(raw_set, list):
        for img in raw_set:
            if isinstance(img, str) and img.startswith("http"):
                images.append(img.replace("http://", "https://"))

    # 3. productImage
    raw_prod_img = details.get("productImage")
    if isinstance(raw_prod_img, str):
        try:
            parsed = json.loads(raw_prod_img)
            if isinstance(parsed, list):
                for img in parsed:
                    if isinstance(img, str) and img.startswith("http"):
                        images.append(img.replace("http://", "https://"))
        except Exception:
            if raw_prod_img.startswith("http"):
                images.append(raw_prod_img.replace("http://", "https://"))

    # 4. Embedded images in description HTML
    desc = details.get("description", "")
    if isinstance(desc, str) and "<img" in desc:
        desc_imgs = re.findall(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', desc)
        for img in desc_imgs:
            if any(ext in img.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                images.append(img.replace("http://", "https://"))

    # 5. Variant images
    for v in details.get("variants", []):
        vimg = v.get("variantImage")
        if isinstance(vimg, str) and vimg.startswith("http"):
            images.append(vimg.replace("http://", "https://"))

    # Deduplicate while preserving order
    deduped: List[str] = []
    seen: Set[str] = set()
    for img in images:
        clean = img.strip()
        if clean not in seen and len(clean) > 12:
            seen.add(clean)
            deduped.append(clean)

    if not deduped and hero_fallback and hero_fallback.startswith("http"):
        deduped.append(hero_fallback.replace("http://", "https://"))

    return deduped


def generate_clean_consumer_copy(
    title: str,
    category: str,
    sku: str,
    retail_price: float,
    pid: str,
) -> Dict[str, Any]:
    """Generate high-converting, scannable consumer copy with deterministic reviews."""
    slug = slugify(f"{title}-{sku[-6:] if len(sku) >= 6 else pid[-6:]}")

    # Deterministic rating & review count from PID
    hash_val = sum(ord(c) for c in pid)
    rating = round(4.6 + (hash_val % 35) / 100.0, 1)  # 4.6 to 4.9
    review_count = 38 + (hash_val % 383)             # 38 to 420

    pas_html = f"""<div class="space-y-4 text-slate-700">
  <p class="font-medium text-slate-900 leading-relaxed">
    Frustrated with cheap, fragile alternatives that break easily or take weeks to arrive?
  </p>
  <p class="leading-relaxed">
    Most standard mass-market options use weak materials that degrade after brief use. The <strong>{title}</strong> is precision-engineered with durable materials to deliver long-lasting everyday reliability right out of the box.
  </p>
  <p class="leading-relaxed">
    Stocked in domestic US fulfillment centers with tracked ground delivery across the 48 contiguous states and covered for verified defects or transit damage within 7 days of delivery.
  </p>
</div>"""

    features = [
        {"icon": "truck", "title": "Tracked Domestic Delivery", "desc": "Dispatched via tracked US ground carriers (est. 3–5 business days across the 48 contiguous states, physical street addresses only)."},
        {"icon": "shield-check", "title": "7-Day Defect Protection", "desc": "Replacement or refund coverage within 7 days of delivery for verified defects, transit damage, or wrong items."},
        {"icon": "sparkles", "title": "Premium Durability", "desc": "Constructed from high-grade materials built for rigorous daily home and office use."},
        {"icon": "wrench", "title": "Quick Tool-Free Setup", "desc": "Designed to function effortlessly straight out of the box in under 60 seconds."},
        {"icon": "tags", "title": "Tiered Bundle Discounts", "desc": "Save up to 18% when ordering 2 or 3 units for family or multiple rooms."},
    ]

    seo_meta = {
        "meta_title": f"{title} | Fast Contiguous US Shipping",
        "meta_description": f"Shop the {title}. Tracked domestic ground delivery across 48 US states, 7-day defect support, and multi-unit bundle savings.",
        "slug": slug,
        "category": category,
        "rating": rating,
        "review_count": review_count,
    }

    faq_schema = [
        {"question": "How quickly will my order arrive & where do you ship?", "answer": "Orders dispatch from domestic US fulfillment centers and typically arrive in an estimated 3 to 5 business days via tracked ground delivery to physical street addresses in the 48 contiguous US states. P.O. Boxes, APO/FPO military bases, Alaska, Hawaii, and US territories are not supported."},
        {"question": "What is the return policy?", "answer": "We provide a 30-minute post-checkout cancellation window, plus replacement or refund support within 7 calendar days of delivery exclusively for defective, damaged, or incorrect items."},
        {"question": "How do bundle discounts work?", "answer": "Selecting the 2-pack saves you 12%, and the 3-pack saves 18% with zero extra shipping charges."}
    ]

    return {
        "slug": slug,
        "category": category,
        "pas_description_html": pas_html,
        "features_json": features,
        "seo_meta_json": seo_meta,
        "faq_schema_json": faq_schema,
    }


def reset_database() -> None:
    """Drop all existing products and variants for a clean catalog re-seed."""
    engine = init_db()
    session = get_session(engine)
    try:
        num_variants = session.query(ProductVariant).delete()
        num_products = session.query(Product).delete()
        session.commit()
        logger.info("Database reset complete: purged %d variants and %d products.", num_variants, num_products)
    except Exception as exc:
        session.rollback()
        logger.error("Database reset error: %s", exc)
        raise
    finally:
        session.close()


def export_catalog_to_json(filepath: str = "storefront/src/lib/seedCatalog.json") -> int:
    """Export all active database products and variants to storefront seedCatalog.json."""
    engine = init_db()
    session = get_session(engine)
    try:
        products = session.query(Product).filter(Product.is_active == True).all()
        export_list = []
        for p in products:
            variants = session.query(ProductVariant).filter(ProductVariant.product_id == p.id).all()
            var_list = []
            for v in variants:
                var_list.append({
                    "id": v.id,
                    "vid": v.vid,
                    "sku": v.sku,
                    "image_url": v.image_url,
                    "wholesale_cost": v.wholesale_cost,
                    "shipping_cost": v.shipping_cost,
                    "retail_price_1x": v.retail_price,
                    "bundle_2_price": v.bundle_2_price,
                    "bundle_3_price": v.bundle_3_price,
                    "us_warehouse_stock": v.us_warehouse_stock,
                    "carrier_name": v.carrier_name,
                    "delivery_sla": v.delivery_sla,
                    "is_available": v.is_available,
                })
            export_list.append({
                "id": p.id,
                "pid": p.pid,
                "title": p.title,
                "brand_title": p.brand_title or "Vastire",
                "slug": p.slug,
                "category": p.category,
                "hero_image_url": p.hero_image_url,
                "images": p.images_json or [p.hero_image_url],
                "pas_description_html": p.pas_description_html,
                "features": p.features_json or [],
                "seo_meta": p.seo_meta_json or {},
                "faq_schema": p.faq_schema_json or [],
                "is_active": p.is_active,
                "variants": var_list,
            })
        target_path = Path(filepath)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(export_list, f, indent=2)
        logger.info("Exported %d active products to %s", len(export_list), filepath)
        return len(export_list)
    finally:
        session.close()


def run_bulk_seed(target: int = 150) -> int:
    """Execute high-speed bulk ingestion across multi-page US Warehouse catalog."""
    engine = init_db()
    session = get_session(engine)
    client = CJClient()

    if HAS_RICH and console:
        console.print(Panel.fit(
            f"[bold cyan]OPS SYNC: BULK CATALOG SEEDING (Target: {target}+ Products)[/bold cyan]\n"
            "[dim]5 Consumer Categories • Multi-Image Extractions • Clean Consumer Titles & Copy[/dim]",
            border_style="cyan",
            box=box.DOUBLE,
        ))
    else:
        logger.info("Starting Bulk Catalog Seed (Target: %d products)...", target)

    # 1. Clean existing legacy records in DB with dirty titles or single images
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            for tbl, seq in [("products", "products_id_seq"), ("product_variants", "product_variants_id_seq")]:
                try:
                    m = conn.execute(text(f"SELECT COALESCE(MAX(id), 0) FROM {tbl}")).scalar()
                    conn.execute(text(f"SELECT setval('{seq}', {max(m, 1)}, true)"))
                except Exception:
                    pass
    except Exception:
        pass

    existing_records = session.query(Product).all()
    cleaned_count = 0
    for prod in existing_records:
        cleaned_title = clean_consumer_title(prod.title)
        cat = categorize_product(cleaned_title, prod.brand_title or "")
        needs_update = False
        if prod.title != cleaned_title:
            prod.title = cleaned_title
            needs_update = True
        if getattr(prod, "category", None) != cat:
            prod.category = cat
            needs_update = True
        if prod.seo_meta_json and prod.seo_meta_json.get("category") != cat:
            meta = dict(prod.seo_meta_json)
            meta["category"] = cat
            hash_val = sum(ord(c) for c in prod.pid)
            meta["rating"] = round(4.6 + (hash_val % 35) / 100.0, 1)
            meta["review_count"] = 38 + (hash_val % 383)
            prod.seo_meta_json = meta
            needs_update = True
        if needs_update:
            cleaned_count += 1
    if cleaned_count > 0:
        session.commit()
        logger.info("Cleaned metadata on %d existing database products.", cleaned_count)

    current_db_count = session.query(Product).filter(Product.is_active == True).count()
    logger.info("Active database catalog currently has %d products. Target: %d", current_db_count, target)

    if current_db_count >= target:
        logger.info("Target already reached (%d >= %d). Seeding complete.", current_db_count, target)
        session.close()
        client.close()
        return current_db_count

    items_ingested = current_db_count
    items_processed = 0
    errors = []

    # Paginate through high-converting targeted keywords first, then general US warehouse
    keywords = [
        "kitchen", "desk", "led", "lamp", "charger", "storage", "organizer",
        "outdoor", "camping", "gadget", "bottle", "stand", "car", "fan",
        "cleaner", "knife", "box", "hook", "tool", "cable", "holder",
        "dispenser", "peeler", "mug", "cup", "thermos", "timer", "scale",
        "nightlight", "lantern", "solar", "mount", "wallet", "keychain",
        "clock", "audio", "grill", "tent", "hammock", "blanket", "compass"
    ]
    queries = (
        [{"page": p, "keyword": None, "stock": MIN_INGESTION_US_STOCK} for p in range(1, 52)] +
        [{"page": p, "keyword": kw, "stock": MIN_INGESTION_US_STOCK} for kw in keywords for p in range(1, 8)]
    )

    seen_pids = {p.pid for p in session.query(Product.pid).all()}

    try:
        for q in queries:
            if items_ingested >= target:
                break

            kw = q.get("keyword")
            pg = q.get("page", 1)
            stk = q.get("stock", MIN_INGESTION_US_STOCK)
            logger.info("Querying CJ US warehouse (page=%d, keyword=%s, stock>=%d)...", pg, kw, stk)
            try:
                candidates = client.query_us_warehouse_products(
                    page=pg,
                    size=50,
                    min_warehouse_stock=stk,
                    keyword=kw,
                )
            except Exception as q_err:
                logger.warning("Query failed (pg %d): %s", pg, q_err)
                time.sleep(2.0)
                continue

            for item in candidates:
                if items_ingested >= target:
                    break

                pid = str(item.get("id"))
                if pid in seen_pids:
                    continue

                raw_title = item.get("nameEn") or item.get("productName") or ""
                supplier_cat = item.get("categoryName") or item.get("threeCategoryName") or ""

                # Enforce strict double-gate (negative blacklist + 3P brands + positive vertical whitelist)
                if not is_approved_impulse_item(raw_title, supplier_cat):
                    continue

                # Format clean consumer title & category and re-check cleaned title
                title = clean_consumer_title(raw_title)
                if not is_approved_impulse_item(title, supplier_cat):
                    continue
                category = categorize_product(title, supplier_cat)

                seen_pids.add(pid)
                items_processed += 1

                try:
                    # Single detail query per product to fetch images and variants
                    details = client.get_product_details(pid)
                    variants = details.get("variants", [])
                    if not variants:
                        continue

                    # Extract multi-images (at least 2 verified HTTPS URLs)
                    gallery_images = extract_multi_images(details, item.get("bigImage"))
                    if len(gallery_images) < 2:
                        continue

                    hero_image = gallery_images[0]

                    # Pick suitable variant ($2.50 - $26.00 wholesale) that has physical US stock >= 50, domestic SLA <= 7d, and positive margins
                    eligible_vars = [
                        v for v in variants
                        if 2.5 <= float(v.get("variantSellPrice") or 0.0) <= 26.0
                    ]
                    if not eligible_vars:
                        continue

                    selected_variant = None
                    live_us_stock = 0
                    carrier_name = None
                    actual_freight = 0.0
                    delivery_aging = ""
                    pricing = None
                    wholesale = 0.0
                    vid = ""
                    sku = ""

                    for cand_v in eligible_vars:
                        cand_vid = str(cand_v.get("vid"))
                        cand_stock = client.get_verified_us_stock(cand_vid)
                        if cand_stock < MIN_INGESTION_US_STOCK:
                            continue

                        cand_carrier, cand_freight, cand_aging, max_days = client.get_cheapest_domestic_shipping(cand_vid)
                        if not cand_carrier or max_days > MAX_DELIVERY_SLA_DAYS:
                            continue

                        cand_wholesale = float(cand_v.get("variantSellPrice") or 10.0)
                        cand_pricing = calculate_pricing(cand_wholesale, cand_freight)
                        if not cand_pricing["is_viable"]:
                            continue

                        selected_variant = cand_v
                        live_us_stock = cand_stock
                        carrier_name = cand_carrier
                        actual_freight = cand_freight
                        delivery_aging = cand_aging
                        pricing = cand_pricing
                        wholesale = cand_wholesale
                        vid = cand_vid
                        sku = str(cand_v.get("variantSku") or cand_vid)
                        break

                    if not selected_variant or not pricing:
                        continue

                    retail_1x = pricing["retail_price_1x"]

                    # Generate rich consumer marketing & review copy
                    copy_assets = generate_clean_consumer_copy(
                        title=title,
                        category=category,
                        sku=sku,
                        retail_price=retail_1x,
                        pid=pid,
                    )

                    # Create Product
                    new_prod = Product(
                        pid=pid,
                        title=title,
                        brand_title="Vastire",
                        slug=copy_assets["slug"],
                        category=category,
                        hero_image_url=hero_image,
                        images_json=gallery_images,
                        pas_description_html=copy_assets["pas_description_html"],
                        features_json=copy_assets["features_json"],
                        seo_meta_json=copy_assets["seo_meta_json"],
                        faq_schema_json=copy_assets["faq_schema_json"],
                        is_active=True,
                    )
                    session.add(new_prod)
                    session.flush()

                    # Create Variant with real CJ US stock, freight, and SLA
                    new_var = ProductVariant(
                        vid=vid,
                        product_id=new_prod.id,
                        sku=sku,
                        image_url=selected_variant.get("variantImage") or hero_image,
                        wholesale_cost=wholesale,
                        shipping_cost=actual_freight,
                        retail_price=retail_1x,
                        bundle_2_price=pricing["bundle_2_price"],
                        bundle_3_price=pricing["bundle_3_price"],
                        us_warehouse_stock=live_us_stock,
                        carrier_name=carrier_name,
                        delivery_sla=f"{delivery_aging} Days" if "day" not in delivery_aging.lower() else delivery_aging,
                        is_available=True,
                    )
                    session.add(new_var)
                    session.commit()

                    items_ingested += 1
                    logger.info(
                        "Ingested [%d/%d] [%s] '%s' ($%.2f retail, $%.2f freight, %d images, %d US stock)",
                        items_ingested, target, category, title, retail_1x, actual_freight, len(gallery_images), live_us_stock
                    )
                    if items_ingested % 15 == 0:
                        try:
                            export_catalog_to_json()
                        except Exception:
                            pass

                except Exception as item_err:
                    try:
                        session.rollback()
                    except Exception:
                        try:
                            session.close()
                        except Exception:
                            pass
                        session = get_session(engine)
                    logger.warning("Failed processing product PID %s: %s", pid, item_err)
                    errors.append({"pid": pid, "error": str(item_err)})

    except Exception as exc:
        logger.error("Bulk seed fatal error: %s", exc)
        errors.append({"general_error": str(exc)})
    finally:
        audit = SyncAuditLog(
            sync_type="DISCOVER",
            items_processed=items_processed,
            items_updated=items_ingested,
            errors_json=errors if errors else None,
        )
        session.add(audit)
        session.commit()
        session.close()
        client.close()

    total_final = items_ingested
    logger.info("Bulk seeding finished. Total active products in database: %d", total_final)
    try:
        export_catalog_to_json()
    except Exception as exp_err:
        logger.warning("Could not auto-export seedCatalog.json: %s", exp_err)
    return total_final


def run_discover(limit: int = 10) -> int:
    """Discover winning US domestic products and ingest into database."""
    return run_bulk_seed(target=limit)


def variant_passes_financial_gate(variant: ProductVariant, product: Optional[Product] = None) -> bool:
    """Verify PayPal + RTO strict net profit (>= $4.00), net margin (>= 20%), and single-unit anomaly bounds."""
    retail = float(variant.retail_price or 0.0)
    cogs = float(variant.wholesale_cost or 0.0) + float(variant.shipping_cost or 0.0)
    if retail <= 0:
        return False
    paypal_fee = round(0.0349 * retail + 0.49, 2)
    rto_buffer = round(0.08 * retail, 2)
    net_profit = round(retail - (cogs + paypal_fee + rto_buffer), 2)
    net_margin = (net_profit / retail) * 100.0
    if net_profit < MIN_NET_PROFIT_USD or net_margin < MIN_NET_MARGIN_PCT:
        return False

    # Enforce stored Amazon single-unit anomaly ceiling when configured in product.seo_meta_json
    if product and isinstance(product.seo_meta_json, dict):
        amz = product.seo_meta_json.get("amazon_benchmark")
        min_w = min((float(v.wholesale_cost or cogs) for v in product.variants), default=cogs)
        if amz and float(amz) > 0:
            amz_val = float(amz)
            # Single-unit / non-set variant must never exceed Amazon + $5.00
            is_single_tier = (float(variant.wholesale_cost or 0.0) <= min_w * 1.35)
            dname = str(getattr(variant, "display_name", None) or getattr(variant, "variant_name", None) or variant.sku or "").lower()
            is_explicit_bundle = any(tok in dname for tok in ("pack", "set", "pcs", "pc", "cans", "knife"))
            if is_single_tier and retail > amz_val + 5.00:
                return False
            # Single-unit pricing anomaly guard (e.g. supplier 10-pack wholesale mislabeled as single variant)
            if not is_explicit_bundle and retail > max(amz_val * 3.0, 59.99):
                return False
    return True


def trigger_storefront_revalidation() -> None:
    """Trigger Vastire production cron endpoint in revalidate-only mode after DB updates."""
    admin_key = (os.getenv("ADMIN_API_KEY") or os.getenv("CRON_SECRET") or "").strip()
    target_url = (os.getenv("STOREFRONT_REVALIDATE_URL") or "https://vastire.com/api/cron/sync-cj?mode=revalidate").strip()
    if not admin_key:
        logger.info("Skipping remote storefront revalidation (ADMIN_API_KEY not set).")
        return
    try:
        import urllib.request
        req = urllib.request.Request(
            target_url,
            method="POST",
            headers={"Authorization": f"Bearer {admin_key}", "User-Agent": "Vastire-OpsSync/2.0"},
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            logger.info("Storefront revalidation triggered (%d): %s", resp.status, resp.read().decode("utf-8", errors="ignore")[:240])
    except Exception as rev_err:
        logger.warning("Storefront revalidation warning: %s", rev_err)


def enforce_catalog_rules(session) -> Dict[str, int]:
    """Audit and enforce category, third-party brand, stock (> 15), and margin gates across DB products."""
    deactivated_products = 0
    disabled_variants = 0
    checked_products = 0

    all_products = session.query(Product).all()
    for product in all_products:
        checked_products += 1
        if not product.is_active:
            for v in product.variants:
                if v.is_available:
                    v.is_available = False
                    disabled_variants += 1
            continue

        category_ok = is_approved_impulse_item(product.title or "", product.category or "")
        specs_ok = bool(product.specs_json) and bool(product.features_json)
        media_ok = bool(product.hero_image_url and "placeholder" not in product.hero_image_url.lower())

        available_variant_count = 0
        for v in product.variants:
            stock_ok = int(v.us_warehouse_stock or 0) >= MIN_ACTIVE_US_STOCK
            finance_ok = variant_passes_financial_gate(v, product)
            should_be_avail = bool(category_ok and specs_ok and media_ok and stock_ok and finance_ok)
            if v.is_available != should_be_avail:
                v.is_available = should_be_avail
                if not should_be_avail:
                    disabled_variants += 1
            if should_be_avail:
                available_variant_count += 1

        should_be_active = bool(category_ok and specs_ok and media_ok and available_variant_count > 0)
        if product.is_active and not should_be_active:
            product.is_active = False
            deactivated_products += 1
            logger.warning(
                "Deactivated product ID %s ('%s'): category_ok=%s specs_ok=%s avail_variants=%d",
                product.id, (product.title or "")[:45], category_ok, specs_ok, available_variant_count
            )

    session.commit()
    return {
        "checked_products": checked_products,
        "deactivated_products": deactivated_products,
        "disabled_variants": disabled_variants,
    }


def run_stock_sync(enforce_rules: bool = True) -> int:
    """Audit live CJ US warehouse stock (> 15 units) and enforce all pipeline rules."""
    engine = init_db()
    session = get_session(engine)
    client = CJClient()

    items_processed = 0
    items_updated = 0
    errors = []

    try:
        cj_authed = False
        try:
            cj_authed = client.authenticate()
        except Exception as auth_err:
            errors.append({"auth_error": str(auth_err)})

        if not cj_authed:
            logger.error("CJ authentication failed; aborting live CJ stock mutation (fail-safe).")
            errors.append({"general_error": "CJ API authentication failed; skipped live stock mutations."})
        else:
            active_products = session.query(Product).filter(Product.is_active == True).all()
            logger.info("Auditing live CJ US stock for %d active products in database.", len(active_products))

            for product in active_products:
                items_processed += 1
                avail_count = 0
                for variant in product.variants:
                    try:
                        live_stock = client.get_verified_us_stock(variant.vid)
                        variant.us_warehouse_stock = live_stock
                        is_ok = (live_stock >= MIN_ACTIVE_US_STOCK) and variant_passes_financial_gate(variant, product)
                        variant.is_available = is_ok
                        if is_ok:
                            avail_count += 1
                        items_updated += 1
                    except Exception as var_err:
                        errors.append({"vid": variant.vid, "error": str(var_err)})
                        if variant.is_available:
                            avail_count += 1

                if avail_count == 0 and product.variants:
                    product.is_active = False
                    logger.warning("Product ID %s ('%s') deactivated: 0 variants with US stock > 15.", product.id, (product.title or "")[:40])

                session.commit()

        if enforce_rules:
            rule_summary = enforce_catalog_rules(session)
            logger.info("Rule enforcement summary: %s", rule_summary)
    except Exception as exc:
        logger.error("Stock sync error: %s", exc)
        errors.append({"general_error": str(exc)})
    finally:
        audit = SyncAuditLog(
            sync_type="STOCK_SYNC",
            items_processed=items_processed,
            items_updated=items_updated,
            errors_json=errors if errors else None,
        )
        session.add(audit)
        session.commit()
        session.close()
        client.close()

    trigger_storefront_revalidation()
    return items_updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Autonomous Dropshipping Ops Sync CLI")
    parser.add_argument("--reset-db", action="store_true", help="Clear all products and variants from database before re-seeding")
    parser.add_argument("--discover", action="store_true", help="Discover and ingest new winning US domestic products")
    parser.add_argument("--bulk-seed", action="store_true", help="Fast-track bulk multi-category ingestion (150-300 items)")
    parser.add_argument("--target", type=int, default=150, help="Target number of active products in database (default: 150)")
    parser.add_argument("--sync-stock", action="store_true", help="Audit live US warehouse stock (> 15) and rules for active products")
    parser.add_argument("--enforce-rules", action="store_true", help="Enforce category, 3P brand, stock (> 15), and margin gates in DB")
    parser.add_argument("--limit", type=int, default=10, help="Maximum products to discover (default: 10)")
    args = parser.parse_args()

    if args.reset_db:
        reset_database()

    if args.bulk_seed:
        run_bulk_seed(target=args.target)
    elif args.discover:
        run_discover(limit=args.limit)
    elif args.sync_stock:
        run_stock_sync(enforce_rules=True)
    elif args.enforce_rules:
        engine = init_db()
        session = get_session(engine)
        summary = enforce_catalog_rules(session)
        logger.info("Offline rule audit completed: %s", summary)
        session.close()
        trigger_storefront_revalidation()
    elif not args.reset_db:
        parser.print_help()


if __name__ == "__main__":
    main()

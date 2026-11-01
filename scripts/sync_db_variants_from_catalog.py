"""Sync real CJ variant wholesale costs & retail prices from seedCatalog.json to Neon PostgreSQL database."""

import json
import os
import sys

from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from sqlalchemy import text
from src.models.database import Product, ProductVariant, get_session


def sync_db():
    catalog_path = "storefront/src/lib/seedCatalog.json"
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    session = get_session()

    try:
        # 1. Reset postgres auto-increment sequence to avoid duplicate key errors
        session.execute(text("SELECT setval('product_variants_id_seq', COALESCE((SELECT MAX(id) FROM product_variants), 1));"))
        session.commit()

        # 2. Pre-fetch all products and existing variants in bulk (0ms latency per item)
        db_prods_by_id = {p.id: p for p in session.query(Product).all()}
        db_prods_by_pid = {p.pid: p for p in db_prods_by_id.values() if p.pid}
        existing_vars_by_vid = {v.vid: v for v in session.query(ProductVariant).all() if v.vid}

        updated_variants = 0
        created_variants = 0

        for p_data in catalog:
            p_id = p_data.get("id")
            p_pid = p_data.get("pid")

            db_prod = None
            if p_id and int(p_id) in db_prods_by_id:
                db_prod = db_prods_by_id[int(p_id)]
            elif p_pid and str(p_pid) in db_prods_by_pid:
                db_prod = db_prods_by_pid[str(p_pid)]

            if not db_prod:
                continue

            for v in p_data.get("variants", []):
                vid = str(v.get("vid") or "")
                if not vid:
                    continue

                wholesale = float(v.get("wholesale_cost") or 6.0)
                retail = float(v.get("retail_price_1x") or 18.79)
                b2 = float(v.get("bundle_2_price") or round(retail * 2 * 0.88, 2))
                b3 = float(v.get("bundle_3_price") or round(retail * 3 * 0.82, 2))
                sku = str(v.get("sku") or vid)
                image_url = v.get("image_url") or db_prod.hero_image_url

                if vid in existing_vars_by_vid:
                    existing_var = existing_vars_by_vid[vid]
                    existing_var.wholesale_cost = wholesale
                    existing_var.retail_price = retail
                    existing_var.bundle_2_price = b2
                    existing_var.bundle_3_price = b3
                    existing_var.sku = sku
                    if image_url:
                        existing_var.image_url = image_url
                    existing_var.is_available = v.get("is_available", True)
                    updated_variants += 1
                else:
                    new_var = ProductVariant(
                        product_id=db_prod.id,
                        vid=vid,
                        sku=sku,
                        image_url=image_url,
                        wholesale_cost=wholesale,
                        shipping_cost=0.0,
                        retail_price=retail,
                        bundle_2_price=b2,
                        bundle_3_price=b3,
                        us_warehouse_stock=int(v.get("us_warehouse_stock") or 100),
                        carrier_name=v.get("carrier_name") or "USPS",
                        delivery_sla=v.get("delivery_sla") or "3-5 business days",
                        is_available=v.get("is_available", True),
                    )
                    session.add(new_var)
                    existing_vars_by_vid[vid] = new_var
                    created_variants += 1

        session.commit()
        print(f"Sync complete: {updated_variants} variants updated, {created_variants} variants created in database.")
    except Exception as e:
        session.rollback()
        print(f"Error syncing to DB: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    sync_db()

import os
import sys
import json
import time
import dotenv

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")

dotenv.load_dotenv()
from src.services.cj_client import CJClient

cj = CJClient()

catalog_path = "storefront/src/lib/seedCatalog.json"
with open(catalog_path, "r", encoding="utf-8") as f:
    catalog = json.load(f)

print(f"Starting CJ catalog variant synchronization for {len(catalog)} products...")

updated_count = 0
for idx, p in enumerate(catalog):
    pid = p.get("pid")
    if not pid:
        continue

    try:
        details = cj.get_product_details(pid)
        cj_variants = details.get("variants", [])
        if not cj_variants:
            print(f"[{idx+1}/{len(catalog)}] PID {pid} has no variants or delisted. Skipping.")
            continue

        base_cost = float(p.get("wholesale_cost") or 6.0)
        base_retail = float(p.get("retail_price_1x") or (base_cost * 2.3 + 4.99))

        enriched_variants = []
        for v in cj_variants:
            v_key = (v.get("variantKey") or v.get("variantNameEn") or "").strip()
            v_sku = v.get("variantSku") or ""
            v_vid = v.get("vid") or ""
            v_img = v.get("variantImage") or p.get("hero_image_url")
            v_price = float(v.get("sellPrice") or base_cost)
            
            # Adaptive retail calculation for variant
            if v_price > 0 and base_cost > 0:
                ratio = v_price / base_cost
                ret_1x = round(base_retail * max(0.8, min(2.5, ratio)), 2)
            else:
                ret_1x = round(base_retail, 2)

            b2 = round(ret_1x * 1.85, 2)
            b3 = round(ret_1x * 2.65, 2)

            # Extract clean display name
            display_name = v_key if v_key else (p.get("title") or "Standard")
            
            enriched_variants.append({
                "vid": v_vid,
                "sku": v_sku,
                "variant_name": display_name,
                "size": v_key if any(sz in v_key.upper() for sz in ["S", "M", "L", "XL", "XXL", "INCH", "ML", "OZ", "MM", "CM"]) else None,
                "color": v_key if any(c in v_key.lower() for c in ["black", "white", "blue", "red", "green", "gray", "grey", "silver", "gold", "orange", "yellow", "pink", "purple", "brown", "beige"]) else None,
                "image_url": v_img,
                "wholesale_cost": v_price,
                "retail_price_1x": ret_1x,
                "bundle_2_price": b2,
                "bundle_3_price": b3,
                "us_warehouse_stock": 120,
                "carrier_name": "USPS",
                "delivery_sla": "3-5 Days",
                "is_available": True
            })

        # Update product variants with genuine CJ variants
        p["variants"] = enriched_variants
        
        # Also update product hero images if CJ provided a richer set
        images_set = details.get("productImageSet")
        if isinstance(images_set, list) and len(images_set) > 0:
            valid_imgs = [img for img in images_set if isinstance(img, str) and img.startswith("http")]
            if valid_imgs:
                p["images"] = valid_imgs
                p["hero_image_url"] = valid_imgs[0]

        updated_count += 1
        print(f"[{idx+1}/{len(catalog)}] Enriched '{p.get('title')[:35]}' with {len(enriched_variants)} real CJ variants.")

    except Exception as exc:
        print(f"[{idx+1}/{len(catalog)}] Error enriching PID {pid}: {exc}")

# Write back enriched catalog
with open(catalog_path, "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2, ensure_ascii=False)

print(f"\nCompleted! Successfully synced {updated_count} products with real CJ Dropshipping variants.")

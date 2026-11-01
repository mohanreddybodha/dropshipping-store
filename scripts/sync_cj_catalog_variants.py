import os
import sys
import json
import time
import dotenv

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")

dotenv.load_dotenv(r"c:\Users\bodha\OneDrive\Desktop\DropShipping\.env")
from src.services.cj_client import CJClient

cj = CJClient()

catalog_path = "storefront/src/lib/seedCatalog.json"
with open(catalog_path, "r", encoding="utf-8") as f:
    catalog = json.load(f)

print(f"Starting CJ catalog variant synchronization for {len(catalog)} products...")

def calculate_retail_price(wholesale: float) -> tuple[float, float, float]:
    """Calculate retail and bundle pricing based on realistic wholesale markup."""
    w = max(0.5, float(wholesale))
    if w <= 10.0:
        ret = round(w * 2.3 + 4.99, 2)
    elif w <= 30.0:
        ret = round(w * 1.9 + 5.99, 2)
    elif w <= 60.0:
        ret = round(w * 1.6 + 7.99, 2)
    elif w <= 100.0:
        ret = round(w * 1.45 + 9.99, 2)
    else:
        ret = round(w * 1.35 + 12.99, 2)
    
    # Bundle prices with built-in discount
    b2 = round(ret * 2 * 0.90, 2)
    b3 = round(ret * 3 * 0.85, 2)
    return ret, b2, b3

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

        base_product_cost = float(p.get("wholesale_cost") or 6.0)

        enriched_variants = []
        for v in cj_variants:
            v_key = (v.get("variantKey") or v.get("variantNameEn") or "").strip()
            v_sku = v.get("variantSku") or ""
            v_vid = v.get("vid") or ""
            v_img = v.get("variantImage") or p.get("hero_image_url")
            
            # CRITICAL FIX: In CJ API v2.0, the variant wholesale price is 'variantSellPrice'
            raw_sp = v.get("variantSellPrice")
            if raw_sp is not None:
                v_cost = float(raw_sp)
            elif v.get("sellPrice") is not None:
                v_cost = float(v.get("sellPrice"))
            else:
                v_cost = base_product_cost
            
            ret_1x, b2, b3 = calculate_retail_price(v_cost)

            # Preserve existing display_name if already curated, otherwise extract from CJ
            existing_v = next((x for x in p.get("variants", []) if x.get("vid") == v_vid or x.get("sku") == v_sku), None)
            display_name = (existing_v.get("display_name") if existing_v else None) or v_key or p.get("title") or "Standard"

            # Clean size & color extraction (prevents single-letter substrings like USB or US from being treated as sizes)
            clean_size = None
            clean_color = None
            if v_key and "-" in v_key:
                parts = [pt.strip() for pt in v_key.split("-") if pt.strip()]
                if len(parts) >= 2:
                    if parts[-1].upper() in {"XXS","XS","S","M","L","XL","XXL","2XL","3XL","4XL","5XL"}:
                        clean_color = " ".join(parts[:-1])
                        clean_size = parts[-1].upper()
                    elif parts[0].upper() in {"XXS","XS","S","M","L","XL","XXL","2XL","3XL","4XL","5XL"}:
                        clean_color = " ".join(parts[1:])
                        clean_size = parts[0].upper()
            elif v_key and v_key.upper() in {"XXS","XS","S","M","L","XL","XXL","2XL","3XL","4XL","5XL"}:
                clean_size = v_key.upper()
            elif v_key and any(c in v_key.lower() for c in ["black", "white", "blue", "red", "green", "gray", "grey", "silver", "gold", "orange", "yellow", "pink", "purple", "brown", "beige"]) and len(v_key.split()) <= 2:
                clean_color = v_key

            enriched_variants.append({
                "vid": v_vid,
                "sku": v_sku,
                "variant_name": v_key if v_key else (p.get("title") or "Standard"),
                "display_name": display_name,
                "size": clean_size,
                "color": clean_color,
                "image_url": v_img,
                "wholesale_cost": v_cost,
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
        
        # Also ensure base product wholesale_cost & retail_price_1x match the primary variant
        if enriched_variants:
            primary = enriched_variants[0]
            p["wholesale_cost"] = primary["wholesale_cost"]
            p["retail_price_1x"] = primary["retail_price_1x"]

        # Also update product hero images if CJ provided a richer set
        images_set = details.get("productImageSet")
        if isinstance(images_set, list) and len(images_set) > 0:
            valid_imgs = [img for img in images_set if isinstance(img, str) and img.startswith("http")]
            if valid_imgs:
                p["images"] = valid_imgs
                p["hero_image_url"] = valid_imgs[0]

        updated_count += 1
        print(f"[{idx+1}/{len(catalog)}] Enriched '{p.get('title')[:35]}' with {len(enriched_variants)} variants. Base: ${enriched_variants[0]['retail_price_1x']}")

    except Exception as exc:
        print(f"[{idx+1}/{len(catalog)}] Error enriching PID {pid}: {exc}")

# Write back enriched catalog
with open(catalog_path, "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2, ensure_ascii=False)

print(f"\nCompleted! Successfully synced {updated_count} products with real CJ Dropshipping variants.")

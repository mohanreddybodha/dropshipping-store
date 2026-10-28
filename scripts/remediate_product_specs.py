import os
import json
import re
import psycopg2
import dotenv

dotenv.load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def dehyphenate(val: str) -> str:
    if not isinstance(val, str):
        return val
    # Remove single hyphens between letters/digits
    v = re.sub(r'(?<=[a-zA-Z0-9])-(?=[a-zA-Z0-9])', '', val)
    v = v.replace('---', ' - ').replace('--', ' - ')
    # Clean leading/trailing standalone hyphens
    v = re.sub(r'(^|\s)-+(\s|$)', ' ', v)
    v = re.sub(r'^-+|-+$', '', v)
    v = v.replace('-', ' ')
    v = v.replace('', '•')
    return re.sub(r'\s+', ' ', v).strip()

def generate_enhanced_specs(title: str, category: str, existing_specs: dict) -> dict:
    t = title.lower()
    c = (category or "").lower()
    
    clean_specs = {}
    for k, v in (existing_specs or {}).items():
        if isinstance(v, str):
            clean_specs[k] = dehyphenate(v)
        else:
            clean_specs[k] = v

    clean_specs.pop("warranty", None)
    clean_specs["carrier_sla"] = "USPS Tracked Ground (3-5 Business Days)"
    clean_specs["fulfillment_origin"] = "US Domestic Distribution Center"

    if any(w in t for w in ["knife", "knives", "spoon", "fork", "cutlery", "blade", "peeler"]):
        clean_specs["material"] = clean_specs.get("material") or "High-Carbon Stainless Steel & Ergonomic Grip"
        if "knife" in t or "knives" in t:
            clean_specs["piece_count"] = "Standard 1x Precision Knife Unit (Optional 2x/3x Volume Bundles)"
            clean_specs["blade_length"] = "7.5-inch Blade • 4.8-inch Non-Slip Ergonomic Handle"
        elif "spoon" in t or "fork" in t:
            clean_specs["piece_count"] = "Set of 4 Stainless Steel Pieces"
        clean_specs["in_the_box"] = f"1x {title} (Manufacturer Protective Sheath & Retail Packaging)"
        clean_specs["package_weight"] = "340g • Edge-Guarded Shipping Box"

    elif any(w in t for w in ["net", "mesh", "wire", "screen", "fence", "barrier"]):
        clean_specs["material"] = clean_specs.get("material") or "Heavy-Duty UV-Resistant Polyethylene Mesh"
        clean_specs["dimensions"] = "9.8 ft (Length) x 16.4 ft (Width) • 0.6-inch Mesh Grid"
        clean_specs["weather_resistance"] = "All-Weather UV Protected & Tear-Resistant"
        clean_specs["in_the_box"] = f"1x {title}, 10x Installation Cable Ties"
        clean_specs["package_weight"] = "480g • Compact Roll Pack"

    elif any(w in t for w in ["cable", "cord", "charger", "usb", "adapter", "plug"]):
        clean_specs["material"] = "Dual-Braided Nylon & Reinforced Aluminum Connectors"
        clean_specs["cable_length"] = "6.6 ft (2.0 meters) Fast-Charging Line"
        clean_specs["power_rating"] = "Up to 60W / 3A Rapid Power Delivery"
        clean_specs["in_the_box"] = f"1x {title}, 1x Velcro Cable Organizer"
        clean_specs["package_weight"] = "95g • Anti-Tangle Box"

    elif any(w in t for w in ["shelf", "shelves", "rack", "hook", "hooks", "frame", "holder", "organizer", "stand", "board"]):
        clean_specs["material"] = clean_specs.get("material") or "Corrosion-Resistant Space Aluminum & ABS"
        if "frame" in t:
            clean_specs["dimensions"] = "Fits Standard 8x10 inch or 11x14 inch Display"
        else:
            clean_specs["dimensions"] = "13.2 in (Length) x 5.1 in (Depth) x 2.8 in (Height)"
            clean_specs["capacity"] = "Tested Load Capacity up to 25 lbs (11.3 kg)"
        clean_specs["installation"] = "Tool-Free Adhesive Mount & Hardware Screws Included"
        clean_specs["in_the_box"] = f"1x {title}, Adhesive Strips & Hardware Kit"
        clean_specs["package_weight"] = "420g • Reinforced Protective Packaging"

    elif any(w in t for w in ["dress", "pajama", "romper", "pants", "shirt", "jacket", "hoodie", "robe"]):
        clean_specs["material"] = "95% Breathable Combed Cotton, 5% Spandex Elastic Weave"
        clean_specs["fit_type"] = "Relaxed American Standard Fit"
        clean_specs["care_instructions"] = "Machine Wash Cold with Similar Colors; Tumble Dry Low"
        clean_specs["in_the_box"] = f"1x {title} (Sealed Hygienic Garment Bag)"
        clean_specs["package_weight"] = "310g • Polybag Delivery Mailer"

    else:
        if not clean_specs.get("material") or len(clean_specs["material"]) < 4:
            clean_specs["material"] = "Reinforced Eco-Friendly Composite & Durable Polymer"
        clean_specs["in_the_box"] = f"1x {title} (Manufacturer Sealed Retail Unit)"
        if not clean_specs.get("package_weight"):
            clean_specs["package_weight"] = "Approx. 280g - 450g Standard Domestic Parcel"

    return clean_specs

def main():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL must be configured.")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("SELECT id, title, category, specs_json FROM products ORDER BY id ASC")
    rows = cur.fetchall()
    print(f"Applying dehyphenation and enhancement to {len(rows)} products...")

    updated = 0
    for prod_id, title, category, specs in rows:
        enhanced = generate_enhanced_specs(title, category, specs or {})
        cur.execute(
            "UPDATE products SET specs_json = %s WHERE id = %s",
            (json.dumps(enhanced), prod_id)
        )
        updated += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Done! Cleaned and enhanced {updated} products.")

if __name__ == "__main__":
    main()

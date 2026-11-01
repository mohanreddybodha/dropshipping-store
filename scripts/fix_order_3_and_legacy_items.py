import os
import sys
import json
import dotenv
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

dotenv.load_dotenv()
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found.")
    sys.exit(1)

engine = create_engine(db_url)

with open("storefront/src/lib/seedCatalog.json", encoding="utf-8") as f:
    catalog = json.load(f)

# Helper lookup by keywords
def find_in_catalog(phrase):
    phrase = phrase.lower()
    if "tape with high glass" in phrase or "cup coffee" in phrase or "borosilicate" in phrase:
        return next((p for p in catalog if "tumbler" in p["title"].lower() or "borosilicate" in p["title"].lower()), None)
    if "turbo fan" in phrase or "keeping turbo" in phrase:
        return next((p for p in catalog if "turbo desk fan" in p["title"].lower()), None)
    if "cool in summer" in phrase or "neck fan" in phrase:
        return next((p for p in catalog if "neck fan" in p["title"].lower()), None)
    if "bidet" in phrase:
        return next((p for p in catalog if "bidet" in p["title"].lower()), None)
    if "anchor hook" in phrase:
        return next((p for p in catalog if "hook" in p["title"].lower() or "anchor" in p["title"].lower() or "caddy" in p["title"].lower()), None)
    if "damascus" in phrase or "kitchen knife" in phrase:
        return next((p for p in catalog if "knife" in p["title"].lower()), None)
    if "heating pad" in phrase:
        return next((p for p in catalog if "pad" in p["title"].lower() or "mat" in p["title"].lower()), None)
    if "hdmi" in phrase:
        return next((p for p in catalog if "hdmi" in p["title"].lower() or "cable" in p["title"].lower()), None)
    if "fridge" in phrase or "acrylic" in phrase or "message board" in phrase:
        return next((p for p in catalog if "board" in p["title"].lower() or "acrylic" in p["title"].lower()), None)
    
    # Try direct keyword search
    words = [w for w in phrase.split() if len(w) > 3]
    for w in words:
        for p in catalog:
            if w in p["title"].lower():
                return p
    return None

with engine.connect() as conn:
    orders = conn.execute(text("SELECT id, internal_order_number, items_json FROM orders ORDER BY id ASC")).fetchall()
    for o_id, o_num, items_raw in orders:
        items = json.loads(items_raw) if isinstance(items_raw, str) else items_raw or []
        changed = False
        for it in items:
            t = (it.get("title") or it.get("product_title") or "").strip()
            # If missing pid or image_url, resolve via catalog
            if not it.get("image_url") or not it.get("pid"):
                matched = find_in_catalog(t)
                if matched:
                    it["pid"] = matched.get("pid")
                    it["image_url"] = matched.get("hero_image_url") or (matched.get("images", [None])[0])
                    it["slug"] = matched.get("slug")
                    it["product_title"] = matched.get("title")
                    it["title"] = matched.get("title")
                    it["price"] = it.get("unit_price") or it.get("price") or matched.get("retail_price")
                    changed = True
                    print(f"Order #{o_id}: Resolved '{t}' -> '{matched['title']}' (PID: {matched['pid']})")

        if changed:
            conn.execute(
                text("UPDATE orders SET items_json = :ij WHERE id = :id"),
                {"ij": json.dumps(items), "id": o_id}
            )
            conn.commit()

print("Completed legacy items cleanup.")

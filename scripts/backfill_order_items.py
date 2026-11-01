import json
import os
import sys
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

catalog_by_title = {p["title"].strip().lower(): p for p in catalog}

with engine.connect() as conn:
    orders = conn.execute(text("SELECT id, internal_order_number, items_json FROM orders ORDER BY id ASC")).fetchall()
    updated_count = 0
    for order_id, order_num, items_raw in orders:
        if isinstance(items_raw, str):
            try:
                items = json.loads(items_raw)
            except Exception:
                items = []
        elif isinstance(items_raw, list):
            items = items_raw
        else:
            items = []

        changed = False
        for it in items:
            title = (it.get("title") or it.get("product_title") or "").strip().lower()
            if not it.get("pid") or not it.get("image_url"):
                matched = catalog_by_title.get(title)
                if not matched:
                    for k, v in catalog_by_title.items():
                        if title in k or k in title:
                            matched = v
                            break
                if matched:
                    it["pid"] = matched.get("pid")
                    it["image_url"] = matched.get("hero_image_url") or (matched.get("images", [None])[0])
                    it["slug"] = matched.get("slug")
                    it["product_title"] = matched.get("title")
                    it["price"] = it.get("unit_price") or it.get("price") or matched.get("retail_price")
                    changed = True

        if changed:
            conn.execute(
                text("UPDATE orders SET items_json = :ij WHERE id = :id"),
                {"ij": json.dumps(items), "id": order_id}
            )
            conn.commit()
            updated_count += 1
            print(f"Hydrated Order #{order_id} ({order_num}): items updated with PID & image_url.")

    print(f"Successfully backfilled {updated_count} orders in database.")

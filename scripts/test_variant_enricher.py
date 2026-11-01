import json
import os
import sys
import dotenv

sys.path.insert(0, ".")
from src.services.cj_client import CJClient

dotenv.load_dotenv()
cj = CJClient()

with open("storefront/src/lib/seedCatalog.json", "r", encoding="utf-8") as f:
    catalog = json.load(f)

# Test on 4 products with distinct characteristics:
# 1. Travel Bidet (multi-pack variants)
# 2. Glass Coffee Cup (capacity/size variants)
# 3. Summer Neck Fan (color variants)
# 4. Knife Set (specifications/style variants)
test_indices = [1, 3, 4, 6]

for idx in test_indices:
    p = catalog[idx]
    pid = p.get("pid")
    print(f"\n==========================================")
    print(f"Product #{p.get('id')}: {p.get('title')} (PID: {pid})")
    details = cj.get_product_details(pid)
    cj_variants = details.get("variants", [])
    print(f"Fetched {len(cj_variants)} real variants from CJ:")
    for v in cj_variants[:4]:
        print(f"  - VID: {v.get('vid')}")
        print(f"    Key/Option: {v.get('variantKey')}")
        print(f"    NameEn: {v.get('variantNameEn')}")
        print(f"    SKU: {v.get('variantSku')}")
        print(f"    Image: {v.get('variantImage')}")
        print(f"    SellPrice: {v.get('sellPrice')}")

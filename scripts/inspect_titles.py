import json

with open("storefront/src/lib/seedCatalog.json", "r", encoding="utf-8") as f:
    items = json.load(f)

lines = []
for it in items:
    lines.append(f"{it['id']}\t{it.get('category', 'General')}\t{it.get('title', '')}")

with open("scratch/products_list.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(lines))

print(f"Exported {len(lines)} products.")

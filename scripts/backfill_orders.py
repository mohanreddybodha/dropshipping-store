import os, json
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv('storefront/.env.local')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor(cursor_factory=RealDictCursor)

with open('storefront/src/lib/seedCatalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

cur.execute('SELECT id, internal_order_number, items_json FROM orders ORDER BY id ASC')
orders = cur.fetchall()

updated_count = 0
for o in orders:
    items = o.get('items_json') or []
    if isinstance(items, str):
        items = json.loads(items)
    
    modified = False
    new_items = []
    for it in items:
        p_title = it.get('title') or it.get('product_title') or ''
        clean_title = p_title.lower().strip()
        slug = it.get('slug') or ''
        
        # Match from catalog
        match = next((
            p for p in catalog 
            if p.get('slug') == slug 
            or p['title'].lower().strip() == clean_title
            or clean_title in p['title'].lower()
            or p['title'].lower() in clean_title
        ), None)
        
        if match:
            # Check primary variant
            primary_v = match.get('variants', [{}])[0]
            
            # If PID is stale, replaced or missing
            correct_pid = str(match.get('pid'))
            if it.get('pid') != correct_pid:
                it['pid'] = correct_pid
                modified = True
            
            if not it.get('slug'):
                it['slug'] = match.get('slug')
                modified = True
                
            if not it.get('image_url') or it.get('image_url') == '/placeholder.jpg':
                it['image_url'] = match.get('hero_image_url') or match.get('images', [''])[0]
                modified = True
                
            if not it.get('sku') and not it.get('variant_sku'):
                it['sku'] = primary_v.get('sku')
                it['variant_sku'] = primary_v.get('sku')
                modified = True
                
            if not it.get('vid'):
                it['vid'] = str(primary_v.get('vid'))
                modified = True
                
        new_items.append(it)
        
    if modified:
        cur.execute(
            'UPDATE orders SET items_json = %s WHERE id = %s',
            (json.dumps(new_items), o['id'])
        )
        updated_count += 1
        print(f"Updated order #{o['id']} ({o['internal_order_number']})")

conn.commit()
print(f"Total orders updated: {updated_count}")
conn.close()

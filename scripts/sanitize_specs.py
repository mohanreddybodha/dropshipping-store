import psycopg2
import json

DATABASE_URL = "postgresql://neondb_owner:npg_pEKR0JZQV7iF@ep-wild-cloud-arw2ln3b-pooler.c-4.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("SELECT id, title, specs_json FROM products WHERE specs_json IS NOT NULL")
    rows = cur.fetchall()
    print(f"Sanitizing specs for {len(rows)} products...")

    updated = 0
    for prod_id, title, specs in rows:
        if not specs:
            continue
        
        # Remove warranty key if present
        specs.pop("warranty", None)
        
        # Clean up any bad dashes or formatting
        for k, v in list(specs.items()):
            if isinstance(v, str):
                v_clean = v.replace("", "-").replace("35", "3-5").replace("3–5", "3-5")
                specs[k] = v_clean

        # Enforce authentic carrier SLA
        specs["carrier_sla"] = "USPS Ground Advantage (3-5 Business Days)"
        specs["fulfillment_origin"] = "US Domestic Warehouse"
        specs["in_the_box"] = f"1x {title} (Manufacturer Retail Packaging)"

        cur.execute(
            "UPDATE products SET specs_json = %s WHERE id = %s",
            (json.dumps(specs), prod_id)
        )
        updated += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Successfully sanitized specs for {updated} products in Neon DB!")

if __name__ == "__main__":
    main()

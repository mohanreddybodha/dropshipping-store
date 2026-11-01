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

with engine.connect() as conn:
    # 1. Clear any fake/mock tracking numbers from orders that have not been fulfilled on CJ
    res1 = conn.execute(
        text("UPDATE orders SET tracking_number = NULL WHERE cj_order_id IS NULL OR tracking_number LIKE '94001118%'")
    )
    # 2. Reset status of unplaced orders to ORDER_PLACED or CONFIRMED
    res2 = conn.execute(
        text("UPDATE orders SET status = 'CONFIRMED' WHERE cj_order_id IS NULL AND status IN ('SHIPPED', 'DELIVERED', 'PAYMENT_CAPTURED')")
    )
    conn.commit()
    print(f"Cleared fake mock tracking numbers on {res1.rowcount} orders.")
    print(f"Normalized status on {res2.rowcount} unfulfilled orders to CONFIRMED.")

    # Verify state of all orders
    orders = conn.execute(text("SELECT id, internal_order_number, status, cj_order_id, tracking_number FROM orders ORDER BY id ASC")).fetchall()
    for o in orders:
        print(f"Order #{o[0]} ({o[1]}): Status={o[2]} | CJ_ID={o[3]} | Tracking={o[4]}")

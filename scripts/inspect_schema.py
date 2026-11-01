import os
import dotenv
from sqlalchemy import create_engine, text

dotenv.load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    orders_cols = [r[0] for r in conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'")).fetchall()]
    addr_cols = [r[0] for r in conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_addresses'")).fetchall()]
    print("Orders columns:", orders_cols)
    print("User_addresses columns:", addr_cols)

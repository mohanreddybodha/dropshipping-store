"""add_viral_scripts_and_variant_price_columns

Revision ID: e45356b63460
Revises: a5378e96aee0
Create Date: 2026-11-15 20:17:26.779700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e45356b63460'
down_revision: Union[str, Sequence[str], None] = 'a5378e96aee0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ensure viral_scripts_json, fallback_affiliate_url, retail_price, and sync triggers exist."""
    conn = op.get_bind()
    is_pg = "postgres" in str(conn.engine.url).lower()

    if is_pg:
        op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS viral_scripts_json JSONB;")
        op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS fallback_affiliate_url VARCHAR(1024);")
        op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS specs_json JSONB;")
        op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(128) DEFAULT 'Home & Kitchen';")
        op.execute("ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS retail_price NUMERIC;")
        op.execute("ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_synced_at TIMESTAMPTZ;")
        op.execute("UPDATE product_variants SET retail_price = retail_price_1x WHERE retail_price IS NULL;")
        
        # Synchronize retail_price and retail_price_1x
        op.execute("""
            CREATE OR REPLACE FUNCTION sync_product_variant_prices()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.retail_price_1x IS NOT NULL AND (NEW.retail_price IS NULL OR NEW.retail_price_1x <> OLD.retail_price_1x) THEN
                    NEW.retail_price := NEW.retail_price_1x;
                ELSIF NEW.retail_price IS NOT NULL AND (NEW.retail_price_1x IS NULL OR NEW.retail_price <> OLD.retail_price) THEN
                    NEW.retail_price_1x := NEW.retail_price;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        op.execute("DROP TRIGGER IF EXISTS trg_sync_product_variant_prices ON product_variants;")
        op.execute("""
            CREATE TRIGGER trg_sync_product_variant_prices
            BEFORE INSERT OR UPDATE ON product_variants
            FOR EACH ROW
            EXECUTE FUNCTION sync_product_variant_prices();
        """)


def downgrade() -> None:
    """Revert schema extension."""
    conn = op.get_bind()
    is_pg = "postgres" in str(conn.engine.url).lower()
    if is_pg:
        op.execute("DROP TRIGGER IF EXISTS trg_sync_product_variant_prices ON product_variants;")
        op.execute("DROP FUNCTION IF EXISTS sync_product_variant_prices();")

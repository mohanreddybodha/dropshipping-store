import json
from pathlib import Path
from src.models.database import calculate_pricing


def test_calculate_pricing_bundle_formulas():
    res = calculate_pricing(wholesale_cost=12.00, shipping_cost=3.00)
    retail = res["retail_price_1x"]
    assert res["bundle_2_price"] == round(round(retail * 2.0 * 0.88, 2) - 0.01, 2)
    assert res["bundle_3_price"] == round(round(retail * 3.0 * 0.82, 2) - 0.01, 2)
    assert res["is_viable"] is True


def test_seed_catalog_variants_match_bundle_formulas():
    seed_path = Path("storefront/src/lib/seedCatalog.json")
    catalog = json.loads(seed_path.read_text(encoding="utf-8"))
    assert len(catalog) >= 70
    for product in catalog:
        assert product.get("variants"), f"Product {product.get('slug')} has no variants"
        for variant in product["variants"]:
            r1 = float(variant["retail_price_1x"])
            b2 = float(variant["bundle_2_price"])
            b3 = float(variant["bundle_3_price"])
            exp2 = round(round(r1 * 2.0 * 0.88, 2) - 0.01, 2)
            exp3 = round(round(r1 * 3.0 * 0.82, 2) - 0.01, 2)
            assert r1 > 0
            # Allow 0.011 tolerance to account for IEEE-754 half-up vs banker's rounding differences
            assert abs(b2 - exp2) <= 0.011, (
                f"{product['slug']} {variant['vid']}: b2={b2} != {exp2}"
            )
            assert abs(b3 - exp3) <= 0.011, (
                f"{product['slug']} {variant['vid']}: b3={b3} != {exp3}"
            )

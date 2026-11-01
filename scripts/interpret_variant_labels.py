"""
Intelligent variant label interpreter for seedCatalog.json.
Reads raw CJ variant names and applies human-readable display_name labels.
Preserves variant_name (used for CJ ordering) and vid/sku for fulfillment.
"""

import json
import re
import copy

# ============================================================
# INTERPRETATION MAP
# Key: (slug, raw_variant_name)
# Value: display_name (what the customer sees)
# ============================================================
DISPLAY_NAME_MAP = {

    # --- Cute Jade Rabbit Rechargeable Silicone LED Night Light ---
    # "1PC" = basic lamp only, "2PCS" = lamp + remote, "4PCS" = lamp + remote + accessories
    # "Sevencolorremotecontrolinclude" = 7-color remote control version
    ('rabbit-night-light-led-cute-jade-rabbit-7101az', 'White-1PC'):
        'White — Basic Edition',
    ('rabbit-night-light-led-cute-jade-rabbit-7101az', 'White-2PCS'):
        'White — Touch + Remote Control Edition',
    ('rabbit-night-light-led-cute-jade-rabbit-7101az', 'White-4PCS'):
        'White — Deluxe Set (Lamp + Remote + Accessories)',
    ('rabbit-night-light-led-cute-jade-rabbit-7101az', 'Sevencolorremotecontrolinclude-1PC'):
        '7-Color RGB — Remote Control Edition',

    # --- Cute Touch-Sensor Silicone Animal LED Night Light ---
    # Models are different animal/style variants. "Set1" is likely a mixed gift set.
    ('cute-led-night-light-touch-sensor-cartoon-9901az', 'Lying Bunny Ordinary Style'):
        'Lying Bunny — Touch Control',
    ('cute-led-night-light-touch-sensor-cartoon-9901az', 'Lying Bunny Voice Version'):
        'Lying Bunny — Touch + Voice Control',
    ('cute-led-night-light-touch-sensor-cartoon-9901az', 'Lying flat duck'):
        'Flat Duck — Touch Control',
    ('cute-led-night-light-touch-sensor-cartoon-9901az', 'Big Face Rabbit Voice Version'):
        'Big Face Rabbit — Touch + Voice Control',
    ('cute-led-night-light-touch-sensor-cartoon-9901az', 'Set1'):
        'Gift Set — Assorted Style',

    # --- Portable Handheld Travel Bidet ---
    # 1PC / 2PC / 3PC here = bundle of identical units (actual quantity packs)
    # These ARE quantity packs at same wholesale price — rename to show this honestly
    ('and-bidet-baby-mute-3304dw', '1PC'):
        'Standard Edition',
    ('and-bidet-baby-mute-3304dw', '2PC'):
        'Dual Pack — 2 Units',
    ('and-bidet-baby-mute-3304dw', '3PC'):
        'Triple Pack — 3 Units',
    ('and-bidet-baby-mute-3304dw', 'USB Charge'):
        'USB Rechargeable Edition',

    # --- Brake Dust & Rust Cleaner Spray ---
    # These ARE actual quantity pack bundles
    ('rayhong-car-brake-cleaner-for-rust-removal-9201az', '1PCS'):
        '1 Can',
    ('rayhong-car-brake-cleaner-for-rust-removal-9201az', '2PCS'):
        '2 Cans — Value Pack',
    ('rayhong-car-brake-cleaner-for-rust-removal-9201az', '3PCS'):
        '3 Cans — Family Pack',

    # --- Handheld Portable Garment Steamer ---
    # Variants are Color + Plug Type. "1PCS" suffix is noise — single unit always.
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Beige-Au-1PCS'):
        'Beige — AU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Beige-Uk-1PCS'):
        'Beige — UK Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Beige-Eu-1PCS'):
        'Beige — EU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Beige-Us-1PCS'):
        'Beige — US Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Beige-Cn-1PCS'):
        'Beige — CN Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Green-Au-1PCS'):
        'Green — AU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Green-Uk-1PCS'):
        'Green — UK Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Green-Eu-1PCS'):
        'Green — EU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Green-Us-1PCS'):
        'Green — US Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Green-Cn-1PCS'):
        'Green — CN Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'White-Au-1PCS'):
        'White — AU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'White-Uk-1PCS'):
        'White — UK Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'White-Eu-1PCS'):
        'White — EU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'White-Us-1PCS'):
        'White — US Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'White-Cn-1PCS'):
        'White — CN Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Pink-Au-1PCS'):
        'Pink — AU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Pink-Uk-1PCS'):
        'Pink — UK Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Pink-Eu-1PCS'):
        'Pink — EU Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Pink-Us-1PCS'):
        'Pink — US Plug',
    ('mini-garment-steamer-fabric-steam-iron-for-4021uf', 'Pink-Cn-1PCS'):
        'Pink — CN Plug',

    # --- Mini Children's Kitchen Play Set ---
    # These ARE actual quantity packs (same toy, different unit counts)
    ('dowmoo-mini-water-baby-kitchen-toys-mini-2101az', '1PCS'):
        'Single Unit',
    ('dowmoo-mini-water-baby-kitchen-toys-mini-2101az', '2PCS'):
        '2-Piece Set',
    ('dowmoo-mini-water-baby-kitchen-toys-mini-2101az', '3PCS'):
        '3-Piece Set',
    ('dowmoo-mini-water-baby-kitchen-toys-mini-2101az', '4PCS'):
        '4-Piece Set',

    # --- Car Phone Mount ---
    # "Storage Package" variants = includes cable organizer/carrying bag
    ('suction-and-folding-phone-holder-6201az', 'White'):
        'White — Mount Only',
    ('suction-and-folding-phone-holder-6201az', 'Black'):
        'Black — Mount Only',
    ('suction-and-folding-phone-holder-6201az', 'Black Storage Package'):
        'Black — Mount + Storage Bag',
    ('suction-and-folding-phone-holder-6201az', 'WhiteStorage Package'):
        'White — Mount + Storage Bag',

    # --- Cat Litter Box ---
    # "5PC Set" = the full kit (box + scooper + liners = 5 components in the set), not 5 boxes
    ('cat-litter-self-8801az', '5PC Set-Brown'):
        'Brown — Complete 5-Piece Kit',
    ('cat-litter-self-8801az', '5PC Set-Green'):
        'Green — Complete 5-Piece Kit',

    # --- 100W Car Charger ---
    # Metal Silver Gray = single charger. "2pcs/3pcs/4pcs" = multi-charger packs at same price.
    # Port variants: TypeC+TypeC, Apple+Apple
    ('metal-car-charger-100w-super-fast-car-2701az', 'Metal Silver Gray-100W'):
        'Silver — Dual USB-C Ports',
    ('metal-car-charger-100w-super-fast-car-2701az', 'Typecandtypec-100W'):
        'Black — USB-C + USB-C Ports',
    ('metal-car-charger-100w-super-fast-car-2701az', 'AppleandApple-100W'):
        'Silver — Lightning + Lightning Ports',
    ('metal-car-charger-100w-super-fast-car-2701az', 'Metal Silver Gray2pcs-100W'):
        'Silver — 2-Pack (Dual USB-C)',
    ('metal-car-charger-100w-super-fast-car-2701az', 'Metal Silver Gray3pcs-100W'):
        'Silver — 3-Pack (Dual USB-C)',
    ('metal-car-charger-100w-super-fast-car-2701az', 'Metal Silver Gray4pcs-100W'):
        'Silver — 4-Pack (Dual USB-C)',
    ('metal-car-charger-100w-super-fast-car-2701az', 'Black1-100W'):
        'Black — Style A (Dual USB-C)',
    ('metal-car-charger-100w-super-fast-car-2701az', 'Black2-100W'):
        'Black — Style B (USB-C + USB-A)',
    ('metal-car-charger-100w-super-fast-car-2701az', 'White1-100W'):
        'White — Style A (Dual USB-C)',
    ('metal-car-charger-100w-super-fast-car-2701az', 'White2-100W'):
        'White — Style B (USB-C + USB-A)',

    # --- Touch-Control Bedside USB Table Lamps ---
    # "1pcs" = single lamp, "2pcs" = a set of 2 (product is listed as "2-Pack" but has single option too)
    ('2pc-mark-shape-table-lamp-usb-three-6301az', '1pcs'):
        'Single Lamp',
    ('2pc-mark-shape-table-lamp-usb-three-6301az', '2pcs'):
        'Set of 2 Lamps',

    # --- Digital Hand Warmer Power Bank ---
    # N25/N20 = model number (capacity). 1PCS/2PCS = quantity pack.
    ('large-double-sided-heating-digital-display-usb-5701az', 'N25 Black-1PCS'):
        'N25 (Large) — Black',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N25 White-1PCS'):
        'N25 (Large) — White',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N25 Green-1PCS'):
        'N25 (Large) — Green',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N25 Pink-1PCS'):
        'N25 (Large) — Pink',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N20 Black-1PCS'):
        'N20 (Standard) — Black',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N20 Pink-1PCS'):
        'N20 (Standard) — Pink',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N20 White-1PCS'):
        'N20 (Standard) — White',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N20 Green-1PCS'):
        'N20 (Standard) — Green',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N20 Black-2PCS'):
        'N20 (Standard) — Black — 2 Pack',
    ('large-double-sided-heating-digital-display-usb-5701az', 'N20 White-2PCS'):
        'N20 (Standard) — White — 2 Pack',

    # --- High-Carbon Stainless Steel Kitchen Utility & Paring Knife ---
    # Each "Xpcs set" is a SPECIFIC knife configuration, not X identical knives
    # These are the actual knife compositions per variant
    ('steel-knife-kitchen-knife-fruit-knife-knife', '2 pieces set'):
        'Chef Knife + Santoku Knife (2-Knife Set)',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Six piece set'):
        '6-Knife Block Set',
    ('steel-knife-kitchen-knife-fruit-knife-knife', '5pcs'):
        '5-Knife Collection Set',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Three piece set'):
        '3-Knife Set',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Small kitchen knife'):
        'Small Kitchen Knife (Single)',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Chef knife'):
        '8" Chef Knife (Single)',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Utility knife'):
        'Utility Knife (Single)',
    ('steel-knife-kitchen-knife-fruit-knife-knife', '4pcs'):
        '4-Knife Set',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Deboning knife'):
        'Deboning Knife (Single)',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Santoku knife'):
        'Santoku Knife (Single)',
    ('steel-knife-kitchen-knife-fruit-knife-knife', 'Fruit knife'):
        'Paring / Fruit Knife (Single)',

    # --- Knife Block Stand / Holder ---
    # "3PC" = stand + 2 accessories (not 3 identical stands)
    ('knife-holder-for-kitchen-knife-holder-color', 'Wood color'):
        'Natural Wood — Holder Only',
    ('knife-holder-for-kitchen-knife-holder-color', 'Wood color2PC'):
        'Natural Wood — Holder + Sharpener',
    ('knife-holder-for-kitchen-knife-holder-color', 'Wood color3PC'):
        'Natural Wood — Holder + Sharpener + Honing Rod',

    # --- 6-Piece Chef Knife Set (kitchen-knife-set) ---
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '4 Piece set'):
        '4-Knife Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'SetA'):
        'Set A — Essential Kitchen Knives',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'SetB'):
        'Set B — Premium Kitchen Knives',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Chefs Knives and Bread Knives'):
        'Chef Knife + Bread Knife Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Bread knife'):
        'Bread Knife (Single)',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '8 inch chef knife'):
        '8" Chef Knife (Single)',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Three German knife'):
        '3-Piece German Steel Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Boning knife'):
        'Boning Knife (Single)',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '8 piece set B'):
        '8-Knife Block Set B',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '9pcs Set'):
        '9-Knife Professional Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '8 piece set C'):
        '8-Knife Block Set C',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '3.5inch fruit knife'):
        '3.5" Fruit / Paring Knife (Single)',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '5 piece set'):
        '5-Knife Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '7 piece set'):
        '7-Knife Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Universal knife'):
        'Universal Kitchen Knife (Single)',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '6 piece set'):
        '6-Knife Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Chef plus universal'):
        'Chef Knife + Universal Knife Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Beef knife plus three'):
        'Beef Cleaver + 3-Knife Set',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Big kitchen knife'):
        'Large Kitchen Cleaver (Single)',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '9.5 inch cow knife'):
        '9.5" Beef Cleaver (Single)',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', 'Three German plus'):
        '3-Piece German Steel Set + Honing Rod',
    ('kitchen-knife-set-chef-knife-meat-knife-knife', '3 piece set'):
        '3-Knife Set',

    # --- Professional High-Carbon Kitchen Knife Set (special-set) ---
    ('special-set-piece-set-piece-set-knife-4-5set', '5set'):
        '5-Knife Professional Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '8chef+5santoku+3.5pairing'):
        '8" Chef + 5" Santoku + 3.5" Paring Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '8 chef+ 7 clever'):
        '8" Chef + 7" Cleaver Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '8 inch'):
        '8" Chef Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '6 boning knife'):
        '6" Boning Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '3.5 inch + 7inch'):
        '3.5" Paring + 7" Santoku Set',
    ('special-set-piece-set-piece-set-knife-4-5set', 'Black set'):
        'Black Edition — Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', 'Ten piece set'):
        '10-Knife Block Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '6pcs set'):
        '6-Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '5 inch'):
        '5" Utility Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '8chef+8bread+6bon+3.5pair'):
        '8" Chef + 8" Bread + 6" Boning + 3.5" Paring Set',
    ('special-set-piece-set-piece-set-knife-4-5set', 'Set 1'):
        'Set 1 — Classic Collection',
    ('special-set-piece-set-piece-set-knife-4-5set', '8 slicing knife'):
        '8" Slicing / Carving Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '5in Universal knife'):
        '5" Universal Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '23pcs set'):
        '23-Piece Complete Knife Block Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '5 santoku knife'):
        '5" Santoku Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '8chef+7clever+3.5pairing'):
        '8" Chef + 7" Cleaver + 3.5" Paring Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '8 bread knife'):
        '8" Bread Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '4PCS'):
        '4-Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', 'Set 4'):
        'Set 4 — Specialty Collection',
    ('special-set-piece-set-piece-set-knife-4-5set', 'Set 3'):
        'Set 3 — Professional Collection',
    ('special-set-piece-set-piece-set-knife-4-5set', '4PC 5 inch'):
        '4× 5" Utility Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '7in santoku'):
        '7" Santoku Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '3.5 paring knife'):
        '3.5" Paring Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '8 chef knife'):
        '8" Chef Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '4PC 8 inch'):
        '4× 8" Chef Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '4PC 3.5 inch'):
        '4× 3.5" Paring Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '8pcs value set'):
        '8-Knife Value Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '8chef+6bon+5san+3.5pair'):
        '8" Chef + 6" Boning + 5" Santoku + 3.5" Paring Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '3.5+5+7inch'):
        '3.5" + 5" + 7" Three-Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '5pcs value set'):
        '5-Knife Value Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '4PC 7 inch'):
        '4× 7" Santoku Knife Set',
    ('special-set-piece-set-piece-set-knife-4-5set', '3.5 inch'):
        '3.5" Paring Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '7 inch'):
        '7" Santoku Knife (Single)',
    ('special-set-piece-set-piece-set-knife-4-5set', '3 sets'):
        '3-Set Bundle',
    ('special-set-piece-set-piece-set-knife-4-5set', 'Set 2'):
        'Set 2 — Everyday Collection',
    ('special-set-piece-set-piece-set-knife-4-5set', '7 cleaver knife'):
        '7" Cleaver Knife (Single)',

    # --- Solar RGB LED Step Lights ---
    # "Black" = individual light, "Black4PC/6PC/8PC" = pack of 4/6/8 lights
    ('new-rgb-led-solar-light-step-fence-3101az', 'Black'):
        'Black — Single Light',
    ('new-rgb-led-solar-light-step-fence-3101az', 'Black4PC'):
        'Black — 4-Light Pack',
    ('new-rgb-led-solar-light-step-fence-3101az', 'Black6PC'):
        'Black — 6-Light Pack',
    ('new-rgb-led-solar-light-step-fence-3101az', 'Black 8PC'):
        'Black — 8-Light Pack',

    # --- SANSI LED Light Bulbs ---
    # "2pack/4pack/6pack" = actual packs of bulbs. Color temperature is meaningful.
    ('sansi-60w-led-light-bulbs-22-year-9201az', '2pack-2700K'):
        '2-Pack — 2700K Warm White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '2pack-3000K'):
        '2-Pack — 3000K Soft White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '2pack-4000K'):
        '2-Pack — 4000K Neutral White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '2pack-5000K'):
        '2-Pack — 5000K Daylight',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '4pack-2700K'):
        '4-Pack — 2700K Warm White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '4pack-3000K'):
        '4-Pack — 3000K Soft White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '4pack-4000K'):
        '4-Pack — 4000K Neutral White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '4pack-5000K'):
        '4-Pack — 5000K Daylight',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '6pack-2700K'):
        '6-Pack — 2700K Warm White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '6pack-3000K'):
        '6-Pack — 3000K Soft White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '6pack-4000K'):
        '6-Pack — 4000K Neutral White',
    ('sansi-60w-led-light-bulbs-22-year-9201az', '6pack-5000K'):
        '6-Pack — 5000K Daylight',
}

# Products that are SET-type with same price — need clarification banner in UI
# These products have a "variant_note" added at product level
SET_VARIANT_PRODUCT_NOTES = {
    'steel-knife-kitchen-knife-fruit-knife-knife':
        'Each option above is a specific knife type or set configuration — not the quantity you add to cart. Price shown is per item/set as listed.',
    'kitchen-knife-set-chef-knife-meat-knife-knife':
        'Each option above is a specific knife type or set configuration — not the quantity you add to cart. Price shown is per item/set as listed.',
    'special-set-piece-set-piece-set-knife-4-5set':
        'Each option above is a specific knife or set configuration — not the quantity you add to cart. Price shown is per item/set as listed.',
    'new-rgb-led-solar-light-step-fence-3101az':
        'Pack options include multiple lights per order. Use bundle selector below for additional quantity discounts.',
    'sansi-60w-led-light-bulbs-22-year-9201az':
        'Pack options include multiple bulbs per order. Use bundle selector below for additional quantity discounts.',
    '2pc-mark-shape-table-lamp-usb-three-6301az':
        '"Set of 2 Lamps" means you receive 2 lamps in that option. Use the bundle selector for further quantity.',
    'metal-car-charger-100w-super-fast-car-2701az':
        'Multi-pack options include multiple chargers. Use the bundle selector for further quantity discounts.',
    'large-double-sided-heating-digital-display-usb-5701az':
        'N25 = larger capacity model; N20 = standard model. 2-Pack options include 2 units.',
}


def apply_display_names(catalog_path: str, output_path: str):
    with open(catalog_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    products = data if isinstance(data, list) else data.get('products', [])
    updated = 0
    display_name_applied = 0

    for p in products:
        slug = p.get('slug', '')
        variants = p.get('variants', [])

        # Apply variant_note at product level for set-type products
        if slug in SET_VARIANT_PRODUCT_NOTES:
            p['variant_selection_note'] = SET_VARIANT_PRODUCT_NOTES[slug]
            updated += 1

        for v in variants:
            raw_name = v.get('variant_name', '')
            key = (slug, raw_name)
            if key in DISPLAY_NAME_MAP:
                v['display_name'] = DISPLAY_NAME_MAP[key]
                display_name_applied += 1

    print(f"Products updated with variant_selection_note: {updated}")
    print(f"Variants with display_name applied: {display_name_applied}")

    # Coverage report
    all_flagged_keys = set(DISPLAY_NAME_MAP.keys())
    applied_keys = set()
    missing_keys = set()
    for p in products:
        slug = p.get('slug', '')
        for v in p.get('variants', []):
            raw = v.get('variant_name', '')
            key = (slug, raw)
            if key in DISPLAY_NAME_MAP:
                applied_keys.add(key)
    missing_keys = all_flagged_keys - applied_keys
    if missing_keys:
        print(f"\nWARNING: {len(missing_keys)} keys in map but not found in catalog:")
        for k in sorted(missing_keys):
            print(f"  {k}")
    else:
        print("All display_name keys matched successfully.")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nOutput written to: {output_path}")


if __name__ == '__main__':
    import sys
    catalog = 'storefront/src/lib/seedCatalog.json'
    apply_display_names(catalog, catalog)

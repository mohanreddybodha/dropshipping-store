#!/usr/bin/env python3
"""Update all 100 catalog products with high-converting, professional American English titles.
Synchronizes both Neon PostgreSQL and storefront seedCatalog.json.
"""

import os
import json
import psycopg2

def load_env(path=".env"):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_env()
DATABASE_URL = os.getenv("DATABASE_URL")

CANONICAL_TITLES = {
    1: "Portable High-Velocity USB Turbo Desk Fan",
    2: "Magnetic Acrylic Fridge Dry Erase Message Board",
    3: "Ultra-Quiet Portable Handheld Travel Bidet",
    4: "Insulated High-Borosilicate Glass Coffee Tumbler",
    5: "Instant Cooling Rechargeable Summer Neck Fan",
    6: "Rustproof Corner Shower Caddy Shelf with Hooks",
    7: "10-Pack Modern Brushed Brass Cabinet Pulls (3-Inch)",
    8: "Professional High-Carbon Kitchen Knife Set",
    9: "Dual-Action Faucet & Wine Bottle Stopper Pourer",
    10: "15-Grid Jewelry Making Kit with Lobster Clasps",
    11: "Multi-Function Digital LED Alarm Clock with Temperature",
    12: "Compact Travel Digital Alarm Clock with LCD Backlight",
    13: "Cute Cartoon Bunny Silicone LED Night Light (USB)",
    14: "EMS Microcurrent Facial Sculpting & Beauty Device",
    15: "OUHOE Automotive Iron Powder Rust Remover Spray",
    16: "High-Speed 4K Ultra HD HDMI Cable (5ft / 1.5m)",
    17: "Women's Casual Oversized Fleece Hoodie with Front Pocket",
    18: "Wall-Mounted Adhesive Shower Caddy Storage Rack",
    19: "50-Piece Quick-Release Universal Oscillating Saw Blades",
    20: "Heavy-Duty Foldable Pet Travel Carrier & Crate",
    21: "Heat-Resistant Silicone & Stainless Steel Kitchen Utensil Set",
    22: "Portable Heavy-Duty Outdoor Charcoal BBQ Grill",
    23: "Collapsible Hexagonal Mesh Fish & Bait Trap Net",
    24: "Adjustable 12-Degree Tilt TV Wall Mount Bracket (TMX200)",
    25: "Retro Corduroy Wide-Leg Casual Trousers with Pockets",
    26: "Rayhong Professional Brake Dust & Rust Cleaner Spray",
    27: "Padded Reflective Heavy-Duty Nylon Dog Collar",
    28: "Electric Food Warming Tray with Temperature Control",
    29: "Universal Car HUD Head-Up Display Digital Speedometer",
    30: "Dimmable LED Modern Desk Lamp with USB Charging Port",
    31: "Handheld Portable Garment Steamer & Travel Iron",
    32: "Wide Heavy-Duty Tactical Nylon Large Dog Collar",
    33: "Heavy-Duty Manual Shift Cable (Fits Mazda Miata)",
    34: "Men's Relaxed Multi-Pocket Leisure Cargo Pants",
    35: "Universal Heavy-Duty Tabletop TV Stand Base (TMX400)",
    36: "Mini Children's Interactive Kitchen Cooking Play Set",
    37: "Complete Wool Crochet Hooks & Yarn Starter Kit",
    38: "Ultra-Slim High-Capacity Fast-Charging Power Bank",
    39: "360-Degree Swivel Foldable Suction Car Phone Mount",
    40: "Breathable Soft Silicone Anti-Biting Dog Muzzle",
    41: "Luxury Gold-Tone Stainless Steel Cuban Link Dog Chain",
    42: "Semi-Automatic Easy-Clean Cat Litter Sifter Box",
    43: "High-Speed Steel Hand Drill Hole Reamer Bit",
    44: "Deep Pore Cleansing Blackhead Remover Strips (40-Pack)",
    45: "Modern Minimalist LED Digital Wooden Desk Clock",
    46: "Large Display LED Digital Alarm Clock with Dimmer",
    47: "Multi-Pocket Car Backseat Organizer & Kick Mat",
    48: "Women's Relaxed Batwing Sleeve Casual Romper",
    49: "Over-The-Door Multi-Compartment Hanging Organizer",
    50: "Cute Touch-Sensor Silicone Animal LED Night Light",
    51: "Electric Rapid-Relief Thermal Heating Pad",
    52: "Heavy-Duty Manual Core Lawn Aerator (9.2-Inch)",
    53: "Universal Heavy-Duty TV Wall Mount Bracket (TMW600)",
    54: "Universal Swivel Tabletop TV Stand Base (TMW003S)",
    55: "100W All-Metal Dual-Port Super Fast Car Charger",
    56: "Women's Soft Crewneck Casual T-Shirt with Pocket",
    57: "Breathable Travel Carrier Tote Bag for Small Dogs & Cats",
    58: "Women's Elegant Solid V-Neck One-Piece Jumpsuit",
    59: "Cute Cartoon Calf Digital Alarm Clock for Kids",
    60: "High-Density Self-Wringing PU Sponge Mop",
    61: "Yegbong Hypoallergenic Pet Grooming Wipes (100-Pack)",
    62: "2-Pack Modern Touch-Control Bedside USB Table Lamps",
    63: "2-Pack Ultra-Bright LED Car Daytime Running Lights",
    64: "39-Piece Household Hand Tool Kit with Canvas Tote Bag",
    65: "2-Pack Adjustable Heavy-Duty Pet Car Seat Belt Leashes",
    66: "3-Tier Compact Metal Kitchen Spice & Countertop Shelf",
    67: "Automatic Gravity Pet Waterer & Food Feeder Bowl",
    68: "Shock-Absorbing Elastic Bungee Dog Car Leash",
    69: "Dual-Sided Rechargeable Digital Hand Warmer & Power Bank",
    70: "Heavy-Duty Non-Slip Folding Step Stool with Cushion",
    71: "High-Carbon Stainless Steel Kitchen Utility & Paring Knife",
    72: "Rustic Wood Wall-Mounted Key Holder with Storage Shelf",
    73: "10kPa High-Suction Cordless Handheld Car Vacuum Cleaner",
    74: "Universal Stainless Steel Countertop Knife Block Stand",
    75: "Silicone Shower Drain Hair Catcher with Suction Cups (4-Pack)",
    76: "6-Piece High-Carbon Stainless Steel Chef Knife Set",
    77: "Single-Handle Pull-Down Commercial Kitchen Sink Faucet",
    78: "Rotating Stainless Steel Kitchen Cooking Utensil Caddy",
    79: "Kegani Heavy-Duty Forged Steel Meat & Bone Cleaver",
    80: "36L Lightweight Waterproof Outdoor Hiking Backpack",
    81: "Instant Automatic Pop-Up Camping Tent (3-4 Person)",
    82: "Solar-Powered RGB LED Waterproof Deck & Step Lights (4-Pack)",
    83: "Enchanted Rose LED Ambient Night Light with Bluetooth Speaker",
    84: "SANSI 60W Equivalent Energy-Saving LED Light Bulbs (4-Pack)",
    85: "Warm-Glow Aromatherapy Wax Melting Fragrance Lamp",
    86: "12-Slot Luxury Carbon Fiber Watch Display Case",
    87: "20-Pack Vacuum Storage Space-Saver Bags with Hand Pump",
    88: "Shockproof Padded Tablet Sleeve Case (Fits 9.7-11 Inch)",
    89: "Non-Slip Cushioned Bathtub & Shower Floor Mat (39x15 Inch)",
    90: "Ultrasonic Deep Jewelry & Glasses Cleaner with Drying Box",
    91: "Cute Jade Rabbit Rechargeable Silicone LED Night Light",
    92: "Heavy-Duty Woven Polypropylene Weed Barrier Landscape Fabric",
    93: "304 Marine-Grade Stainless Steel Slide Boat Anchor Hook",
    94: "18-Grid Eyewear & Sunglasses Storage Organizer Case",
    95: "50-Pack Eco-Friendly Kraft Paper Gift Packaging Boxes",
    96: "Heavy-Duty 32-Strand Braided Nylon Utility Paracord (100ft)",
    97: "Wireless Extendable Selfie Stick Tripod with Dual Fill Lights",
    98: "Commercial Grade 3.2oz Heavy-Duty Weed Barrier Landscape Fabric",
    99: "All-Weather Battery-Powered LED Camping Lantern with Dimmer",
    100: "Heavy-Duty All-Weather Waterproof Duct Tape (3-Pack)",
}

def main():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL must be configured.")

    print("Connecting to Neon PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    updated_db = 0
    for prod_id, new_title in CANONICAL_TITLES.items():
        cur.execute(
            "UPDATE products SET title = %s WHERE id = %s",
            (new_title, prod_id)
        )
        updated_db += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Neon DB: Successfully updated {updated_db} product titles.")

    # Synchronize storefront/src/lib/seedCatalog.json
    seed_path = os.path.join("storefront", "src", "lib", "seedCatalog.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_items = json.load(f)

        synced = 0
        for item in seed_items:
            item_id = item.get("id")
            if item_id in CANONICAL_TITLES:
                item["title"] = CANONICAL_TITLES[item_id]
                # Also clean in_the_box spec
                if "specs" in item and "in_the_box" in item["specs"]:
                    item["specs"]["in_the_box"] = f"1x {CANONICAL_TITLES[item_id]} (Manufacturer Sealed Retail Unit)"
                synced += 1

        with open(seed_path, "w", encoding="utf-8") as f:
            json.dump(seed_items, f, indent=2, ensure_ascii=False)
        print(f"SeedCatalog: Synchronized {synced} products with clean canonical titles.")

if __name__ == "__main__":
    main()

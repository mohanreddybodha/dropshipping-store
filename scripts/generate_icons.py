"""
Generate all Vastire PWA icon PNGs from icon.svg using cairosvg.
Outputs: icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png, favicon.ico, icon-maskable.png
"""
import sys
import os
import subprocess

PUBLIC = os.path.join(os.path.dirname(__file__), "..", "storefront", "public")
SVG_PATH = os.path.join(PUBLIC, "icon.svg")

def try_install_cairosvg():
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cairosvg", "--quiet"])

def generate_icons():
    try:
        import cairosvg
    except ImportError:
        print("cairosvg not found — installing...")
        try_install_cairosvg()
        import cairosvg

    with open(SVG_PATH, "rb") as f:
        svg_data = f.read()

    sizes = {
        "icon-32.png": 32,
        "favicon-32.png": 32,
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
        "icon-maskable.png": 512,
    }

    for filename, size in sizes.items():
        out_path = os.path.join(PUBLIC, filename)
        cairosvg.svg2png(bytestring=svg_data, write_to=out_path, output_width=size, output_height=size)
        file_size = os.path.getsize(out_path)
        print(f"  Generated {filename} ({size}x{size}) → {file_size:,} bytes")

    # Also generate favicon.ico from 32px png using Pillow
    try:
        from PIL import Image
        img = Image.open(os.path.join(PUBLIC, "icon-32.png"))
        ico_path = os.path.join(PUBLIC, "favicon.ico")
        img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print(f"  Generated favicon.ico ({os.path.getsize(ico_path):,} bytes)")
    except Exception as e:
        print(f"  Skipping favicon.ico (Pillow not available): {e}")

if __name__ == "__main__":
    print(f"Generating icons from: {SVG_PATH}")
    generate_icons()
    print("Done.")

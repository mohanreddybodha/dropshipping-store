from PIL import Image
import io, base64, os

master_path = r'C:\Users\bodha\.gemini\antigravity\brain\d30973e1-780e-40c7-8228-62d33953aa6e\.user_uploaded\media_1793511392770_dde522ed.jpg'
master = Image.open(master_path)

# Resize to 256x256 high-DPI (6.1x Retina supersampling at 42px)
resized = master.resize((256, 256), Image.Resampling.LANCZOS)
buf = io.BytesIO()
resized.save(buf, format='WEBP', quality=95)
webp_bytes = buf.getvalue()
webp_b64 = base64.b64encode(webp_bytes).decode('ascii')
data_uri = f'data:image/webp;base64,{webp_b64}'
print('WebP Data URI length:', len(data_uri), 'bytes')

# Generate optimized icon.svg
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  <defs>
    <clipPath id="squircleCard">
      <rect x="42" y="42" width="940" height="940" rx="210" ry="210" />
    </clipPath>
    <filter id="softCardShadow" x="-5%" y="-5%" width="112%" height="112%">
      <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.06" />
    </filter>
  </defs>
  <rect x="42" y="42" width="940" height="940" rx="210" ry="210" fill="#ffffff" filter="url(#softCardShadow)" />
  <g clip-path="url(#squircleCard)">
    <image href="{data_uri}" x="0" y="0" width="1024" height="1024" preserveAspectRatio="xMidYMid slice" />
  </g>
  <rect x="42" y="42" width="940" height="940" rx="210" ry="210" fill="none" stroke="#E2E8F0" stroke-width="4" />
</svg>'''

svg_path = 'storefront/public/icon.svg'
with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(svg_content)

print('Saved', svg_path, 'New size:', os.path.getsize(svg_path), 'bytes')

# Save data_uri to python file so we can import it in Next.js or VastireLogo.tsx
with open('storefront/src/components/ui/vastireIconDataUri.ts', 'w', encoding='utf-8') as f:
    f.write(f'export const VASTIRE_ICON_DATA_URI = "{data_uri}";\n')
print('Saved storefront/src/components/ui/vastireIconDataUri.ts')

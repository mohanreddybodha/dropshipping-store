// generate_icons.js — Render icon.svg to all PWA PNG sizes using sharp (bundled librsvg)
// Run from project root; storefront/node_modules/sharp is used
const sharp = require(require('path').resolve(__dirname, '../storefront/node_modules/sharp'));
const path = require('path');
const fs = require('fs');

const PUBLIC = path.join(__dirname, '..', 'storefront', 'public');
const SVG_PATH = path.join(PUBLIC, 'icon.svg');

const svgBuffer = fs.readFileSync(SVG_PATH);

const icons = [
  { file: 'favicon-32.png',       size: 32  },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png',         size: 192 },
  { file: 'icon-512.png',         size: 512 },
  { file: 'icon-maskable.png',    size: 512 },
];

(async () => {
  for (const { file, size } of icons) {
    const outPath = path.join(PUBLIC, file);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    const bytes = fs.statSync(outPath).size;
    console.log(`  ✓ ${file} (${size}x${size}) — ${(bytes/1024).toFixed(1)} KB`);
  }
  console.log('Done — all icons generated.');
})();

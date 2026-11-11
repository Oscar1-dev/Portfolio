// Builds the brand files in public/ from the mark geometry and the Blender
// avatar render. Run: node media-src/brand/build.mjs
// (Lockups, the social card and the banner are rendered from HTML templates
// with real fonts: see render-cards.sh.)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pub = (...p) => path.join(root, 'public', ...p);

// The mark: a disc, two slots, an 18° turn. One definition, reused everywhere.
const slots = `<g transform="rotate(-18 32 32)" fill="#000"><rect x="20.5" y="22" width="6.5" height="50"/><rect x="37" y="-8" width="6.5" height="50"/></g>`;
const mark = (fill, { id = 'm', r = 28, inner = '' } = {}) =>
  `<defs><mask id="${id}"><circle cx="32" cy="32" r="28" fill="#fff"/>${slots}</mask></defs>` +
  `<g transform="translate(32 32) scale(${r / 28}) translate(-32 -32)"><rect width="64" height="64" ${fill} mask="url(#${id})"/></g>${inner}`;
const svg = (body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" ${extra}>${body}</svg>\n`;

const files = {
  // Plain mark, inherits the text colour where it is inlined.
  'brand/mark.svg': svg(mark('fill="currentColor"')),
  'brand/mark-on-dark.svg': svg(mark('fill="#f2f0ee"')),
  'brand/mark-on-light.svg': svg(mark('fill="#15171a"')),
  // Simplified icon on a tile, for app icons and small sizes.
  'brand/icon-dark.svg': svg(`<rect width="64" height="64" rx="14" fill="#0b0b0f"/>` + mark('fill="#f2f0ee"', { r: 22 })),
  'brand/icon-light.svg': svg(`<rect width="64" height="64" rx="14" fill="#f1eee7"/>` + mark('fill="#15171a"', { r: 22 })),
  // Favicon follows the browser's colour scheme.
  'favicon.svg': svg(
    `<style>.t{fill:#0b0b0f}.k{fill:#f2f0ee}@media (prefers-color-scheme:light){.t{fill:#f1eee7}.k{fill:#15171a}}</style>` +
      `<rect class="t" width="64" height="64" rx="14"/>` + mark('class="k"', { r: 23 }),
  ),
};
for (const [name, body] of Object.entries(files)) fs.writeFileSync(pub(name), body);

const png = (name, size) => sharp(Buffer.from(files[name]), { density: 600 }).resize(size, size).png().toBuffer();
fs.writeFileSync(pub('brand/apple-touch-icon.png'), await png('brand/icon-dark.svg', 180));
fs.writeFileSync(pub('brand/icon-512.png'), await png('brand/icon-dark.svg', 512));
fs.writeFileSync(pub('brand/icon-light-512.png'), await png('brand/icon-light.svg', 512));

// favicon.ico: 16, 32 and 48 px PNG images in an ICO container.
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map((s) => png('brand/icon-dark.svg', s)));
const head = Buffer.alloc(6 + 16 * imgs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let offset = head.length;
imgs.forEach((b, i) => {
  const o = 6 + 16 * i;
  head.writeUInt8(sizes[i], o); head.writeUInt8(sizes[i], o + 1);
  head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
  head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(offset, o + 12);
  offset += b.length;
});
fs.writeFileSync(pub('favicon.ico'), Buffer.concat([head, ...imgs]));

// Profile picture: the mark as a machined object (media-src/blender/brand_disc.py, frame 1).
const avatar = path.join(root, 'media-src/render/brand_disc/0001.png');
if (fs.existsSync(avatar)) {
  await sharp(avatar).resize(1024, 1024).webp({ quality: 88 }).toFile(pub('brand/avatar.webp'));
  await sharp(avatar).resize(1024, 1024).jpeg({ quality: 90 }).toFile(pub('brand/avatar.jpg'));
  await sharp(avatar).resize(400, 400).webp({ quality: 84 }).toFile(pub('brand/avatar-400.webp'));
}
console.log('brand files written:', fs.readdirSync(pub('brand')).join(', '));

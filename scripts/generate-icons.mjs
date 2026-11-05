// Original ShareLyze mark. Regenerate raster assets from the canonical SVG.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const directory = new URL('../frontend/public/', import.meta.url);
const source = await readFile(new URL('logo.svg', directory));
const light = source.toString();
// "light" and "dark" describe the intended surrounding theme.
const dark = light.replace('fill="#e6e2db"', 'fill="#2b2d33"')
  .replace('stroke="#2b2d33"', 'stroke="#e6e2db"')
  .replace('stroke="#b8b5af"', 'stroke="#606268"');
for (const [theme, svg] of [['light', light], ['dark', dark]]) {
  await writeFile(new URL(`logo-${theme}.svg`, directory), svg);
  const foreground = theme === 'light' ? '#2b2d33' : '#e6e2db';
  const transparent = svg
    .replace(/  <rect width="64" height="64" rx="15"[^>]*\/>\n/, '')
    .replace(/stroke="#(?:b8b5af|606268)"/, `stroke="${foreground}" stroke-opacity="0.32"`);
  await writeFile(new URL(`logo-${theme}-transparent.svg`, directory), transparent);
}
await writeFile(new URL('favicon.svg', directory), source);
for (const [name, size] of [
  ['favicon-16x16.png', 16], ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512],
]) {
  await sharp(source, { density: 768 }).resize(size, size).png().toFile(new URL(name, directory).pathname);
}
// ICO entries contain PNG images, supported by modern browsers and Windows.
const images = await Promise.all([16, 32, 48].map(size =>
  sharp(source, { density: 768 }).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + 16 * index;
  header[entry] = header[entry + 1] = [16, 32, 48][index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL('favicon.ico', directory), Buffer.concat([header, ...images]));

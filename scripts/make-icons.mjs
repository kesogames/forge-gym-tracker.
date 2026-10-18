// Genereert PWA-iconen uit een SVG. Gebruik: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const svg = (pad) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0a0c0e"/>
<g transform="translate(256 256) scale(${pad ? 0.62 : 0.78}) translate(-256 -256)">
<rect x="56" y="56" width="400" height="400" rx="96" fill="#c8ff2e"/>
<g stroke="#0b0d0f" stroke-width="40" stroke-linecap="round" fill="none" transform="translate(256 256) scale(10.5) translate(-12 -12)">
<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" stroke-width="2.6"/></g></g></svg>`);
await mkdir("public/icons", { recursive: true });
for (const [n, s, pad] of [["icon-192", 192, false], ["icon-512", 512, false], ["maskable-512", 512, true], ["apple-touch-icon", 180, true]]) {
  await sharp(svg(pad)).resize(s, s).png().toFile(`public/icons/${n}.png`);
}
await sharp(svg(false)).resize(48, 48).png().toFile("src/app/icon.png");
console.log("iconen klaar");

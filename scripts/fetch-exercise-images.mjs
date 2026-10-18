// Downloadt de oefeningafbeeldingen uit free-exercise-db (Unlicense / publiek domein)
// en zet ze om naar compacte webp in public/exercises/<map>/{0,1}.webp.
// Gebruik: node scripts/fetch-exercise-images.mjs
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";
const root = path.resolve(import.meta.dirname, "..");
const src = await readFile(path.join(root, "src/lib/data/exercises.ts"), "utf8");

const index = await (await fetch(`${BASE}/dist/exercises.json`)).json();
const known = new Set(index.map((x) => x.id));
const ids = [...new Set([...src.matchAll(/"([A-Za-z0-9_\-]+)"/g)].map((m) => m[1]).filter((s) => known.has(s)))];

const missing = [...src.matchAll(/e\("[^"]+", "[^"]+", "([^"]+)"/g)].map((m) => m[1]).filter((s) => !known.has(s));
if (missing.length) console.warn("Onbekende afbeeldingen:", missing);

let done = 0;
await Promise.all(
  ids.map(async (id) => {
    const dir = path.join(root, "public/exercises", id);
    await mkdir(dir, { recursive: true });
    for (const frame of [0, 1]) {
      const out = path.join(dir, `${frame}.webp`);
      try {
        await access(out);
        continue;
      } catch {}
      const res = await fetch(`${BASE}/exercises/${id}/${frame}.jpg`);
      if (!res.ok) {
        console.warn("Niet gevonden:", id, frame);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(out, await sharp(buf).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer());
    }
    done++;
  }),
);
console.log(`Klaar: ${done} oefeningen`);

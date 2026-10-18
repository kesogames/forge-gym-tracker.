"use client";
// Alleen voor de single-page build (claude.ai-artifact): daar mogen maximaal ~500
// bestanden mee, dus zijn de oefeningafbeeldingen gebundeld in een paar pakketten
// (exercises-pack-N.webp, binaire bundel; de extensie is alleen voor de host) met een index. Een afbeelding wordt uit het pakket
// geknipt en als blob-URL getoond. Pakketten worden pas geladen als ze nodig zijn.

type Index = Record<string, [pack: number, offset: number, length: number]>;

let indexP: Promise<Index | null> | null = null;
const packs = new Map<number, Promise<ArrayBuffer>>();
const urls = new Map<string, string>();

function index(): Promise<Index | null> {
  indexP ??= fetch("exercises-index.json")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return indexP;
}

export async function packedImageUrl(path: string): Promise<string | null> {
  const hit = urls.get(path);
  if (hit) return hit;
  const idx = await index();
  const entry = idx?.[path];
  if (!entry) return null;
  const [n, off, len] = entry;
  let p = packs.get(n);
  if (!p) {
    p = fetch(`exercises-pack-${n}.webp`).then((r) => {
      if (!r.ok) throw new Error("pack");
      return r.arrayBuffer();
    });
    packs.set(n, p);
  }
  try {
    const buf = await p;
    const url = URL.createObjectURL(new Blob([buf.slice(off, off + len)], { type: "image/webp" }));
    urls.set(path, url);
    return url;
  } catch {
    packs.delete(n);
    return null;
  }
}

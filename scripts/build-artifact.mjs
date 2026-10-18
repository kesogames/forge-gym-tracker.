// Maakt van de statische SPA-export (out/) een map met relatieve paden die als
// claude.ai-artifact gepubliceerd kan worden: artifact/index.html + bestanden.
// Gebruik: npm run build:artifact
import { cp, readFile, writeFile, rm, readdir, stat, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".next-spa");
const dest = path.join(root, "artifact");
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
// "_" vooraan is gereserveerd door de artifact-host: _next wordt next
await cp(path.join(out, "_next"), path.join(dest, "next"), { recursive: true });
// Afbeeldingen bundelen in pakketten van ~2 MB (artifact: max. ~500 bestanden).
// Handgeschreven oefeningen eerst, zodat het eerste pakket de meest gebruikte bevat.
{
  const src = await readFile(path.join(root, "src/lib/data/exercises.ts"), "utf8");
  const curated = [...new Set([...src.matchAll(/e\("[^"]+", "[^"]+", "([^"]+)"/g)].map((m) => m[1]))];
  const all = (await readdir(path.join(root, "public", "exercises"))).sort();
  const order = [...curated.filter((d) => all.includes(d)), ...all.filter((d) => !curated.includes(d))];
  const index = {};
  let pack = 0, chunks = [], size = 0;
  const flush = async () => {
    if (!chunks.length) return;
    await writeFile(path.join(dest, `exercises-pack-${pack}.webp`), Buffer.concat(chunks));
    pack++; chunks = []; size = 0;
  };
  for (const d of order) {
    for (const f of ["0.webp", "1.webp"]) {
      let buf;
      try { buf = await readFile(path.join(root, "public", "exercises", d, f)); } catch { continue; }
      index[`exercises/${d}/${f}`] = [pack, size, buf.length];
      chunks.push(buf); size += buf.length;
      if (size > 2_000_000) await flush();
    }
  }
  await flush();
  await writeFile(path.join(dest, "exercises-index.json"), JSON.stringify(index));
  console.log(`afbeeldingen: ${Object.keys(index).length} in ${pack} pakketten`);
}

async function walk(dir) {
  const res = [];
  for (const e of await readdir(dir)) {
    const p = path.join(dir, e);
    if ((await stat(p)).isDirectory()) res.push(...(await walk(p)));
    else res.push(p);
  }
  return res;
}

for (const f of await walk(path.join(dest, "next"))) {
  if (f.endsWith(".css")) {
    let s = await readFile(f, "utf8");
    s = s.replaceAll("/_next/static/media/", "../media/");
    await writeFile(f, s);
  } else if (f.endsWith(".js")) {
    let s = await readFile(f, "utf8");
    // webpack publicPath relatief maken
    // U+FFFD letterlijk in de bron wordt door de host geweigerd: schrijf als escape
    const n = s.replaceAll('"/_next/"', '"next/"').replaceAll("\uFFFD", "\\ufffd");
    if (n !== s) await writeFile(f, n);
  }
}

// Niet nodig voor de single-page build (pages-router en 404-pagina)
for (const f of await walk(path.join(dest, "next"))) {
  if (/\/(_buildManifest|_ssgManifest)\.js$|\/pages\/_|\/app\/_not-found\//.test(f)) await rm(f);
}
await rm(path.join(dest, "next/static/chunks/app/_not-found"), { recursive: true, force: true });

let html = await readFile(path.join(out, "index.html"), "utf8");
html = html.replaceAll('"/_next/', '"next/').replaceAll("'/_next/", "'next/").replaceAll("/_next/", "next/");
html = html.replace(/<link rel="(manifest|icon|apple-touch-icon|shortcut icon)"[^>]*>/g, "");
// Artifact-conventies: de host levert zelf doctype/html/head/body, dus die halen
// we weg. De font-klassen van <html> zetten we via een klein script terug.
const htmlClass = (html.match(/<html[^>]*class="([^"]*)"/) ?? [])[1] ?? "";
html = html.replace(/<title>[^<]*<\/title>/, "");
html = html.replace(/<!DOCTYPE html>/i, "").replace(/<html[^>]*>/, "").replace("</html>", "").replace(/<\/?head>/g, "").replace(/<body[^>]*>/, "").replace("</body>", "");
html = html.replace(/<meta charSet="utf-8"\/>/, "").replace(/<meta name="viewport"[^>]*\/>/, "");
html = `<title>Forge Gym Tracker</title>\n<script>document.documentElement.className+=" ${htmlClass}";document.documentElement.lang="nl";</script>\n` + html;
await writeFile(path.join(dest, "index.html"), html);

const files = await walk(dest);
console.log(`artifact/: ${files.length} bestanden`);

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
await cp(path.join(root, "public", "exercises"), path.join(dest, "exercises"), { recursive: true });

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

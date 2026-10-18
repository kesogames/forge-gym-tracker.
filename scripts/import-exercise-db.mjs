// Importeert de rest van free-exercise-db (Unlicense) als uitgebreide bibliotheek:
// src/lib/data/exercises-db.json + afbeeldingen in public/exercises.
// Oefeningen waarvan de afbeelding al door een handgeschreven oefening gebruikt
// wordt, worden overgeslagen (die hebben een Nederlandse versie).
// Gebruik: node scripts/import-exercise-db.mjs
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";
const root = path.resolve(import.meta.dirname, "..");
const curated = await readFile(path.join(root, "src/lib/data/exercises.ts"), "utf8");
const usedImages = new Set([...curated.matchAll(/e\("[^"]+", "[^"]+", "([^"]+)"/g)].map((m) => m[1]));
const index = await (await fetch(`${BASE}/dist/exercises.json`)).json();

const MUSCLE = { abdominals: "abs", abductors: "abductors", adductors: "adductors", biceps: "biceps", calves: "calves", chest: "chest", forearms: "forearms", glutes: "glutes", hamstrings: "hamstrings", lats: "back", "lower back": "lower_back", "middle back": "back", neck: "traps", quadriceps: "quads", shoulders: "shoulders", traps: "traps", triceps: "triceps" };
const EQUIP = { barbell: "barbell", dumbbell: "dumbbell", cable: "cable", machine: "machine", "body only": "bodyweight", kettlebells: "kettlebell", "e-z curl bar": "ez_bar", bands: "band" };
const KEEP = new Set(["strength", "plyometrics", "olympic weightlifting", "powerlifting", "strongman", "cardio"]);

const out = [];
for (const x of index) {
  if (!KEEP.has(x.category) || usedImages.has(x.id)) continue;
  const primary = MUSCLE[x.primaryMuscles[0]];
  if (!primary) continue;
  const secondary = [...new Set(x.secondaryMuscles.map((m) => MUSCLE[m]).filter((m) => m && m !== primary))];
  const equipment = x.category === "cardio" ? "cardio" : EQUIP[x.equipment] ?? "other";
  const isTime = x.category === "cardio" || /\b(plank|hold|bridge)\b/i.test(x.name);
  const isCarry = /\b(walk|carry|drag)\b/i.test(x.name) && x.category === "strongman";
  const metric_type = isCarry ? "custom" : isTime ? "time" : equipment === "bodyweight" ? "bodyweight_reps" : "weight_reps";
  const mechanic = x.mechanic === "isolation" ? "isolation" : "compound";
  const rest = x.category === "olympic weightlifting" || x.category === "powerlifting" ? 150 : x.category === "plyometrics" ? 75 : x.category === "cardio" ? 0 : mechanic === "compound" ? 90 : 60;
  let instructions = x.instructions.join(" ").replace(/\s+/g, " ").trim();
  if (instructions.length > 420) instructions = instructions.slice(0, 417).replace(/\s\S*$/, "") + "…";
  out.push({
    id: "db-" + x.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: x.name,
    image: x.images?.length ? x.id : null,
    primary_muscle: primary,
    secondary_muscles: secondary,
    equipment,
    metric_type,
    metrics: isCarry ? ["weight", "distance"] : isTime ? ["time"] : ["weight", "reps"],
    mechanic,
    pattern: { plyometrics: "jump", "olympic weightlifting": "olympic", strongman: "complex", cardio: "cardio" }[x.category] ?? (/twist|rotation|chop|windmill/i.test(x.name) ? "rotation" : `db-${primary}-${mechanic}`),
    instructions,
    default_rest: rest,
    unilateral: /\b(one-arm|one arm|single-arm|single-leg|one-leg|one legged|single leg)\b/i.test(x.name),
  });
}
out.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(path.join(root, "src/lib/data/exercises-db.json"), JSON.stringify(out));
console.log(`exercises-db.json: ${out.length} oefeningen`);

let n = 0;
const queue = out.filter((x) => x.image);
async function worker() {
  while (queue.length) {
    const x = queue.shift();
    const dir = path.join(root, "public/exercises", x.image);
    await mkdir(dir, { recursive: true });
    for (const frame of [0, 1]) {
      const f = path.join(dir, `${frame}.webp`);
      try { await access(f); continue; } catch {}
      const res = await fetch(`${BASE}/exercises/${x.image}/${frame}.jpg`);
      if (!res.ok) continue;
      await writeFile(f, await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 62 }).toBuffer());
      n++;
    }
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log(`${n} afbeeldingen gedownload`);

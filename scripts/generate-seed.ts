// Genereert supabase/seed.sql uit de oefeningenbibliotheek in de code.
// Gebruik: npx tsx scripts/generate-seed.ts
import { writeFileSync } from "node:fs";
import path from "node:path";
import { EXERCISES } from "../src/lib/data/exercises";
import { MUSCLES } from "../src/lib/data/muscles";

const q = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const arr = (a: string[]) => `array[${a.map(q).join(",")}]::text[]`;

const lines: string[] = ["-- Automatisch gegenereerd door scripts/generate-seed.ts. Niet handmatig bewerken.", "begin;"];
lines.push("insert into public.muscle_groups (id, name, region) values");
lines.push(MUSCLES.map((m) => `  (${q(m.id)}, ${q(m.name)}, ${q(m.region)})`).join(",\n") + "\non conflict (id) do update set name = excluded.name, region = excluded.region;");
lines.push("insert into public.exercises (id, name, image, primary_muscle, equipment, metric_type, metrics, mechanic, pattern, instructions, default_rest, unilateral) values");
lines.push(
  EXERCISES.map((e) => `  (${q(e.id)}, ${q(e.name)}, ${q(e.image)}, ${q(e.primary_muscle)}, ${q(e.equipment)}, ${q(e.metric_type)}, ${arr(e.metrics)}, ${q(e.mechanic)}, ${q(e.pattern)}, ${q(e.instructions)}, ${e.default_rest}, ${e.unilateral})`).join(",\n") +
    "\non conflict (id) do update set name = excluded.name, image = excluded.image, primary_muscle = excluded.primary_muscle, equipment = excluded.equipment, metric_type = excluded.metric_type, metrics = excluded.metrics, mechanic = excluded.mechanic, pattern = excluded.pattern, instructions = excluded.instructions, default_rest = excluded.default_rest, unilateral = excluded.unilateral;",
);
lines.push("delete from public.exercise_muscles;");
lines.push("insert into public.exercise_muscles (exercise_id, muscle_id, role) values");
lines.push(
  EXERCISES.flatMap((e) => [`  (${q(e.id)}, ${q(e.primary_muscle)}, 'primary')`, ...e.secondary_muscles.filter((m) => m !== e.primary_muscle).map((m) => `  (${q(e.id)}, ${q(m)}, 'secondary')`)]).join(",\n") + ";",
);
lines.push("commit;");
writeFileSync(path.resolve(__dirname, "../supabase/seed.sql"), lines.join("\n") + "\n");
console.log(`seed.sql: ${MUSCLES.length} spiergroepen, ${EXERCISES.length} oefeningen`);

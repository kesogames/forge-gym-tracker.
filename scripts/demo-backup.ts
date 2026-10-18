// Genereert een demo-back-up (JSON) met 10 weken trainingshistorie, om de UI met
// gegevens te bekijken of te testen. Importeer via Instellingen → Back-up importeren.
// Gebruik: npx tsx scripts/demo-backup.ts > demo.json
import "fake-indexeddb/auto";
import { GymDB, setDb } from "../src/lib/db/db";
import * as repo from "../src/lib/db/repo";
import { exampleTemplates } from "../src/lib/data/templates";

const RealDate = Date;
let fake = new RealDate().getTime();
class FakeDate extends RealDate {
  constructor(...a: ConstructorParameters<typeof RealDate> | []) {
    if (a.length === 0) super(fake);
    else super(...(a as [number]));
  }
  static now() {
    return fake;
  }
}
globalThis.Date = FakeDate as DateConstructor;

async function main() {
  setDb(new GymDB("demo"));
  const tpl = exampleTemplates(repo.uid)[0];
  await repo.saveTemplateFull(tpl);
  await repo.updateSettings({ display_name: "Sam", weekly_workout_goal: 3, onboarded: true });
  await repo.applyDefaultGoals();
  const now = new RealDate();
  const start = new RealDate(now.getTime() - 70 * 86400_000);
  let n = 0;
  for (let d = 0; d < 70; d++) {
    const day = new RealDate(start.getTime() + d * 86400_000);
    const dow = day.getDay();
    if (![1, 3, 5].includes(dow) || (d % 17 === 0)) continue;
    const t = new RealDate(day.getFullYear(), day.getMonth(), day.getDate(), 18, 10 + (d % 20));
    fake = t.getTime();
    const dayTpl = tpl.days[n % 3];
    const sid = await repo.startSession({ kind: "template", templateId: tpl.template.id, dayId: dayTpl.id });
    const wes = (await (await import("../src/lib/db/db")).db().workout_exercises.where("session_id").equals(sid).toArray()).sort((a, b) => a.position - b.position);
    const week = Math.floor(d / 7);
    for (const we of wes) {
      const sets = (await (await import("../src/lib/db/db")).db().workout_sets.where("workout_exercise_id").equals(we.id).toArray()).sort((a, b) => a.position - b.position);
      const base: Record<string, number> = { "bench-press": 70, "incline-db-press": 24, "seated-db-press": 20, "lateral-raise": 9, "rope-pushdown": 25, "overhead-cable-extension": 20, "pull-up": 0, "barbell-row": 65, "seated-cable-row": 55, "face-pull": 20, "ez-curl": 30, "hammer-curl": 14, "back-squat": 90, "romanian-deadlift": 80, "leg-press": 160, "lying-leg-curl": 40, "standing-calf-raise": 60, "hanging-leg-raise": 0 };
      const w = base[we.exercise_id] ?? 20;
      for (const [i, s] of sets.entries()) {
        fake += 150_000;
        const weight = w ? Math.round((w * (1 + week * 0.012)) / 2.5) * 2.5 : null;
        const reps = Math.max(5, (we.rep_max ?? 10) - i - (week % 3 === 0 ? 1 : 0));
        await repo.updateSet(s.id, { weight_kg: weight, reps });
        await repo.setSetCompleted(s.id, true);
      }
    }
    fake += 8 * 60_000;
    await repo.finishSession(sid);
    n++;
  }
  for (let i = 0; i < 10; i++) await repo.addBodyWeight({ date: new RealDate(start.getTime() + i * 7 * 86400_000).toISOString().slice(0, 10), weight_kg: 82.4 - i * 0.25 + (i % 2) * 0.3 });
  process.stdout.write(await repo.exportJSON());
}
main();

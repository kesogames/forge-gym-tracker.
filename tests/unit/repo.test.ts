import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GymDB, setDb, db } from "@/lib/db/db";
import * as repo from "@/lib/db/repo";

let n = 0;
beforeEach(async () => {
  setDb(new GymDB(`test-${++n}`));
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-01T16:00:00.000Z"));
});
afterAll(() => vi.useRealTimers());

const at = (iso: string) => vi.setSystemTime(new Date(iso));

async function makeTemplate() {
  const id = repo.uid();
  const dayId = repo.uid();
  await repo.saveTemplateFull({
    template: { id, name: "Push", description: "", favorite: false, archived: false },
    days: [{ id: dayId, name: "Push A", exercises: [
      { id: repo.uid(), exercise_id: "bench-press", sets: 3, rep_min: 8, rep_max: 12, rest_seconds: 120, target_weight: 60, superset_group: null, notes: "Schouderbladen vast" },
      { id: repo.uid(), exercise_id: "lateral-raise", sets: 2, rep_min: 12, rep_max: 15, rest_seconds: 60, target_weight: null, superset_group: null, notes: "" },
    ] }],
  });
  return { id, dayId };
}

async function setsOf(sessionId: string) {
  const wes = (await db().workout_exercises.where("session_id").equals(sessionId).toArray()).sort((a, b) => a.position - b.position);
  const sets = await db().workout_sets.where("session_id").equals(sessionId).toArray();
  return wes.map((we) => ({ we, sets: sets.filter((s) => s.workout_exercise_id === we.id).sort((a, b) => a.position - b.position) }));
}

describe("volledige trainingsstroom", () => {
  it("schema → start → sets → afronden → historie, met correcte tijden", async () => {
    const t = await makeTemplate();
    const full = await repo.getTemplateFull(t.id);
    expect(full!.days[0].exercises).toHaveLength(2);

    at("2026-10-01T16:24:00.000Z");
    const sid = await repo.startSession({ kind: "template", templateId: t.id, dayId: t.dayId });
    const s0 = (await repo.getActiveSession())!;
    expect(s0.id).toBe(sid);
    expect(s0.started_at).toBe("2026-10-01T16:24:00.000Z");
    expect(s0.name).toBe("Push");

    // tweede start geeft dezelfde actieve training terug
    expect(await repo.startSession()).toBe(sid);

    let ex = await setsOf(sid);
    expect(ex[0].sets).toHaveLength(3);
    expect(ex[0].sets[0].weight_kg).toBe(60); // doelgewicht vooraf ingevuld
    expect(ex[0].sets.every((s) => !s.completed)).toBe(true); // vooraf ingevuld ≠ voltooid
    expect(ex[0].we.notes).toBe("Schouderbladen vast");

    // zonder herhalingen kan een set niet afgerond worden
    await expect(repo.setSetCompleted(ex[0].sets[0].id, true)).rejects.toThrow(/herhalingen/);

    for (const [i, reps] of [10, 9, 8].entries()) {
      await repo.updateSet(ex[0].sets[i].id, { reps });
      const r = await repo.setSetCompleted(ex[0].sets[i].id, true);
      expect(r.changed).toBe(true);
    }
    // dubbele tik: idempotent
    expect((await repo.setSetCompleted(ex[0].sets[2].id, true)).changed).toBe(false);

    const withRest = (await db().workout_sessions.get(sid))!;
    expect(withRest.rest_timer?.duration).toBe(120);

    // pauze van 10 minuten
    at("2026-10-01T16:40:00.000Z");
    await repo.pauseSession(sid);
    at("2026-10-01T16:50:00.000Z");
    await repo.resumeSession(sid);

    await repo.updateSet((await setsOf(sid))[1].sets[0].id, { weight_kg: 10, reps: 15 });
    await repo.setSetCompleted((await setsOf(sid))[1].sets[0].id, true);

    at("2026-10-01T17:36:34.000Z");
    const res = await repo.finishSession(sid);
    const done = (await db().workout_sessions.get(sid))!;
    expect(done.status).toBe("completed");
    expect(done.total_duration_sec).toBe(72 * 60 + 34);
    expect(done.active_duration_sec).toBe(62 * 60 + 34);
    expect(done.rest_timer).toBeNull();
    expect(done.rest_duration_sec).toBeGreaterThan(0);
    // onaangeroerde set is verwijderd, voltooide sets blijven
    ex = await setsOf(sid);
    expect(ex[0].sets).toHaveLength(3);
    expect(ex[1].sets).toHaveLength(1);
    expect(res.newPRs).toHaveLength(0); // eerste keer = geen PR
    expect(res.newAchievements.map((a) => a.key)).toContain("first-workout");
    expect(await repo.getActiveSession()).toBeUndefined();

    // vorige prestatie bij volgende training
    at("2026-10-04T16:00:00.000Z");
    const prev = await repo.getPreviousPerformance("bench-press", new Date().toISOString());
    expect(prev!.sets.map((s) => s.reps)).toEqual([10, 9, 8]);
    expect(prev!.session.id).toBe(sid);

    // nieuwe training: vorige waarden vooraf ingevuld
    const sid2 = await repo.startSession({ kind: "template", templateId: t.id, dayId: t.dayId });
    const ex2 = await setsOf(sid2);
    expect(ex2[0].sets.map((s) => [s.weight_kg, s.reps])).toEqual([[60, 10], [60, 9], [60, 8]]);
    await repo.updateSet(ex2[0].sets[0].id, { weight_kg: 62.5 });
    await repo.setSetCompleted(ex2[0].sets[0].id, true);
    at("2026-10-04T17:00:00.000Z");
    const res2 = await repo.finishSession(sid2);
    expect(res2.newPRs.map((p) => p.type).sort()).toEqual(["e1rm", "max_set_volume", "max_weight"]);
    expect(res2.newAchievements.map((a) => a.key)).toContain("first-pr");

    // herberekenen levert geen dubbele records of beloningen
    const before = { prs: await db().exercise_prs.count(), ach: await db().user_achievements.count() };
    const again = await repo.recomputeRecords(sid2);
    expect(again.newAchievements).toHaveLength(0);
    expect(await db().exercise_prs.count()).toBe(before.prs);
    expect(await db().user_achievements.count()).toBe(before.ach);
  });

  it("schema aanpassen verandert eerdere trainingen niet", async () => {
    const t = await makeTemplate();
    const sid = await repo.startSession({ kind: "template", templateId: t.id, dayId: t.dayId });
    const ex = await setsOf(sid);
    await repo.updateSet(ex[0].sets[0].id, { reps: 8 });
    await repo.setSetCompleted(ex[0].sets[0].id, true);
    await repo.finishSession(sid);

    const full = (await repo.getTemplateFull(t.id))!;
    await repo.saveTemplateFull({
      template: { ...full.template, name: "Push (nieuw)" },
      days: [{ id: full.days[0].id, name: "Andere dag", exercises: [{ ...full.days[0].exercises[1], sets: 5 }] }],
    });
    const after = await setsOf(sid);
    expect(after[0].we.exercise_name).toBe("Bankdrukken (halterstang)");
    expect((await db().workout_sessions.get(sid))!.name).toBe("Push");
    expect((await repo.getTemplateFull(t.id))!.days[0].exercises).toHaveLength(1);
  });

  it("herhalen van een oude training en dupliceren van schema's", async () => {
    const t = await makeTemplate();
    const sid = await repo.startSession({ kind: "template", templateId: t.id, dayId: t.dayId });
    const ex = await setsOf(sid);
    await repo.updateSet(ex[0].sets[0].id, { weight_kg: 70, reps: 5 });
    await repo.setSetCompleted(ex[0].sets[0].id, true);
    await repo.finishSession(sid);
    const rid = await repo.startSession({ kind: "repeat", sessionId: sid });
    const rex = await setsOf(rid);
    expect(rex).toHaveLength(1);
    expect(rex[0].sets[0]).toMatchObject({ weight_kg: 70, reps: 5, completed: false });
    await repo.abortSession(rid);
    expect((await db().workout_sessions.get(rid))!.status).toBe("aborted");

    const copy = await repo.duplicateTemplate(t.id);
    const c = (await repo.getTemplateFull(copy!))!;
    expect(c.template.name).toBe("Push (kopie)");
    expect(c.days[0].exercises).toHaveLength(2);
  });

  it("export en import", async () => {
    const t = await makeTemplate();
    const sid = await repo.startSession({ kind: "template", templateId: t.id, dayId: t.dayId });
    const ex = await setsOf(sid);
    await repo.updateSet(ex[0].sets[0].id, { reps: 8 });
    await repo.setSetCompleted(ex[0].sets[0].id, true);
    await repo.finishSession(sid);
    const json = await repo.exportJSON();
    const csv = await repo.exportCSV();
    expect(csv.split("\n")[1]).toContain("Bankdrukken (halterstang)");
    setDb(new GymDB(`import-${n}`));
    const count = await repo.importJSON(json);
    expect(count).toBeGreaterThan(5);
    expect((await db().workout_sessions.get(sid))!.status).toBe("completed");
  });

  it("schrijfacties komen in de outbox voor sync", async () => {
    await makeTemplate();
    const entries = await db().outbox.toArray();
    expect(new Set(entries.map((e) => e.table))).toEqual(new Set(["templates", "template_days", "template_exercises"]));
  });
});

describe("snelle invoer", () => {
  it("gewicht in set 1 vult lege latere sets voor, zonder ze te voltooien of ingevulde waarden te overschrijven", async () => {
    const sid = await repo.startSession();
    const weId = (await repo.addExerciseToSession(sid, "bench-press", 3))!;
    const sets = (await db().workout_sets.where("workout_exercise_id").equals(weId).sortBy("position"));
    await repo.updateSet(sets[2].id, { weight_kg: 50 });
    await repo.updateSet(sets[0].id, { weight_kg: 60, reps: 8 }, { propagate: true });
    const after = await db().workout_sets.where("workout_exercise_id").equals(weId).sortBy("position");
    expect(after.map((s) => [s.weight_kg, s.reps, s.completed])).toEqual([[60, 8, false], [60, 8, false], [50, 8, false]]);
  });

  it("superset: rusttimer start pas na de laatste oefening van de groep", async () => {
    const id = repo.uid();
    const dayId = repo.uid();
    await repo.saveTemplateFull({ template: { id, name: "SS", description: "", favorite: false, archived: false }, days: [{ id: dayId, name: "A", exercises: [
      { id: repo.uid(), exercise_id: "db-curl", sets: 1, rep_min: 10, rep_max: 10, rest_seconds: 60, target_weight: 10, superset_group: "A", notes: "" },
      { id: repo.uid(), exercise_id: "rope-pushdown", sets: 1, rep_min: 10, rep_max: 10, rest_seconds: 60, target_weight: 20, superset_group: "A", notes: "" },
    ] }] });
    const sid = await repo.startSession({ kind: "template", templateId: id, dayId });
    const ex = await setsOf(sid);
    await repo.updateSet(ex[0].sets[0].id, { reps: 10 });
    expect((await repo.setSetCompleted(ex[0].sets[0].id, true)).restStarted).toBe(false);
    await repo.updateSet(ex[1].sets[0].id, { reps: 10 });
    expect((await repo.setSetCompleted(ex[1].sets[0].id, true)).restStarted).toBe(true);
  });
});

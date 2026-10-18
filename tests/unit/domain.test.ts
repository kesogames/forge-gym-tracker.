import { describe, expect, it } from "vitest";
import { activeMs, formatClock, isPaused, pausedMs, restRemainingMs, totalMs } from "@/lib/domain/time";
import { estimate1RM, muscleSetCounts, setVolume, totalsFor } from "@/lib/domain/volume";
import { computeAllPRs } from "@/lib/domain/records";
import { periodRange, previousRange } from "@/lib/domain/periods";
import { levelFromXp, weekStreaks } from "@/lib/domain/gamification";
import type { WorkoutSet } from "@/lib/types";

const set = (p: Partial<WorkoutSet>): WorkoutSet => ({
  id: Math.random().toString(36).slice(2), session_id: "s", workout_exercise_id: "we", position: 0, set_type: "normal",
  weight_kg: null, reps: null, duration_sec: null, distance_m: null, rpe: null, rir: null, completed: true, completed_at: null, notes: "", updated_at: "", ...p,
});

describe("trainingstijd", () => {
  const start = "2026-10-18T16:24:00.000Z";
  const t0 = new Date(start).getTime();
  it("berekent verstreken tijd uit starttijd, niet uit een teller", () => {
    const s = { started_at: start, ended_at: null, pauses: [], rest_periods: [] };
    expect(totalMs(s, t0 + 42 * 60_000 + 18_000)).toBe(2_538_000);
    expect(formatClock(totalMs(s, t0 + 2_538_000))).toBe("00:42:18");
  });
  it("blijft correct na een lange onderbreking (vergrendeld scherm / refresh)", () => {
    const s = { started_at: start, ended_at: null, pauses: [], rest_periods: [] };
    // 3 uur later 'wakker' worden geeft direct de juiste tijd
    expect(formatClock(totalMs(s, t0 + 3 * 3600_000 + 5_000))).toBe("03:00:05");
  });
  it("trekt pauzes af van actieve tijd, niet van totale tijd", () => {
    const s = {
      started_at: start, ended_at: null, rest_periods: [],
      pauses: [{ start: "2026-10-18T16:34:00.000Z", end: "2026-10-18T16:44:00.000Z" }, { start: "2026-10-18T17:00:00.000Z", end: null }],
    };
    const now = new Date("2026-10-18T17:05:00.000Z").getTime();
    expect(totalMs(s, now)).toBe(41 * 60_000);
    expect(pausedMs(s, now)).toBe(15 * 60_000);
    expect(activeMs(s, now)).toBe(26 * 60_000);
    expect(isPaused(s)).toBe(true);
  });
  it("afgeronde training gebruikt eindtijd", () => {
    const s = { started_at: start, ended_at: "2026-10-18T17:36:34.000Z", pauses: [], rest_periods: [] };
    expect(formatClock(totalMs(s, Date.now()))).toBe("01:12:34");
  });
  it("rusttimer rekent met eindtijdstip en pauze", () => {
    const now = Date.now();
    expect(restRemainingMs({ workout_exercise_id: null, duration: 90, started_at: "", ends_at: new Date(now + 30_000).toISOString(), paused_remaining: null }, now)).toBe(30_000);
    expect(restRemainingMs({ workout_exercise_id: null, duration: 90, started_at: "", ends_at: null, paused_remaining: 42 }, now)).toBe(42_000);
  });
});

describe("trainingsvolume", () => {
  it("gewicht × herhalingen, 60kg 10/9/8 = 1620", () => {
    const sets = [set({ weight_kg: 60, reps: 10 }), set({ weight_kg: 60, reps: 9 }), set({ weight_kg: 60, reps: 8 })];
    const t = totalsFor(sets, new Map([["we", { metric_type: "weight_reps" as const, primary_muscle: "chest" as const, secondary_muscles: [] }]]));
    expect(t.volume_kg).toBe(1620);
    expect(t.working_sets).toBe(3);
    expect(t.reps).toBe(27);
  });
  it("sluit warming-up en niet-voltooide sets uit", () => {
    expect(setVolume(set({ weight_kg: 40, reps: 10, set_type: "warmup" }), "weight_reps")).toBe(0);
    expect(setVolume(set({ weight_kg: 60, reps: 10, completed: false }), "weight_reps")).toBe(0);
  });
  it("tijd/afstand niet bij kg", () => {
    expect(setVolume(set({ duration_sec: 60 }), "time")).toBe(0);
    const t = totalsFor([set({ distance_m: 2000, duration_sec: 600 })], new Map([["we", { metric_type: "distance" as const, primary_muscle: "quads" as const, secondary_muscles: [] }]]));
    expect(t.volume_kg).toBe(0);
    expect(t.distance_m).toBe(2000);
    expect(t.duration_sec).toBe(600);
  });
  it("lichaamsgewicht: standaard alleen extra gewicht, optioneel incl. lichaamsgewicht", () => {
    expect(setVolume(set({ weight_kg: null, reps: 10 }), "bodyweight_reps")).toBe(0);
    expect(setVolume(set({ weight_kg: 10, reps: 10 }), "bodyweight_reps")).toBe(100);
    expect(setVolume(set({ weight_kg: 10, reps: 10 }), "bodyweight_reps", { bodyweight_kg: 80, include_bodyweight: true })).toBe(900);
  });
  it("assisted: lichaamsgewicht − ondersteuning", () => {
    expect(setVolume(set({ weight_kg: 30, reps: 10 }), "assisted")).toBe(0);
    expect(setVolume(set({ weight_kg: 30, reps: 10 }), "assisted", { bodyweight_kg: 80, include_bodyweight: true })).toBe(500);
  });
  it("Epley 1RM", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBe(116.7);
    expect(estimate1RM(100, 15)).toBeNull();
  });
});

describe("settelling per spiergroep", () => {
  const ex = { metric_type: "weight_reps" as const, primary_muscle: "chest" as const, secondary_muscles: ["triceps", "shoulders"] as ("triceps" | "shoulders")[] };
  const items = [set({}), set({}), set({ set_type: "warmup" }), set({ completed: false })].map((s) => ({ ex, set: s }));
  it("primair = 1, secundair apart geregistreerd", () => {
    const m = muscleSetCounts(items, "primary");
    expect(m.get("chest")).toEqual({ primary: 2, secondary: 0, counted: 2 });
    expect(m.get("triceps")).toEqual({ primary: 0, secondary: 2, counted: 0 });
  });
  it("gewogen: secundair = 0,5", () => {
    const m = muscleSetCounts(items, "weighted");
    expect(m.get("triceps")!.counted).toBe(1);
  });
});

describe("persoonlijke records", () => {
  const bundle = (id: string, day: string, w: number, r: number) => ({
    session: { id, started_at: `2026-10-${day}T10:00:00.000Z`, ended_at: `2026-10-${day}T11:00:00.000Z`, status: "completed" as const },
    exercises: [{ id: `we-${id}`, exercise_id: "bench-press", metric_type: "weight_reps" as const }],
    sets: [set({ id: `set-${id}`, workout_exercise_id: `we-${id}`, weight_kg: w, reps: r })],
  });
  it("eerste keer is geen record, verbetering wel; herberekenen is idempotent", () => {
    const b = [bundle("a", "01", 60, 10), bundle("b", "05", 62.5, 8), bundle("c", "09", 60, 8)];
    const prs = computeAllPRs(b);
    expect(prs.filter((p) => p.session_id === "a")).toHaveLength(0);
    const typesB = prs.filter((p) => p.session_id === "b").map((p) => p.type).sort();
    expect(typesB).toEqual(["max_weight"]); // e1rm 62.5x8=79.2 < 60x10=80; volume 500 < 600
    expect(prs.filter((p) => p.session_id === "c")).toHaveLength(0);
    expect(computeAllPRs(b)).toEqual(prs);
  });
});

describe("periodes & gamification", () => {
  const now = new Date(2026, 9, 18, 12); // zondag 18 okt 2026
  it("week begint op maandag", () => {
    const r = periodRange("this_week", now);
    expect(r.start.getDate()).toBe(12);
    expect(r.end.getDate()).toBe(19);
    expect(previousRange("this_week", r)!.start.getDate()).toBe(5);
  });
  it("vorige maand", () => {
    const r = periodRange("last_month", now);
    expect(r.start.getMonth()).toBe(8);
    expect(r.end.getMonth()).toBe(9);
  });
  it("weekreeksen", () => {
    const dates = ["2026-09-21", "2026-09-23", "2026-09-28", "2026-09-30", "2026-10-05", "2026-10-07", "2026-10-12", "2026-10-14"].map((d) => `${d}T10:00:00`);
    expect(weekStreaks(dates, 2, now)).toMatchObject({ best: 4, current: 4 });
  });
  it("levels", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(250).level).toBe(2);
    expect(levelFromXp(749).level).toBe(2);
    expect(levelFromXp(750).level).toBe(3);
  });
});

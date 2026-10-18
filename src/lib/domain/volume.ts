import type { MetricType, MuscleId, SetCountMethod, WorkoutExercise, WorkoutSet } from "@/lib/types";

// Centrale berekeningen voor trainingsvolume en settelling.
//
// Volume per set = belasting (kg) × herhalingen.
// - Alleen voltooide werksets tellen mee (warming-up en niet-voltooide sets niet).
// - Tijd en afstand worden apart opgeteld, nooit bij kilogrammen.
// - Lichaamsgewicht: standaard telt alleen extra gewicht mee. Met de instelling
//   'lichaamsgewicht meetellen' wordt (laatst bekend lichaamsgewicht + extra) × reps gebruikt.
// - Assisted: effectieve belasting = lichaamsgewicht − ondersteuning (min. 0). Zonder
//   bekend lichaamsgewicht of met de instelling uit telt dit niet mee in kg-volume.
// - Eenzijdige oefeningen: gewicht en herhalingen worden per kant ingevoerd en
//   één keer geteld (niet ongemerkt verdubbeld).

export interface VolumeContext {
  bodyweight_kg: number | null;
  include_bodyweight: boolean;
}

export const DEFAULT_VOLUME_CTX: VolumeContext = { bodyweight_kg: null, include_bodyweight: false };

type SetLike = Pick<WorkoutSet, "set_type" | "completed" | "weight_kg" | "reps" | "duration_sec" | "distance_m">;
type ExLike = Pick<WorkoutExercise, "metric_type" | "primary_muscle" | "secondary_muscles">;

export function isWorkingSet(s: Pick<WorkoutSet, "set_type" | "completed">): boolean {
  return s.completed && s.set_type !== "warmup";
}

/** Effectieve belasting in kg voor één herhaling, of null als niet van toepassing. */
export function effectiveLoad(metric: MetricType, weight: number | null, ctx: VolumeContext): number | null {
  const w = weight ?? 0;
  switch (metric) {
    case "weight_reps":
    case "custom":
      return weight == null ? null : w;
    case "bodyweight_reps":
      if (ctx.include_bodyweight && ctx.bodyweight_kg) return ctx.bodyweight_kg + w;
      return w > 0 ? w : 0;
    case "assisted":
      if (ctx.include_bodyweight && ctx.bodyweight_kg) return Math.max(0, ctx.bodyweight_kg - w);
      return 0;
    default:
      return null;
  }
}

export function setVolume(s: SetLike, metric: MetricType, ctx: VolumeContext = DEFAULT_VOLUME_CTX): number {
  if (!isWorkingSet(s) || !s.reps) return 0;
  const load = effectiveLoad(metric, s.weight_kg, ctx);
  if (load == null) return 0;
  return round1(load * s.reps);
}

export interface Totals {
  volume_kg: number;
  working_sets: number;
  reps: number;
  duration_sec: number;
  distance_m: number;
}

export const emptyTotals = (): Totals => ({ volume_kg: 0, working_sets: 0, reps: 0, duration_sec: 0, distance_m: 0 });

export function addSet(t: Totals, s: SetLike, metric: MetricType, ctx: VolumeContext): Totals {
  if (!isWorkingSet(s)) return t;
  t.working_sets += 1;
  t.reps += s.reps ?? 0;
  t.duration_sec += s.duration_sec ?? 0;
  t.distance_m += s.distance_m ?? 0;
  t.volume_kg = round1(t.volume_kg + setVolume(s, metric, ctx));
  return t;
}

/** Totalen over sets; exById koppelt workout_exercise_id aan de oefening-snapshot. */
export function totalsFor(
  sets: (SetLike & { workout_exercise_id: string })[],
  exById: Map<string, ExLike>,
  ctx: VolumeContext = DEFAULT_VOLUME_CTX,
): Totals {
  const t = emptyTotals();
  for (const s of sets) {
    const ex = exById.get(s.workout_exercise_id);
    if (ex) addSet(t, s, ex.metric_type, ctx);
  }
  return t;
}

export interface MuscleSetCount {
  primary: number; // directe sets (primaire spiergroep)
  secondary: number; // sets waarbij de spier secundair meewerkte
  counted: number; // volgens actieve telmethode
}

/**
 * Telt werksets per spiergroep.
 * - "primary": primaire spier = 1 set; secundaire spieren worden apart geregistreerd maar niet meegeteld.
 * - "weighted": primaire spier = 1, secundaire spier = 0,5.
 */
export function muscleSetCounts(
  items: { ex: ExLike; set: Pick<WorkoutSet, "set_type" | "completed"> }[],
  method: SetCountMethod,
): Map<MuscleId, MuscleSetCount> {
  const out = new Map<MuscleId, MuscleSetCount>();
  const get = (m: MuscleId) => {
    let v = out.get(m);
    if (!v) out.set(m, (v = { primary: 0, secondary: 0, counted: 0 }));
    return v;
  };
  for (const { ex, set } of items) {
    if (!isWorkingSet(set)) continue;
    const p = get(ex.primary_muscle);
    p.primary += 1;
    p.counted += 1;
    for (const m of ex.secondary_muscles) {
      if (m === ex.primary_muscle) continue;
      const sc = get(m);
      sc.secondary += 1;
      if (method === "weighted") sc.counted += 0.5;
    }
  }
  return out;
}

export const COUNT_METHOD_LABEL: Record<SetCountMethod, string> = {
  primary: "Primair = 1 set, secundair apart geregistreerd",
  weighted: "Gewogen: primair = 1, secundair = 0,5",
};

/** Geschatte 1RM volgens Epley: gewicht × (1 + reps/30). Alleen zinvol tot 12 reps. */
export function estimate1RM(weight: number | null, reps: number | null): number | null {
  if (!weight || !reps || weight <= 0 || reps <= 0 || reps > 12) return null;
  if (reps === 1) return weight;
  return round1(weight * (1 + reps / 30));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatKg(n: number, unit: "kg" | "lb" = "kg"): string {
  const v = unit === "lb" ? n * 2.20462 : n;
  return `${v.toLocaleString("nl-NL", { maximumFractionDigits: v >= 1000 ? 0 : 1 })} ${unit}`;
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: digits });
}

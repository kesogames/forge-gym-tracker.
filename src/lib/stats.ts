import type { MuscleId, SetCountMethod, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/lib/types";
import { emptyTotals, addSet, muscleSetCounts, setVolume, isWorkingSet, estimate1RM, type Totals, type VolumeContext } from "@/lib/domain/volume";
import { isMobilityExercise } from "@/lib/data/exercises";
import { inRange, type Range, weekKey, addDays, startOfWeek, toYmd } from "@/lib/domain/periods";

export interface BundleLike {
  session: WorkoutSession;
  exercises: WorkoutExercise[];
  sets: WorkoutSet[];
}

// Mobiliteit en stretchen tellen niet mee als werksets, volume of spiersets.
const training = (exs: WorkoutExercise[]) => exs.filter((e) => !isMobilityExercise(e.exercise_id));

export function sessionTotals(b: BundleLike, ctx: VolumeContext): Totals {
  const exById = new Map(training(b.exercises).map((e) => [e.id, e]));
  const t = emptyTotals();
  for (const s of b.sets) {
    const ex = exById.get(s.workout_exercise_id);
    if (ex) addSet(t, s, ex.metric_type, ctx);
  }
  return t;
}

export function sessionMuscles(b: BundleLike, method: SetCountMethod) {
  const exById = new Map(training(b.exercises).map((e) => [e.id, e]));
  return muscleSetCounts(
    b.sets.flatMap((s) => {
      const ex = exById.get(s.workout_exercise_id);
      return ex ? [{ ex, set: s }] : [];
    }),
    method,
  );
}

export interface Filters {
  range: Range;
  exerciseId?: string | null;
  muscle?: MuscleId | null;
  templateId?: string | null;
}

/** Past dashboardfilters toe. Oefening/spier filtert op set-niveau; schema op trainingsniveau. */
export function applyFilters<B extends BundleLike>(bundles: B[], f: Filters): B[] {
  return bundles
    .filter((b) => inRange(b.session.started_at, f.range))
    .filter((b) => !f.templateId || b.session.template_id === f.templateId)
    .map((b) => {
      if (!f.exerciseId && !f.muscle) return b;
      const exercises = b.exercises.filter((e) => (!f.exerciseId || e.exercise_id === f.exerciseId) && (!f.muscle || e.primary_muscle === f.muscle || e.secondary_muscles.includes(f.muscle)));
      const ids = new Set(exercises.map((e) => e.id));
      return { ...b, exercises, sets: b.sets.filter((s) => ids.has(s.workout_exercise_id)) };
    })
    .filter((b) => (!f.exerciseId && !f.muscle) || b.exercises.length > 0);
}

export interface PeriodStats extends Totals {
  sessions: number;
  duration_sec: number;
  active_sec: number;
  muscles: Map<MuscleId, { primary: number; secondary: number; counted: number; sessions: number; last: string | null }>;
}

export function periodStats(bundles: BundleLike[], ctx: VolumeContext, method: SetCountMethod): PeriodStats {
  const t: PeriodStats = { ...emptyTotals(), sessions: 0, duration_sec: 0, active_sec: 0, muscles: new Map() };
  for (const b of bundles) {
    t.sessions++;
    t.duration_sec += b.session.total_duration_sec ?? 0;
    t.active_sec += b.session.active_duration_sec ?? b.session.total_duration_sec ?? 0;
    const st = sessionTotals(b, ctx);
    t.volume_kg += st.volume_kg;
    t.working_sets += st.working_sets;
    t.reps += st.reps;
    t.distance_m += st.distance_m;
    // tijd van tijdgebaseerde sets
    const m = sessionMuscles(b, method);
    for (const [k, v] of m) {
      const cur = t.muscles.get(k) ?? { primary: 0, secondary: 0, counted: 0, sessions: 0, last: null };
      cur.primary += v.primary;
      cur.secondary += v.secondary;
      cur.counted += v.counted;
      if (v.primary > 0 || v.counted > 0) {
        cur.sessions++;
        if (!cur.last || b.session.started_at > cur.last) cur.last = b.session.started_at;
      }
      t.muscles.set(k, cur);
    }
  }
  t.volume_kg = Math.round(t.volume_kg * 10) / 10;
  return t;
}

/** Weekreeks voor grafieken: laatste `weeks` weken t/m de huidige week. */
export function weeklySeries(bundles: BundleLike[], ctx: VolumeContext, weeks: number, now = new Date()) {
  const start = addDays(startOfWeek(now), -7 * (weeks - 1));
  const rows: { week: string; label: string; volume: number; sets: number; sessions: number; minutes: number }[] = [];
  for (let i = 0; i < weeks; i++) {
    const w = addDays(start, i * 7);
    rows.push({ week: toYmd(w), label: w.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }), volume: 0, sets: 0, sessions: 0, minutes: 0 });
  }
  const idx = new Map(rows.map((r, i) => [r.week, i]));
  for (const b of bundles) {
    const i = idx.get(weekKey(new Date(b.session.started_at)));
    if (i === undefined) continue;
    const t = sessionTotals(b, ctx);
    rows[i].volume += t.volume_kg;
    rows[i].sets += t.working_sets;
    rows[i].sessions++;
    rows[i].minutes += Math.round((b.session.total_duration_sec ?? 0) / 60);
  }
  for (const r of rows) r.volume = Math.round(r.volume);
  return rows;
}

export interface ExercisePoint {
  date: string;
  session_id: string;
  best_weight: number | null;
  best_reps: number | null;
  best_e1rm: number | null;
  volume: number;
  sets: number;
  total_reps: number;
  best_set: string;
  duration: number | null;
  distance: number | null;
}

/** Progressie per training voor één oefening. */
export function exerciseHistory(bundles: BundleLike[], exerciseId: string, ctx: VolumeContext): ExercisePoint[] {
  const out: ExercisePoint[] = [];
  for (const b of [...bundles].sort((x, y) => x.session.started_at.localeCompare(y.session.started_at))) {
    const wes = b.exercises.filter((e) => e.exercise_id === exerciseId);
    if (!wes.length) continue;
    const ids = new Set(wes.map((w) => w.id));
    const sets = b.sets.filter((s) => ids.has(s.workout_exercise_id) && isWorkingSet(s));
    if (!sets.length) continue;
    const metric = wes[0].metric_type;
    let bw: number | null = null, br: number | null = null, be: number | null = null, vol = 0, reps = 0, dur: number | null = null, dist: number | null = null;
    let bestSet: WorkoutSet | null = null;
    for (const s of sets) {
      vol += setVolume(s, metric, ctx);
      reps += s.reps ?? 0;
      if (s.weight_kg != null && (bw == null || s.weight_kg > bw)) bw = s.weight_kg;
      if (s.reps != null && (br == null || s.reps > br)) br = s.reps;
      const e = metric === "weight_reps" ? estimate1RM(s.weight_kg, s.reps) : null;
      if (e != null && (be == null || e > be)) {
        be = e;
        bestSet = s;
      }
      if (s.duration_sec != null) dur = Math.max(dur ?? 0, s.duration_sec);
      if (s.distance_m != null) dist = Math.max(dist ?? 0, s.distance_m);
    }
    bestSet ??= sets.reduce((a, s) => ((s.weight_kg ?? 0) * (s.reps ?? 0) > (a.weight_kg ?? 0) * (a.reps ?? 0) ? s : a), sets[0]);
    out.push({
      date: b.session.started_at,
      session_id: b.session.id,
      best_weight: bw,
      best_reps: br,
      best_e1rm: be,
      volume: Math.round(vol * 10) / 10,
      sets: sets.length,
      total_reps: reps,
      best_set: bestSet.weight_kg != null && bestSet.reps != null ? `${bestSet.weight_kg.toLocaleString("nl-NL")} kg × ${bestSet.reps}` : bestSet.reps != null ? `${bestSet.reps} reps` : bestSet.duration_sec != null ? `${bestSet.duration_sec} s` : "–",
      duration: dur,
      distance: dist,
    });
  }
  return out;
}

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

import type { ExercisePR, PRType, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/lib/types";
import { estimate1RM, isWorkingSet, round1 } from "./volume";

// Persoonlijke records worden altijd volledig herberekend uit de historie
// (chronologisch, met een lopend 'beste tot nu toe'). Daardoor zijn ze
// idempotent: opnieuw opslaan of een oude training bewerken levert nooit
// dubbele records op. Een eerste uitvoering is geen record (er is niets om te verbeteren).

export const PR_LABEL: Record<PRType, string> = {
  max_weight: "Zwaarste gewicht",
  e1rm: "Geschatte 1RM",
  max_set_volume: "Beste set (volume)",
  max_reps: "Meeste herhalingen",
  max_duration: "Langste tijd",
  max_distance: "Langste afstand",
};

export const PR_UNIT: Record<PRType, string> = {
  max_weight: "kg",
  e1rm: "kg",
  max_set_volume: "kg",
  max_reps: "reps",
  max_duration: "s",
  max_distance: "m",
};

type Ex = Pick<WorkoutExercise, "id" | "exercise_id" | "metric_type">;
type St = Pick<WorkoutSet, "id" | "workout_exercise_id" | "set_type" | "completed" | "weight_kg" | "reps" | "duration_sec" | "distance_m">;

/** Kandidaatwaarden die één set oplevert. */
export function setCandidates(ex: Pick<Ex, "metric_type">, s: St): Partial<Record<PRType, number>> {
  if (!isWorkingSet(s)) return {};
  const out: Partial<Record<PRType, number>> = {};
  const w = s.weight_kg ?? 0;
  const r = s.reps ?? 0;
  switch (ex.metric_type) {
    case "weight_reps":
    case "custom":
      if (w > 0 && r > 0) {
        out.max_weight = w;
        out.max_set_volume = round1(w * r);
        const e = estimate1RM(w, r);
        if (e && ex.metric_type === "weight_reps") out.e1rm = e;
      } else if (w > 0) out.max_weight = w;
      if (s.distance_m) out.max_distance = s.distance_m;
      break;
    case "bodyweight_reps":
      if (w > 0) out.max_weight = w; // extra gewicht
      else if (r > 0) out.max_reps = r;
      break;
    case "assisted":
      // minder ondersteuning is beter; niet als record gemodelleerd, wel reps zonder vergelijking
      break;
    case "time":
      if (s.duration_sec) out.max_duration = s.duration_sec;
      break;
    case "distance":
      if (s.distance_m) out.max_distance = s.distance_m;
      break;
  }
  return out;
}

export interface SessionBundle {
  session: Pick<WorkoutSession, "id" | "started_at" | "ended_at" | "status">;
  exercises: Ex[];
  sets: St[];
}

/**
 * Berekent alle PR's over alle voltooide trainingen. Retourneert records met
 * deterministische id's: `${exercise_id}:${type}:${session_id}` (max. één per type per oefening per sessie).
 */
export function computeAllPRs(bundles: SessionBundle[]): ExercisePR[] {
  const done = bundles
    .filter((b) => b.session.status === "completed")
    .sort((a, b) => a.session.started_at.localeCompare(b.session.started_at));
  const best = new Map<string, number>(); // `${exercise_id}:${type}` → waarde
  const out: ExercisePR[] = [];
  for (const b of done) {
    const exById = new Map(b.exercises.map((e) => [e.id, e]));
    // beste waarde per (oefening,type) binnen deze sessie
    const sessionBest = new Map<string, { value: number; set_id: string; exercise_id: string; type: PRType }>();
    for (const s of b.sets) {
      const ex = exById.get(s.workout_exercise_id);
      if (!ex) continue;
      const cands = setCandidates(ex, s);
      for (const [type, value] of Object.entries(cands) as [PRType, number][]) {
        const key = `${ex.exercise_id}:${type}`;
        const cur = sessionBest.get(key);
        if (!cur || value > cur.value) sessionBest.set(key, { value, set_id: s.id, exercise_id: ex.exercise_id, type });
      }
    }
    for (const [key, v] of sessionBest) {
      const prev = best.get(key);
      if (prev !== undefined && v.value > prev) {
        out.push({
          id: `${v.exercise_id}:${v.type}:${b.session.id}`,
          exercise_id: v.exercise_id,
          type: v.type,
          value: v.value,
          previous_value: prev,
          session_id: b.session.id,
          set_id: v.set_id,
          achieved_at: b.session.ended_at ?? b.session.started_at,
          updated_at: b.session.ended_at ?? b.session.started_at,
        });
      }
      if (prev === undefined || v.value > prev) best.set(key, v.value);
    }
  }
  return out;
}

/** Live-check tijdens een training: verslaat deze set het beste uit eerdere trainingen? */
export function liveSetPRs(
  ex: Pick<Ex, "metric_type">,
  s: St,
  historicBest: Partial<Record<PRType, number>>,
): PRType[] {
  const cands = setCandidates(ex, s);
  return (Object.entries(cands) as [PRType, number][])
    .filter(([t, v]) => historicBest[t] !== undefined && v > (historicBest[t] as number))
    .map(([t]) => t);
}

export function bestByType(ex: Pick<Ex, "metric_type">, sets: St[]): Partial<Record<PRType, number>> {
  const out: Partial<Record<PRType, number>> = {};
  for (const s of sets) {
    for (const [t, v] of Object.entries(setCandidates(ex, s)) as [PRType, number][]) {
      if (out[t] === undefined || v > (out[t] as number)) out[t] = v;
    }
  }
  return out;
}

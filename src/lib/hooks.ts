"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db/db";
import { DEFAULT_SETTINGS, getSettings, loadBundles, groupBy } from "@/lib/db/repo";
import { EXERCISES } from "@/lib/data/exercises";
import type { Exercise, UserSettings } from "@/lib/types";

/** Huidige tijd, ververst elke `ms` en direct bij terugkeer naar de app. */
export function useNow(ms = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      // uitlijnen op hele seconden zodat de klok niet 'verspringt'
      t = setTimeout(tick, ms - (Date.now() % ms) + 5);
    };
    tick();
    const vis = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", vis);
    window.addEventListener("pageshow", vis);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("focus", vis);
      window.removeEventListener("pageshow", vis);
    };
  }, [ms, enabled]);
  return now;
}

export function useSettings(): UserSettings {
  return useLiveQuery(getSettings, [], { ...DEFAULT_SETTINGS, updated_at: "" });
}

export function useActiveSession() {
  // undefined = laden, null = geen actieve training
  return useLiveQuery(async () => (await db().workout_sessions.where("status").equals("active").first()) ?? null, []);
}

export function useAllExercises(): Exercise[] {
  const custom = useLiveQuery(() => db().custom_exercises.toArray(), [], []);
  return useMemo(() => [...EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name, "nl")), [custom]);
}

export function useExerciseMap(): Map<string, Exercise> {
  const all = useAllExercises();
  return useMemo(() => new Map(all.map((e) => [e.id, e])), [all]);
}

export type Bundle = Awaited<ReturnType<typeof loadBundles>>[number];

/** Alle afgeronde (en optioneel afgebroken) trainingen met oefeningen en sets. */
export function useBundles(includeAborted = false): Bundle[] | undefined {
  return useLiveQuery(() => loadBundles(includeAborted ? ["completed", "aborted"] : ["completed"]), [includeAborted]);
}

export function useLatestBodyweight(): number | null {
  return useLiveQuery(async () => (await db().body_weight_entries.orderBy("date").last())?.weight_kg ?? null, [], null);
}

export function useSessionDetail(id: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;
    const session = await db().workout_sessions.get(id);
    if (!session) return null;
    const exercises = (await db().workout_exercises.where("session_id").equals(id).toArray()).sort((a, b) => a.position - b.position);
    const sets = await db().workout_sets.where("session_id").equals(id).toArray();
    const byEx = groupBy(sets, (s) => s.workout_exercise_id);
    for (const l of byEx.values()) l.sort((a, b) => a.position - b.position);
    const prs = await db().exercise_prs.where("session_id").equals(id).toArray();
    return { session, exercises, setsByExercise: byEx, prs };
  }, [id]);
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

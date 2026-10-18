import type { Table } from "dexie";
import { db, SYNCED_TABLES, type SyncedTable } from "./db";
import { notifyLocalWrite, setSave } from "./status";
import {
  bodyWeightSchema,
  customExerciseSchema,
  exportSchema,
  setPatchSchema,
  settingsPatchSchema,
  templateFullSchema,
  type TemplateFullInput,
} from "./schemas";
import { EXERCISE_BY_ID, EXERCISES } from "@/lib/data/exercises";
import { MUSCLES } from "@/lib/data/muscles";
import { closeOpenIntervals, isPaused, restRemainingMs } from "@/lib/domain/time";
import { activeMs, restMs, totalMs } from "@/lib/domain/time";
import { computeAllPRs } from "@/lib/domain/records";
import { ACHIEVEMENTS, type AggregateStats, weekStreaks } from "@/lib/domain/gamification";
import { isWorkingSet, setVolume, round1, type VolumeContext } from "@/lib/domain/volume";
import type {
  BodyWeightEntry,
  CustomExercise,
  Exercise,
  ExercisePR,
  MuscleGroupGoal,
  MuscleId,
  Template,
  TemplateDay,
  TemplateExercise,
  UserAchievement,
  UserSettings,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/types";

// Data-toegangslaag. Alle schrijfacties lopen via deze module zodat:
// - updated_at consequent gezet wordt,
// - elke wijziging in de outbox komt (voor sync),
// - de zichtbare opslagstatus klopt.

export const nowIso = () => new Date().toISOString();

export function uid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback voor niet-beveiligde contexten (bijv. http via LAN-IP op telefoon)
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function table<T>(name: SyncedTable): Table<T, string> {
  return db().table(name) as Table<T, string>;
}

/** Voert schrijfacties uit in één transactie over de opgegeven tabellen + outbox. */
async function write<R>(tables: SyncedTable[], fn: () => Promise<R>): Promise<R> {
  setSave("saving");
  try {
    const d = db();
    const r = await d.transaction("rw", [...tables.map((t) => d.table(t)), d.outbox], fn);
    setSave("saved");
    notifyLocalWrite();
    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setSave("error", msg);
    throw e;
  }
}

async function put<T extends { id: string; updated_at: string }>(name: SyncedTable, row: T): Promise<T> {
  const r = { ...row, updated_at: nowIso() };
  await table<T>(name).put(r);
  await db().outbox.add({ table: name, row_id: r.id, op: "put", at: r.updated_at });
  return r;
}

async function del(name: SyncedTable, id: string) {
  await table(name).delete(id);
  await db().outbox.add({ table: name, row_id: id, op: "delete", at: nowIso() });
}

async function patch<T extends { id: string; updated_at: string }>(name: SyncedTable, id: string, p: Partial<T>): Promise<T | undefined> {
  const cur = await table<T>(name).get(id);
  if (!cur) return undefined;
  return put(name, { ...cur, ...p });
}

// ───────────────────────────── Instellingen

export const DEFAULT_SETTINGS: Omit<UserSettings, "updated_at"> = {
  id: "me",
  display_name: "",
  theme: "dark",
  unit: "kg",
  weekly_workout_goal: 3,
  set_count_method: "primary",
  include_bodyweight_volume: false,
  default_rest: 90,
  auto_start_rest: true,
  rest_notifications: true,
  rest_sound: true,
  favorite_exercises: [],
  onboarded: false,
};

export async function getSettings(): Promise<UserSettings> {
  const s = await db().user_settings.get("me");
  return { ...DEFAULT_SETTINGS, updated_at: "", ...s };
}

export async function updateSettings(p: Partial<UserSettings>) {
  const v = settingsPatchSchema.parse(p);
  return write(["user_settings"], async () => {
    const cur = await getSettings();
    return put("user_settings", { ...cur, ...v });
  });
}

export async function toggleFavoriteExercise(exerciseId: string) {
  const s = await getSettings();
  const fav = s.favorite_exercises.includes(exerciseId)
    ? s.favorite_exercises.filter((x) => x !== exerciseId)
    : [...s.favorite_exercises, exerciseId];
  return updateSettings({ favorite_exercises: fav });
}

// ───────────────────────────── Oefeningen

export async function allExercises(): Promise<Exercise[]> {
  const custom = await db().custom_exercises.toArray();
  return [...EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

export async function resolveExercise(id: string): Promise<Exercise | undefined> {
  return EXERCISE_BY_ID.get(id) ?? (await db().custom_exercises.get(id));
}

export function alternativesFor(ex: Exercise, all: Exercise[]): Exercise[] {
  return all
    .filter((x) => x.id !== ex.id && (x.pattern === ex.pattern || (x.primary_muscle === ex.primary_muscle && x.mechanic === ex.mechanic)))
    .sort((a, b) => Number(b.pattern === ex.pattern) - Number(a.pattern === ex.pattern))
    .slice(0, 8);
}

export async function saveCustomExercise(input: unknown, id?: string): Promise<CustomExercise> {
  const v = customExerciseSchema.parse(input);
  return write(["custom_exercises"], async () => {
    const existing = id ? await db().custom_exercises.get(id) : undefined;
    const row: CustomExercise = {
      id: existing?.id ?? `custom-${uid()}`,
      ...v,
      mechanic: v.secondary_muscles.length >= 2 ? "compound" : "isolation",
      pattern: `custom-${v.primary_muscle}`,
      is_custom: true,
      created_at: existing?.created_at ?? nowIso(),
      updated_at: nowIso(),
    };
    return put("custom_exercises", row);
  });
}

export async function deleteCustomExercise(id: string) {
  return write(["custom_exercises"], () => del("custom_exercises", id));
}

export async function setExerciseNote(exerciseId: string, text: string) {
  return write(["exercise_notes"], async () => {
    if (!text.trim()) return del("exercise_notes", exerciseId);
    await put("exercise_notes", { id: exerciseId, exercise_id: exerciseId, text: text.slice(0, 1000), updated_at: "" });
  });
}

// ───────────────────────────── Schema's

export interface TemplateFull {
  template: Template;
  days: (TemplateDay & { exercises: TemplateExercise[] })[];
}

export async function getTemplateFull(id: string): Promise<TemplateFull | undefined> {
  const template = await db().templates.get(id);
  if (!template) return undefined;
  const days = (await db().template_days.where("template_id").equals(id).toArray()).sort((a, b) => a.position - b.position);
  const exs = await db().template_exercises.where("template_id").equals(id).toArray();
  return {
    template,
    days: days.map((d) => ({
      ...d,
      exercises: exs.filter((e) => e.template_day_id === d.id).sort((a, b) => a.position - b.position),
    })),
  };
}

/**
 * Slaat een volledig schema atomair op. Uitgevoerde trainingen bevatten een eigen
 * momentopname, dus wijzigen of verwijderen van schema-onderdelen raakt de historie niet.
 */
export async function saveTemplateFull(input: TemplateFullInput): Promise<string> {
  const v = templateFullSchema.parse(input);
  return write(["templates", "template_days", "template_exercises"], async () => {
    const existing = await db().templates.get(v.template.id);
    const t: Template = {
      ...v.template,
      created_at: existing?.created_at ?? nowIso(),
      updated_at: "",
    };
    await put("templates", t);
    const oldDays = await db().template_days.where("template_id").equals(t.id).toArray();
    const oldExs = await db().template_exercises.where("template_id").equals(t.id).toArray();
    const keepDays = new Set(v.days.map((d) => d.id));
    const keepExs = new Set(v.days.flatMap((d) => d.exercises.map((e) => e.id)));
    for (const d of oldDays) if (!keepDays.has(d.id)) await del("template_days", d.id);
    for (const e of oldExs) if (!keepExs.has(e.id)) await del("template_exercises", e.id);
    for (const [di, d] of v.days.entries()) {
      await put<TemplateDay>("template_days", { id: d.id, template_id: t.id, name: d.name, position: di, updated_at: "" });
      for (const [ei, e] of d.exercises.entries()) {
        await put<TemplateExercise>("template_exercises", { ...e, template_day_id: d.id, template_id: t.id, position: ei, updated_at: "" });
      }
    }
    return t.id;
  });
}

export async function duplicateTemplate(id: string): Promise<string | undefined> {
  const full = await getTemplateFull(id);
  if (!full) return;
  return saveTemplateFull({
    template: { ...full.template, id: uid(), name: `${full.template.name} (kopie)`, favorite: false, archived: false },
    days: full.days.map((d) => ({ id: uid(), name: d.name, exercises: d.exercises.map((e) => ({ ...e, id: uid() })) })),
  });
}

export async function setTemplateFlags(id: string, p: Partial<Pick<Template, "favorite" | "archived">>) {
  return write(["templates"], () => patch<Template>("templates", id, p));
}

export async function deleteTemplate(id: string) {
  return write(["templates", "template_days", "template_exercises"], async () => {
    for (const e of await db().template_exercises.where("template_id").equals(id).toArray()) await del("template_exercises", e.id);
    for (const d of await db().template_days.where("template_id").equals(id).toArray()) await del("template_days", d.id);
    await del("templates", id);
  });
}

// ───────────────────────────── Trainingen

const SESSION_TABLES: SyncedTable[] = ["workout_sessions", "workout_exercises", "workout_sets"];

export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  return db().workout_sessions.where("status").equals("active").first();
}

export interface PreviousPerformance {
  session: WorkoutSession;
  workoutExercise: WorkoutExercise;
  sets: WorkoutSet[];
}

/** Meest recente voltooide uitvoering van een oefening vóór `beforeIso`, met minstens één voltooide set. */
export async function getPreviousPerformance(exerciseId: string, beforeIso: string, excludeSessionId?: string): Promise<PreviousPerformance | undefined> {
  const wes = await db().workout_exercises.where("exercise_id").equals(exerciseId).toArray();
  if (!wes.length) return;
  const sessions = await db().workout_sessions.bulkGet([...new Set(wes.map((w) => w.session_id))]);
  const candidates = sessions
    .filter((s): s is WorkoutSession => !!s && s.status === "completed" && s.id !== excludeSessionId && s.started_at < beforeIso)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
  for (const s of candidates) {
    for (const we of wes.filter((w) => w.session_id === s.id).sort((a, b) => a.position - b.position)) {
      const sets = (await db().workout_sets.where("workout_exercise_id").equals(we.id).toArray())
        .filter((x) => x.completed)
        .sort((a, b) => a.position - b.position);
      if (sets.length) return { session: s, workoutExercise: we, sets };
    }
  }
}

function snapshot(ex: Exercise): Pick<WorkoutExercise, "exercise_id" | "exercise_name" | "exercise_image" | "primary_muscle" | "secondary_muscles" | "metric_type" | "metrics" | "unilateral"> {
  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    exercise_image: ex.image,
    primary_muscle: ex.primary_muscle,
    secondary_muscles: [...ex.secondary_muscles],
    metric_type: ex.metric_type,
    metrics: [...ex.metrics],
    unilateral: ex.unilateral,
  };
}

function blankSet(sessionId: string, weId: string, position: number, p: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: uid(),
    session_id: sessionId,
    workout_exercise_id: weId,
    position,
    set_type: "normal",
    weight_kg: null,
    reps: null,
    duration_sec: null,
    distance_m: null,
    rpe: null,
    rir: null,
    completed: false,
    completed_at: null,
    notes: "",
    updated_at: "",
    ...p,
  };
}

interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rest_seconds: number;
  target_weight: number | null;
  superset_group: string | null;
  notes: string;
  /** Optionele expliciete waarden per set (bij herhalen van een oude training). */
  values?: Partial<WorkoutSet>[];
}

async function addPlannedExercise(session: WorkoutSession, position: number, p: PlannedExercise): Promise<WorkoutExercise> {
  const we: WorkoutExercise = {
    id: uid(),
    session_id: session.id,
    position,
    ...snapshot(p.exercise),
    superset_group: p.superset_group,
    rest_seconds: p.rest_seconds,
    target_sets: p.sets,
    rep_min: p.rep_min,
    rep_max: p.rep_max,
    target_weight: p.target_weight,
    notes: p.notes,
    updated_at: "",
  };
  await put("workout_exercises", we);
  const prev = p.values ? undefined : await getPreviousPerformance(p.exercise.id, session.started_at, session.id);
  const prevWork = prev?.sets.filter((s) => s.set_type !== "warmup") ?? [];
  for (let i = 0; i < p.sets; i++) {
    const src = p.values?.[i] ?? prevWork[i] ?? prevWork[prevWork.length - 1];
    // Vooraf ingevuld, maar NIET voltooid: alleen een expliciete tik telt.
    await put(
      "workout_sets",
      blankSet(session.id, we.id, i, {
        set_type: p.values?.[i]?.set_type ?? "normal",
        weight_kg: src?.weight_kg ?? p.target_weight ?? null,
        reps: src?.reps ?? null,
        duration_sec: src?.duration_sec ?? null,
        distance_m: src?.distance_m ?? null,
      }),
    );
  }
  return we;
}

export type StartSource = { kind: "empty" } | { kind: "template"; templateId: string; dayId: string } | { kind: "repeat"; sessionId: string };

/** Start een training. Er is altijd maximaal één actieve training; bestaat die al, dan wordt die teruggegeven. */
export async function startSession(source: StartSource = { kind: "empty" }): Promise<string> {
  return write([...SESSION_TABLES, "templates", "template_days", "template_exercises", "custom_exercises"], async () => {
    const active = await getActiveSession();
    if (active) return active.id;
    const startedAt = nowIso();
    const session: WorkoutSession = {
      id: uid(),
      name: "Vrije training",
      template_id: null,
      template_day_id: null,
      status: "active",
      started_at: startedAt,
      ended_at: null,
      pauses: [],
      rest_periods: [],
      rest_timer: null,
      total_duration_sec: null,
      active_duration_sec: null,
      rest_duration_sec: null,
      notes: "",
      created_at: startedAt,
      updated_at: "",
    };
    const plan: PlannedExercise[] = [];
    if (source.kind === "template") {
      const full = await getTemplateFull(source.templateId);
      const day = full?.days.find((d) => d.id === source.dayId) ?? full?.days[0];
      if (full && day) {
        session.name = full.days.length > 1 ? `${full.template.name} · ${day.name}` : full.template.name;
        session.template_id = full.template.id;
        session.template_day_id = day.id;
        for (const te of day.exercises) {
          const ex = await resolveExercise(te.exercise_id);
          if (!ex) continue;
          plan.push({ exercise: ex, sets: te.sets, rep_min: te.rep_min, rep_max: te.rep_max, rest_seconds: te.rest_seconds, target_weight: te.target_weight, superset_group: te.superset_group, notes: te.notes });
        }
      }
    } else if (source.kind === "repeat") {
      const old = await db().workout_sessions.get(source.sessionId);
      if (old) {
        session.name = old.name;
        session.template_id = old.template_id;
        session.template_day_id = old.template_day_id;
        const wes = (await db().workout_exercises.where("session_id").equals(old.id).toArray()).sort((a, b) => a.position - b.position);
        for (const we of wes) {
          const ex = (await resolveExercise(we.exercise_id)) ?? snapshotToExercise(we);
          const sets = (await db().workout_sets.where("workout_exercise_id").equals(we.id).toArray()).sort((a, b) => a.position - b.position);
          const used = sets.filter((s) => s.completed);
          const vals = used.length ? used : sets;
          plan.push({ exercise: ex, sets: Math.max(1, vals.length), rep_min: we.rep_min, rep_max: we.rep_max, rest_seconds: we.rest_seconds, target_weight: we.target_weight, superset_group: we.superset_group, notes: "", values: vals });
        }
      }
    }
    await put("workout_sessions", session);
    for (const [i, p] of plan.entries()) await addPlannedExercise(session, i, p);
    return session.id;
  });
}

function snapshotToExercise(we: WorkoutExercise): Exercise {
  return {
    id: we.exercise_id,
    name: we.exercise_name,
    image: we.exercise_image,
    primary_muscle: we.primary_muscle,
    secondary_muscles: we.secondary_muscles,
    equipment: "other",
    metric_type: we.metric_type,
    metrics: we.metrics,
    mechanic: "compound",
    pattern: "unknown",
    instructions: "",
    default_rest: we.rest_seconds,
    unilateral: we.unilateral,
    is_custom: true,
  };
}

export async function addExerciseToSession(sessionId: string, exerciseId: string, sets = 3): Promise<string | undefined> {
  const ex = await resolveExercise(exerciseId);
  const settings = await getSettings();
  if (!ex) return;
  return write(SESSION_TABLES, async () => {
    const session = await db().workout_sessions.get(sessionId);
    if (!session) return;
    const count = await db().workout_exercises.where("session_id").equals(sessionId).count();
    const isTimed = ex.metric_type === "time" || ex.metric_type === "distance";
    const we = await addPlannedExercise(session, count, {
      exercise: ex,
      sets: isTimed ? 1 : sets,
      rep_min: null,
      rep_max: null,
      rest_seconds: ex.default_rest || settings.default_rest,
      target_weight: null,
      superset_group: null,
      notes: "",
    });
    return we.id;
  });
}

/** Vervangt een oefening door een alternatief; voltooide sets blijven bij de oorspronkelijke oefening. */
export async function replaceWorkoutExercise(weId: string, newExerciseId: string) {
  const ex = await resolveExercise(newExerciseId);
  if (!ex) return;
  return write(SESSION_TABLES, async () => {
    const we = await db().workout_exercises.get(weId);
    if (!we) return;
    const sets = await db().workout_sets.where("workout_exercise_id").equals(weId).toArray();
    if (sets.some((s) => s.completed)) throw new Error("Deze oefening heeft al voltooide sets. Voeg het alternatief als nieuwe oefening toe.");
    await put("workout_exercises", { ...we, ...snapshot(ex) });
    const prev = await getPreviousPerformance(ex.id, nowIso());
    const prevWork = prev?.sets.filter((s) => s.set_type !== "warmup") ?? [];
    for (const [i, s] of sets.sort((a, b) => a.position - b.position).entries()) {
      const src = prevWork[i] ?? prevWork[prevWork.length - 1];
      await put("workout_sets", { ...s, weight_kg: src?.weight_kg ?? null, reps: src?.reps ?? null, duration_sec: src?.duration_sec ?? null, distance_m: src?.distance_m ?? null });
    }
  });
}

export async function removeWorkoutExercise(weId: string) {
  return write(SESSION_TABLES, async () => {
    const we = await db().workout_exercises.get(weId);
    if (!we) return;
    for (const s of await db().workout_sets.where("workout_exercise_id").equals(weId).toArray()) await del("workout_sets", s.id);
    await del("workout_exercises", weId);
    const rest = (await db().workout_exercises.where("session_id").equals(we.session_id).toArray()).sort((a, b) => a.position - b.position);
    for (const [i, r] of rest.entries()) if (r.position !== i) await put("workout_exercises", { ...r, position: i });
  });
}

export async function moveWorkoutExercise(weId: string, dir: -1 | 1) {
  return write(SESSION_TABLES, async () => {
    const we = await db().workout_exercises.get(weId);
    if (!we) return;
    const list = (await db().workout_exercises.where("session_id").equals(we.session_id).toArray()).sort((a, b) => a.position - b.position);
    const i = list.findIndex((x) => x.id === weId);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    for (const [k, r] of list.entries()) if (r.position !== k) await put("workout_exercises", { ...r, position: k });
  });
}

export async function updateWorkoutExercise(weId: string, p: Partial<Pick<WorkoutExercise, "notes" | "rest_seconds" | "superset_group">>) {
  return write(SESSION_TABLES, () => patch<WorkoutExercise>("workout_exercises", weId, p));
}

export async function addSet(weId: string, opts: { copyFrom?: string; type?: WorkoutSet["set_type"] } = {}) {
  return write(SESSION_TABLES, async () => {
    const we = await db().workout_exercises.get(weId);
    if (!we) return;
    const sets = (await db().workout_sets.where("workout_exercise_id").equals(weId).toArray()).sort((a, b) => a.position - b.position);
    const src = opts.copyFrom ? sets.find((s) => s.id === opts.copyFrom) : sets[sets.length - 1];
    const s = blankSet(we.session_id, weId, sets.length, {
      set_type: opts.type ?? (src?.set_type === "warmup" && !opts.copyFrom ? "normal" : (src?.set_type ?? "normal")),
      weight_kg: src?.weight_kg ?? null,
      reps: src?.reps ?? null,
      duration_sec: src?.duration_sec ?? null,
      distance_m: src?.distance_m ?? null,
    });
    if (opts.type === "warmup") {
      // warming-up vooraan
      s.position = 0;
      for (const x of sets) await put("workout_sets", { ...x, position: x.position + 1 });
    } else if (opts.copyFrom && src) {
      s.position = src.position + 1;
      for (const x of sets) if (x.position > src.position) await put("workout_sets", { ...x, position: x.position + 1 });
    }
    await put("workout_sets", s);
    return s.id;
  });
}

/**
 * Werkt een set bij. Met `propagate` worden lege waarden in latere, nog niet
 * voltooide sets van dezelfde oefening meteen ingevuld (sneller invoeren).
 */
export async function updateSet(setId: string, p: Partial<WorkoutSet>, opts: { propagate?: boolean } = {}) {
  const v = setPatchSchema.parse(p);
  return write(SESSION_TABLES, async () => {
    const r = await patch<WorkoutSet>("workout_sets", setId, v);
    if (!opts.propagate || !r) return r;
    const keys = (["weight_kg", "reps", "duration_sec", "distance_m"] as const).filter((k) => k in v && v[k] != null);
    if (!keys.length) return r;
    const later = (await db().workout_sets.where("workout_exercise_id").equals(r.workout_exercise_id).toArray()).filter((x) => x.position > r.position && !x.completed && x.set_type === r.set_type);
    for (const x of later) {
      const upd: Partial<WorkoutSet> = {};
      for (const k of keys) if (x[k] == null) upd[k] = v[k] as number;
      if (Object.keys(upd).length) await put("workout_sets", { ...x, ...upd });
    }
    return r;
  });
}

export async function deleteSet(setId: string) {
  return write(SESSION_TABLES, async () => {
    const s = await db().workout_sets.get(setId);
    if (!s) return;
    await del("workout_sets", setId);
    const rest = (await db().workout_sets.where("workout_exercise_id").equals(s.workout_exercise_id).toArray()).sort((a, b) => a.position - b.position);
    for (const [i, r] of rest.entries()) if (r.position !== i) await put("workout_sets", { ...r, position: i });
  });
}

export function missingFieldsForCompletion(we: Pick<WorkoutExercise, "metrics" | "metric_type">, s: Pick<WorkoutSet, "weight_kg" | "reps" | "duration_sec" | "distance_m">): string[] {
  const miss: string[] = [];
  if (we.metrics.includes("reps") && !s.reps) miss.push("herhalingen");
  if (we.metrics.includes("weight") && we.metric_type === "weight_reps" && s.weight_kg == null) miss.push("gewicht");
  if (we.metrics.includes("time") && !we.metrics.includes("distance") && !s.duration_sec) miss.push("tijd");
  if (we.metrics.includes("distance") && !s.distance_m) miss.push("afstand");
  return miss;
}

/**
 * Zet een set op voltooid / niet voltooid. Idempotent: dezelfde aanroep twee keer
 * (dubbele tik) levert hetzelfde resultaat en start de rusttimer niet opnieuw.
 */
export async function setSetCompleted(setId: string, completed: boolean): Promise<{ changed: boolean; restStarted: boolean }> {
  const settings = await getSettings();
  return write(SESSION_TABLES, async () => {
    const s = await db().workout_sets.get(setId);
    if (!s || s.completed === completed) return { changed: false, restStarted: false };
    const we = await db().workout_exercises.get(s.workout_exercise_id);
    const session = await db().workout_sessions.get(s.session_id);
    if (!we || !session) return { changed: false, restStarted: false };
    if (completed) {
      const miss = missingFieldsForCompletion(we, s);
      if (miss.length) throw new Error(`Vul eerst ${miss.join(" en ")} in`);
    }
    const now = nowIso();
    await put("workout_sets", { ...s, completed, completed_at: completed ? now : null });
    let restStarted = false;
    if (completed && session.status === "active" && settings.auto_start_rest) {
      // Bij supersets: pas rusten na de laatste oefening van de groep.
      let rest = we.rest_seconds;
      if (we.superset_group) {
        const group = (await db().workout_exercises.where("session_id").equals(session.id).toArray())
          .filter((x) => x.superset_group === we.superset_group)
          .sort((a, b) => a.position - b.position);
        if (group[group.length - 1]?.id !== we.id) rest = 0;
      }
      if (rest > 0) {
        await put("workout_sessions", startRestOn(session, we.id, rest, now));
        restStarted = true;
      }
    }
    return { changed: true, restStarted };
  });
}

function closeRest(session: WorkoutSession, nowStr: string): WorkoutSession {
  const t = session.rest_timer;
  const periods = session.rest_periods.map((iv) => {
    if (iv.end) return iv;
    const cap = t?.ends_at && t.ends_at < nowStr ? t.ends_at : nowStr;
    return { ...iv, end: cap };
  });
  return { ...session, rest_periods: periods, rest_timer: null };
}

function startRestOn(session: WorkoutSession, weId: string | null, seconds: number, nowStr: string): WorkoutSession {
  const s = closeRest(session, nowStr);
  return {
    ...s,
    rest_periods: [...s.rest_periods, { start: nowStr, end: null }],
    rest_timer: { workout_exercise_id: weId, duration: seconds, started_at: nowStr, ends_at: new Date(new Date(nowStr).getTime() + seconds * 1000).toISOString(), paused_remaining: null },
  };
}

async function updateSession(id: string, fn: (s: WorkoutSession) => WorkoutSession | undefined) {
  return write(["workout_sessions"], async () => {
    const s = await db().workout_sessions.get(id);
    if (!s) return;
    const n = fn(s);
    if (n) await put("workout_sessions", n);
  });
}

export const startRest = (sessionId: string, seconds: number, weId: string | null = null) => updateSession(sessionId, (s) => startRestOn(s, weId, seconds, nowIso()));
export const skipRest = (sessionId: string) => updateSession(sessionId, (s) => closeRest(s, nowIso()));
export const adjustRest = (sessionId: string, delta: number) =>
  updateSession(sessionId, (s) => {
    const t = s.rest_timer;
    if (!t) return;
    if (t.ends_at === null) return { ...s, rest_timer: { ...t, paused_remaining: Math.max(0, (t.paused_remaining ?? 0) + delta) } };
    return { ...s, rest_timer: { ...t, duration: Math.max(0, t.duration + delta), ends_at: new Date(new Date(t.ends_at).getTime() + delta * 1000).toISOString() } };
  });
export const toggleRestPause = (sessionId: string) =>
  updateSession(sessionId, (s) => {
    const t = s.rest_timer;
    if (!t) return;
    if (t.ends_at === null) {
      return { ...s, rest_timer: { ...t, ends_at: new Date(Date.now() + (t.paused_remaining ?? 0) * 1000).toISOString(), paused_remaining: null } };
    }
    return { ...s, rest_timer: { ...t, ends_at: null, paused_remaining: Math.round(restRemainingMs(t) / 1000) } };
  });

export const pauseSession = (id: string) =>
  updateSession(id, (s) => (s.status !== "active" || isPaused(s) ? undefined : { ...s, pauses: [...s.pauses, { start: nowIso(), end: null }] }));
export const resumeSession = (id: string) =>
  updateSession(id, (s) => (!isPaused(s) ? undefined : { ...s, pauses: closeOpenIntervals(s.pauses, nowIso()) }));
export const updateSessionMeta = (id: string, p: Partial<Pick<WorkoutSession, "notes" | "name">>) => updateSession(id, (s) => ({ ...s, ...p }));

export interface FinishResult {
  sessionId: string;
  newPRs: ExercisePR[];
  newAchievements: UserAchievement[];
}

/** Rondt een training af: legt eindtijd en duur vast, verwijdert onaangeroerde lege sets en werkt records bij. */
export async function finishSession(id: string, opts: { discardIncomplete?: boolean } = { discardIncomplete: true }): Promise<FinishResult> {
  await write(SESSION_TABLES, async () => {
    const s = await db().workout_sessions.get(id);
    if (!s || s.status !== "active") return;
    const end = nowIso();
    const closed = closeRest({ ...s, pauses: closeOpenIntervals(s.pauses, end) }, end);
    const final: WorkoutSession = { ...closed, status: "completed", ended_at: end };
    const nowMs = new Date(end).getTime();
    final.total_duration_sec = Math.round(totalMs(final, nowMs) / 1000);
    final.active_duration_sec = Math.round(activeMs(final, nowMs) / 1000);
    final.rest_duration_sec = Math.round(restMs(final, nowMs) / 1000);
    await put("workout_sessions", final);
    if (opts.discardIncomplete) {
      for (const set of await db().workout_sets.where("session_id").equals(id).toArray()) if (!set.completed) await del("workout_sets", set.id);
      // oefeningen zonder enige set verwijderen
      for (const we of await db().workout_exercises.where("session_id").equals(id).toArray()) {
        if ((await db().workout_sets.where("workout_exercise_id").equals(we.id).count()) === 0) await del("workout_exercises", we.id);
      }
    }
  });
  const r = await recomputeRecords(id);
  return { sessionId: id, ...r };
}

/** Breekt een training af. De gegevens blijven bewaard maar tellen niet mee in statistieken. */
export async function abortSession(id: string) {
  await updateSession(id, (s) => {
    const end = nowIso();
    const closed = closeRest({ ...s, pauses: closeOpenIntervals(s.pauses, end) }, end);
    const f: WorkoutSession = { ...closed, status: "aborted", ended_at: end };
    f.total_duration_sec = Math.round(totalMs(f) / 1000);
    f.active_duration_sec = Math.round(activeMs(f) / 1000);
    return f;
  });
}

export async function deleteSession(id: string) {
  await write(SESSION_TABLES, async () => {
    for (const s of await db().workout_sets.where("session_id").equals(id).toArray()) await del("workout_sets", s.id);
    for (const w of await db().workout_exercises.where("session_id").equals(id).toArray()) await del("workout_exercises", w.id);
    await del("workout_sessions", id);
  });
  await recomputeRecords(null);
}

/** Past begin/eindtijd van een afgeronde training aan (correctie achteraf). */
export async function editSessionTimes(id: string, startedAt: string, endedAt: string) {
  if (endedAt <= startedAt) throw new Error("Eindtijd moet na de starttijd liggen");
  await updateSession(id, (s) => {
    const f: WorkoutSession = { ...s, started_at: startedAt, ended_at: endedAt, pauses: s.pauses.filter((p) => p.start >= startedAt && (p.end ?? endedAt) <= endedAt) };
    f.total_duration_sec = Math.round(totalMs(f) / 1000);
    f.active_duration_sec = Math.round(activeMs(f) / 1000);
    return f;
  });
  await recomputeRecords(null);
}

// ───────────────────────────── Records & beloningen

export async function latestBodyweight(): Promise<number | null> {
  const last = await db().body_weight_entries.orderBy("date").last();
  return last?.weight_kg ?? null;
}

export async function volumeContext(): Promise<VolumeContext> {
  const s = await getSettings();
  return { bodyweight_kg: await latestBodyweight(), include_bodyweight: s.include_bodyweight_volume };
}

export async function loadBundles(statuses: WorkoutSession["status"][] = ["completed"]): Promise<{ session: WorkoutSession; exercises: WorkoutExercise[]; sets: WorkoutSet[] }[]> {
  const sessions = (await db().workout_sessions.toArray()).filter((s) => statuses.includes(s.status));
  const ids = new Set(sessions.map((s) => s.id));
  const exs = (await db().workout_exercises.toArray()).filter((e) => ids.has(e.session_id));
  const sets = (await db().workout_sets.toArray()).filter((s) => ids.has(s.session_id));
  const exBySession = groupBy(exs, (e) => e.session_id);
  const setsBySession = groupBy(sets, (s) => s.session_id);
  return sessions.map((s) => ({ session: s, exercises: exBySession.get(s.id) ?? [], sets: setsBySession.get(s.id) ?? [] }));
}

export function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of arr) {
    const k = key(x);
    const l = m.get(k);
    if (l) l.push(x);
    else m.set(k, [x]);
  }
  return m;
}

export async function aggregateStats(bundles: Awaited<ReturnType<typeof loadBundles>>, ctx: VolumeContext, prCount: number): Promise<AggregateStats> {
  let volume = 0;
  let sets = 0;
  let longest = 0;
  let early = 0;
  for (const b of bundles) {
    const exById = new Map(b.exercises.map((e) => [e.id, e]));
    for (const s of b.sets) {
      if (!isWorkingSet(s)) continue;
      sets++;
      const ex = exById.get(s.workout_exercise_id);
      if (ex) volume += setVolume(s, ex.metric_type, ctx);
    }
    longest = Math.max(longest, b.session.total_duration_sec ?? 0);
    if (new Date(b.session.started_at).getHours() < 7) early++;
  }
  const settings = await getSettings();
  const streak = weekStreaks(bundles.map((b) => b.session.started_at), settings.weekly_workout_goal);
  return { sessions: bundles.length, volume_kg: round1(volume), working_sets: sets, prs: prCount, best_week_streak: streak.best, longest_session_sec: longest, early_sessions: early };
}

/**
 * Herberekent alle PR's en kent nieuwe badges toe. Idempotent: PR-id's zijn
 * deterministisch en badges worden op sleutel opgeslagen, dus herhaald aanroepen
 * levert nooit dubbele records of beloningen op.
 */
export async function recomputeRecords(sessionId: string | null): Promise<{ newPRs: ExercisePR[]; newAchievements: UserAchievement[] }> {
  const bundles = await loadBundles();
  const prs = computeAllPRs(bundles);
  const ctx = await volumeContext();
  const stats = await aggregateStats(bundles, ctx, prs.length);
  return write(["exercise_prs", "user_achievements"], async () => {
    const existing = await db().exercise_prs.toArray();
    const next = new Map(prs.map((p) => [p.id, p]));
    for (const e of existing) if (!next.has(e.id)) await del("exercise_prs", e.id);
    const existingById = new Map(existing.map((e) => [e.id, e]));
    for (const p of prs) {
      const cur = existingById.get(p.id);
      if (!cur || cur.value !== p.value || cur.previous_value !== p.previous_value || cur.set_id !== p.set_id) await put("exercise_prs", p);
    }
    const have = new Set((await db().user_achievements.toArray()).map((a) => a.id));
    const newAchievements: UserAchievement[] = [];
    for (const def of ACHIEVEMENTS) {
      if (have.has(def.key) || !def.test(stats)) continue;
      const a = await put<UserAchievement>("user_achievements", { id: def.key, key: def.key, achieved_at: nowIso(), session_id: sessionId, xp: def.xp, updated_at: "" });
      newAchievements.push(a);
    }
    return { newPRs: sessionId ? prs.filter((p) => p.session_id === sessionId) : [], newAchievements };
  });
}

/** Slaat een behaalde maanduitdaging eenmalig op. */
export async function awardChallenge(key: string, xp = 150) {
  const have = await db().user_achievements.get(key);
  if (have) return;
  await write(["user_achievements"], () => put<UserAchievement>("user_achievements", { id: key, key, achieved_at: nowIso(), session_id: null, xp, updated_at: "" }));
}

// ───────────────────────────── Doelen & lichaamsgewicht

export const DEFAULT_GOALS: Partial<Record<MuscleId, number>> = {
  chest: 12,
  back: 14,
  shoulders: 10,
  biceps: 8,
  triceps: 8,
  quads: 10,
  hamstrings: 8,
  glutes: 8,
  calves: 6,
  abs: 6,
};

export async function setMuscleGoal(muscle: MuscleId, sets: number | null) {
  return write(["muscle_group_goals"], async () => {
    if (sets === null || sets <= 0) return del("muscle_group_goals", muscle);
    await put<MuscleGroupGoal>("muscle_group_goals", { id: muscle, muscle, sets_per_week: Math.min(60, Math.round(sets)), updated_at: "" });
  });
}

export async function applyDefaultGoals() {
  return write(["muscle_group_goals"], async () => {
    for (const m of MUSCLES) {
      const v = DEFAULT_GOALS[m.id];
      if (v && !(await db().muscle_group_goals.get(m.id))) await put<MuscleGroupGoal>("muscle_group_goals", { id: m.id, muscle: m.id, sets_per_week: v, updated_at: "" });
    }
  });
}

export async function addBodyWeight(input: { date: string; weight_kg: number; note?: string }) {
  const v = bodyWeightSchema.parse({ note: "", ...input });
  return write(["body_weight_entries"], async () => {
    // één meting per dag: overschrijf bestaande van dezelfde datum
    const same = await db().body_weight_entries.where("date").equals(v.date).first();
    await put<BodyWeightEntry>("body_weight_entries", { id: same?.id ?? uid(), ...v, updated_at: "" });
  });
}

export async function deleteBodyWeight(id: string) {
  return write(["body_weight_entries"], () => del("body_weight_entries", id));
}

// ───────────────────────────── Export / import

export async function exportJSON(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const t of SYNCED_TABLES) tables[t] = await db().table(t).toArray();
  return JSON.stringify({ app: "gymtracker", version: 1, exported_at: nowIso(), tables }, null, 2);
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCSV(): Promise<string> {
  const bundles = await loadBundles(["completed", "aborted"]);
  const rows: unknown[][] = [["datum", "starttijd", "eindtijd", "training", "status", "totale_duur_s", "actieve_duur_s", "oefening", "spiergroep", "set", "type", "gewicht_kg", "herhalingen", "tijd_s", "afstand_m", "rpe", "rir", "voltooid", "volume_kg", "notitie"]];
  bundles.sort((a, b) => a.session.started_at.localeCompare(b.session.started_at));
  const ctx = await volumeContext();
  for (const b of bundles) {
    const exs = [...b.exercises].sort((x, y) => x.position - y.position);
    for (const we of exs) {
      for (const s of b.sets.filter((x) => x.workout_exercise_id === we.id).sort((x, y) => x.position - y.position)) {
        rows.push([
          b.session.started_at.slice(0, 10),
          b.session.started_at,
          b.session.ended_at,
          b.session.name,
          b.session.status,
          b.session.total_duration_sec,
          b.session.active_duration_sec,
          we.exercise_name,
          we.primary_muscle,
          s.position + 1,
          s.set_type,
          s.weight_kg,
          s.reps,
          s.duration_sec,
          s.distance_m,
          s.rpe,
          s.rir,
          s.completed ? "ja" : "nee",
          setVolume(s, we.metric_type, ctx),
          s.notes,
        ]);
      }
    }
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Herstelt een JSON-export (samenvoegen; bestaande rijen met dezelfde id worden overschreven). */
export async function importJSON(text: string): Promise<number> {
  const data = exportSchema.parse(JSON.parse(text));
  let n = 0;
  await write([...SYNCED_TABLES], async () => {
    for (const t of SYNCED_TABLES) {
      const rows = (data.tables[t] ?? []) as { id: string; updated_at: string }[];
      for (const r of rows) {
        if (typeof r.id !== "string") continue;
        if (t === "workout_sessions" && (r as unknown as WorkoutSession).status === "active" && (await getActiveSession())) continue;
        await put(t, r);
        n++;
      }
    }
  });
  await recomputeRecords(null);
  return n;
}

export async function wipeLocalData() {
  const d = db();
  await d.transaction("rw", d.tables, async () => {
    for (const t of d.tables) await t.clear();
  });
  notifyLocalWrite();
}

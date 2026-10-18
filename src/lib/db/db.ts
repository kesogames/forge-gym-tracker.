import Dexie, { type Table } from "dexie";
import type {
  BodyWeightEntry,
  CustomExercise,
  ExerciseNote,
  ExercisePR,
  MuscleGroupGoal,
  Template,
  TemplateDay,
  TemplateExercise,
  UserAchievement,
  UserSettings,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/types";

export interface OutboxEntry {
  seq?: number;
  table: SyncedTable;
  row_id: string;
  op: "put" | "delete";
  at: string;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

/** Tabellen die met Supabase gesynchroniseerd worden (zelfde namen als in Postgres). */
export const SYNCED_TABLES = [
  "custom_exercises",
  "templates",
  "template_days",
  "template_exercises",
  "workout_sessions",
  "workout_exercises",
  "workout_sets",
  "exercise_prs",
  "muscle_group_goals",
  "exercise_notes",
  "user_achievements",
  "body_weight_entries",
  "user_settings",
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export class GymDB extends Dexie {
  custom_exercises!: Table<CustomExercise, string>;
  templates!: Table<Template, string>;
  template_days!: Table<TemplateDay, string>;
  template_exercises!: Table<TemplateExercise, string>;
  workout_sessions!: Table<WorkoutSession, string>;
  workout_exercises!: Table<WorkoutExercise, string>;
  workout_sets!: Table<WorkoutSet, string>;
  exercise_prs!: Table<ExercisePR, string>;
  muscle_group_goals!: Table<MuscleGroupGoal, string>;
  exercise_notes!: Table<ExerciseNote, string>;
  user_achievements!: Table<UserAchievement, string>;
  body_weight_entries!: Table<BodyWeightEntry, string>;
  user_settings!: Table<UserSettings, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaEntry, string>;

  constructor(name = "gymtracker") {
    super(name);
    this.version(1).stores({
      custom_exercises: "id, name, primary_muscle",
      templates: "id, name, archived, favorite, updated_at",
      template_days: "id, template_id, position",
      template_exercises: "id, template_day_id, template_id, exercise_id, position",
      workout_sessions: "id, status, started_at, template_id",
      workout_exercises: "id, session_id, exercise_id, [session_id+position]",
      workout_sets: "id, session_id, workout_exercise_id, [workout_exercise_id+position]",
      exercise_prs: "id, exercise_id, session_id, achieved_at",
      muscle_group_goals: "id",
      exercise_notes: "id",
      user_achievements: "id, achieved_at",
      body_weight_entries: "id, date",
      user_settings: "id",
      outbox: "++seq, table, row_id",
      meta: "key",
    });
  }
}

/** Voorbeeldmodus gebruikt een aparte database, zodat echte gegevens nooit geraakt worden. */
export const DEMO_DB_NAME = "gymtracker-demo";
export function isDemoMode(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("forge-demo") === "1";
  } catch {
    return false;
  }
}

let _db: GymDB | null = null;
export function db(): GymDB {
  if (!_db) _db = new GymDB(isDemoMode() ? DEMO_DB_NAME : "gymtracker");
  return _db;
}

/** Alleen voor tests: vervang de database-instantie. */
export function setDb(instance: GymDB) {
  _db = instance;
}

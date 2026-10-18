// Kern-types. Veldnamen zijn snake_case zodat ze 1-op-1 overeenkomen met de
// Postgres-kolommen in supabase/migrations (generieke sync).

export type MuscleId =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "lower_back"
  | "traps"
  | "adductors"
  | "abductors";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "kettlebell"
  | "ez_bar"
  | "smith"
  | "band"
  | "cardio"
  | "other";

/** Hoe een oefening gemeten wordt. */
export type MetricType =
  | "weight_reps"
  | "bodyweight_reps"
  | "assisted"
  | "time"
  | "distance"
  | "custom";

export type Metric = "weight" | "reps" | "time" | "distance";

export type Mechanic = "compound" | "isolation";

export interface Exercise {
  id: string;
  name: string;
  image: string | null; // pad naar map in /public/exercises of null
  primary_muscle: MuscleId;
  secondary_muscles: MuscleId[];
  equipment: Equipment;
  metric_type: MetricType;
  metrics: Metric[];
  mechanic: Mechanic;
  pattern: string; // bewegingspatroon; basis voor alternatieven
  instructions: string;
  default_rest: number; // seconden
  unilateral: boolean;
  is_custom: boolean;
}

/** Eigen oefening van de gebruiker (opgeslagen in DB). */
export interface CustomExercise extends Exercise {
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  favorite: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateDay {
  id: string;
  template_id: string;
  name: string;
  position: number;
  updated_at: string;
}

export interface TemplateExercise {
  id: string;
  template_day_id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rest_seconds: number;
  target_weight: number | null;
  /** Oefeningen met hetzelfde groepslabel vormen een superset/circuit. */
  superset_group: string | null;
  notes: string;
  updated_at: string;
}

export interface Interval {
  start: string; // ISO 8601 UTC
  end: string | null;
}

export type SessionStatus = "active" | "completed" | "aborted";

export interface RestTimerState {
  workout_exercise_id: string | null;
  duration: number; // ingestelde duur in s
  started_at: string; // ISO
  ends_at: string | null; // ISO, null als gepauzeerd
  paused_remaining: number | null; // s resterend bij pauze
}

export interface WorkoutSession {
  id: string;
  name: string;
  template_id: string | null;
  template_day_id: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  pauses: Interval[];
  rest_periods: Interval[];
  rest_timer: RestTimerState | null;
  total_duration_sec: number | null;
  active_duration_sec: number | null;
  rest_duration_sec: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  position: number;
  // Historische momentopname: wijzigingen aan oefening/schema veranderen dit niet
  exercise_name: string;
  exercise_image: string | null;
  primary_muscle: MuscleId;
  secondary_muscles: MuscleId[];
  metric_type: MetricType;
  metrics: Metric[];
  unilateral: boolean;
  superset_group: string | null;
  rest_seconds: number;
  target_sets: number | null;
  rep_min: number | null;
  rep_max: number | null;
  target_weight: number | null;
  notes: string;
  updated_at: string;
}

export type SetType = "warmup" | "normal" | "drop" | "failure";

export interface WorkoutSet {
  id: string;
  session_id: string;
  workout_exercise_id: string;
  position: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  rpe: number | null;
  rir: number | null;
  completed: boolean;
  completed_at: string | null;
  notes: string;
  updated_at: string;
}

export type PRType = "max_weight" | "e1rm" | "max_set_volume" | "max_reps" | "max_duration" | "max_distance";

export interface ExercisePR {
  id: string; // deterministisch: `${exercise_id}:${type}:${session_id}`
  exercise_id: string;
  type: PRType;
  value: number;
  previous_value: number | null;
  session_id: string;
  set_id: string | null;
  achieved_at: string;
  updated_at: string;
}

export interface MuscleGroupGoal {
  id: string; // = muscle
  muscle: MuscleId;
  sets_per_week: number;
  updated_at: string;
}

export interface ExerciseNote {
  id: string; // = exercise_id
  exercise_id: string;
  text: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string; // = achievement key, uniek per gebruiker
  key: string;
  achieved_at: string;
  session_id: string | null;
  xp: number;
  updated_at: string;
}

export interface BodyWeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight_kg: number;
  note: string;
  updated_at: string;
}

export type SetCountMethod = "primary" | "weighted";

export interface UserSettings {
  id: "me";
  display_name: string;
  theme: "dark" | "light" | "system";
  unit: "kg" | "lb";
  weekly_workout_goal: number;
  set_count_method: SetCountMethod;
  include_bodyweight_volume: boolean;
  default_rest: number;
  auto_start_rest: boolean;
  rest_notifications: boolean;
  rest_sound: boolean;
  favorite_exercises: string[];
  onboarded: boolean;
  updated_at: string;
}

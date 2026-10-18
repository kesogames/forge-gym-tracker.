import { z } from "zod";

const muscle = z.enum(["chest", "back", "shoulders", "biceps", "triceps", "forearms", "abs", "quads", "hamstrings", "glutes", "calves", "lower_back", "traps", "adductors", "abductors"]);
const equipment = z.enum(["barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "ez_bar", "smith", "band", "cardio", "other"]);
const metricType = z.enum(["weight_reps", "bodyweight_reps", "assisted", "time", "distance", "custom"]);
const metric = z.enum(["weight", "reps", "time", "distance"]);

const nonNeg = (max: number) => z.number().finite().min(0).max(max);

export const setPatchSchema = z
  .object({
    weight_kg: nonNeg(2000).nullable(),
    reps: z.number().int().min(0).max(1000).nullable(),
    duration_sec: z.number().int().min(0).max(86_400).nullable(),
    distance_m: nonNeg(1_000_000).nullable(),
    rpe: z.number().min(1).max(10).nullable(),
    rir: z.number().int().min(0).max(10).nullable(),
    set_type: z.enum(["warmup", "normal", "drop", "failure"]),
    notes: z.string().max(1000),
  })
  .partial();

export const templateExerciseSchema = z.object({
  id: z.string().min(1),
  exercise_id: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  rep_min: z.number().int().min(0).max(1000).nullable(),
  rep_max: z.number().int().min(0).max(1000).nullable(),
  rest_seconds: z.number().int().min(0).max(1800),
  target_weight: nonNeg(2000).nullable(),
  superset_group: z.string().max(8).nullable(),
  notes: z.string().max(1000),
});

export const templateFullSchema = z.object({
  template: z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1, "Geef het schema een naam").max(80),
    description: z.string().max(500),
    favorite: z.boolean(),
    archived: z.boolean(),
  }),
  days: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1, "Geef elke trainingsdag een naam").max(60),
        exercises: z.array(templateExerciseSchema),
      }),
    )
    .min(1, "Voeg minimaal één trainingsdag toe"),
});
export type TemplateFullInput = z.infer<typeof templateFullSchema>;

export const customExerciseSchema = z.object({
  name: z.string().trim().min(2, "Naam is te kort").max(80),
  primary_muscle: muscle,
  secondary_muscles: z.array(muscle).max(6),
  equipment,
  metric_type: metricType,
  metrics: z.array(metric).min(1, "Kies minimaal één meetwaarde"),
  instructions: z.string().max(1000),
  default_rest: z.number().int().min(0).max(1800),
  unilateral: z.boolean(),
  image: z.string().max(400_000).nullable(), // eigen foto als verkleinde data-URL
});

export const settingsPatchSchema = z
  .object({
    display_name: z.string().max(40),
    theme: z.enum(["dark", "light", "system"]),
    unit: z.enum(["kg", "lb"]),
    weekly_workout_goal: z.number().int().min(1).max(14),
    set_count_method: z.enum(["primary", "weighted"]),
    include_bodyweight_volume: z.boolean(),
    default_rest: z.number().int().min(0).max(1800),
    auto_start_rest: z.boolean(),
    rest_notifications: z.boolean(),
    rest_sound: z.boolean(),
    favorite_exercises: z.array(z.string()),
    onboarded: z.boolean(),
  })
  .partial();

export const bodyWeightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().min(20).max(400),
  note: z.string().max(200),
});

export const exportSchema = z.object({
  app: z.literal("gymtracker"),
  version: z.number(),
  exported_at: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

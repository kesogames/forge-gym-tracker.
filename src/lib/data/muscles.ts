import type { Equipment, MetricType, Metric, MuscleId } from "@/lib/types";

export const MUSCLES: { id: MuscleId; name: string; region: "upper" | "core" | "lower" }[] = [
  { id: "chest", name: "Borst", region: "upper" },
  { id: "back", name: "Rug", region: "upper" },
  { id: "shoulders", name: "Schouders", region: "upper" },
  { id: "traps", name: "Trapezius", region: "upper" },
  { id: "biceps", name: "Biceps", region: "upper" },
  { id: "triceps", name: "Triceps", region: "upper" },
  { id: "forearms", name: "Onderarmen", region: "upper" },
  { id: "abs", name: "Buikspieren", region: "core" },
  { id: "lower_back", name: "Onderrug", region: "core" },
  { id: "quads", name: "Quadriceps", region: "lower" },
  { id: "hamstrings", name: "Hamstrings", region: "lower" },
  { id: "glutes", name: "Bilspieren", region: "lower" },
  { id: "calves", name: "Kuiten", region: "lower" },
  { id: "adductors", name: "Adductoren", region: "lower" },
  { id: "abductors", name: "Abductoren", region: "lower" },
];

export const MUSCLE_NAME: Record<MuscleId, string> = Object.fromEntries(
  MUSCLES.map((m) => [m.id, m.name]),
) as Record<MuscleId, string>;

export const EQUIPMENT_NAME: Record<Equipment, string> = {
  barbell: "Halterstang",
  dumbbell: "Dumbbells",
  cable: "Kabel",
  machine: "Machine",
  bodyweight: "Lichaamsgewicht",
  kettlebell: "Kettlebell",
  ez_bar: "EZ-stang",
  smith: "Smith machine",
  band: "Weerstandsband",
  cardio: "Cardio-apparaat",
  other: "Overig",
};

export const METRIC_TYPE_NAME: Record<MetricType, string> = {
  weight_reps: "Gewicht + herhalingen",
  bodyweight_reps: "Lichaamsgewicht + herhalingen",
  assisted: "Assisted (ondersteund)",
  time: "Tijd",
  distance: "Afstand",
  custom: "Eigen combinatie",
};

export const METRICS_FOR_TYPE: Record<Exclude<MetricType, "custom">, Metric[]> = {
  weight_reps: ["weight", "reps"],
  bodyweight_reps: ["weight", "reps"], // weight = extra gewicht (optioneel)
  assisted: ["weight", "reps"], // weight = ondersteuning
  time: ["time"],
  distance: ["distance", "time"],
};

export const METRIC_NAME: Record<Metric, string> = {
  weight: "Gewicht",
  reps: "Herhalingen",
  time: "Tijd",
  distance: "Afstand",
};

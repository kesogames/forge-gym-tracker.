import type { TemplateFullInput } from "@/lib/db/schemas";
import { EXERCISE_BY_ID } from "./exercises";

type Row = [exerciseId: string, sets: number, repMin: number | null, repMax: number | null, superset?: string];

function build(name: string, description: string, days: [string, Row[]][], uid: () => string): TemplateFullInput {
  return {
    template: { id: uid(), name, description, favorite: false, archived: false },
    days: days.map(([dayName, rows]) => ({
      id: uid(),
      name: dayName,
      exercises: rows.map(([exercise_id, sets, rep_min, rep_max, superset]) => ({
        id: uid(),
        exercise_id,
        sets,
        rep_min,
        rep_max,
        rest_seconds: EXERCISE_BY_ID.get(exercise_id)?.default_rest ?? 90,
        target_weight: null,
        superset_group: superset ?? null,
        notes: "",
      })),
    })),
  };
}

/** Voorbeeldschema's die een nieuwe gebruiker met één tik kan toevoegen. */
export function exampleTemplates(uid: () => string): TemplateFullInput[] {
  return [
    build(
      "Push / Pull / Legs",
      "Klassieke 3-daagse split. Herhaal twee keer per week voor 6 trainingen, of één keer voor 3.",
      [
        ["Push", [["bench-press", 4, 6, 8], ["incline-db-press", 3, 8, 12], ["seated-db-press", 3, 8, 12], ["lateral-raise", 3, 12, 15], ["rope-pushdown", 3, 10, 12, "A"], ["overhead-cable-extension", 3, 10, 12, "A"]]],
        ["Pull", [["pull-up", 4, 6, 10], ["barbell-row", 3, 8, 10], ["seated-cable-row", 3, 10, 12], ["face-pull", 3, 12, 15], ["ez-curl", 3, 8, 12, "B"], ["hammer-curl", 3, 10, 12, "B"]]],
        ["Legs", [["back-squat", 4, 5, 8], ["romanian-deadlift", 3, 8, 10], ["leg-press", 3, 10, 12], ["lying-leg-curl", 3, 10, 12], ["standing-calf-raise", 4, 10, 15], ["hanging-leg-raise", 3, 10, 15]]],
      ],
      uid,
    ),
    build(
      "Upper / Lower",
      "4 trainingen per week: twee keer bovenlichaam, twee keer onderlichaam.",
      [
        ["Upper A", [["bench-press", 4, 5, 8], ["barbell-row", 4, 6, 10], ["overhead-press", 3, 6, 10], ["lat-pulldown", 3, 8, 12], ["db-curl", 2, 10, 12, "A"], ["triceps-pushdown", 2, 10, 12, "A"]]],
        ["Lower A", [["back-squat", 4, 5, 8], ["romanian-deadlift", 3, 8, 10], ["walking-lunge", 3, 10, 12], ["seated-leg-curl", 3, 10, 12], ["seated-calf-raise", 4, 12, 15], ["plank", 3, null, null]]],
        ["Upper B", [["incline-db-press", 4, 8, 10], ["chest-supported-row", 4, 8, 12], ["seated-db-press", 3, 8, 12], ["chin-up", 3, 6, 10], ["lateral-raise", 3, 12, 15], ["incline-db-curl", 2, 10, 12]]],
        ["Lower B", [["deadlift", 3, 3, 5], ["front-squat", 3, 6, 8], ["hip-thrust", 3, 8, 12], ["leg-extension", 3, 12, 15], ["standing-calf-raise", 4, 10, 15], ["cable-crunch", 3, 12, 15]]],
      ],
      uid,
    ),
    build(
      "Mobiliteit & stretch",
      "Korte routine van ca. 15 minuten. Ideaal als warming-up, op rustdagen of na het trainen.",
      [
        ["Mobiliteit", [["cat-cow", 1, 8, 10], ["worlds-greatest-stretch", 2, 5, 5], ["thoracic-rotation", 2, 8, 8], ["hip-90-90", 2, 8, 10], ["deep-squat-hold", 2, null, null], ["band-dislocates", 2, 10, 12]]],
        ["Stretchen", [["couch-stretch", 2, null, null], ["pigeon-stretch", 2, null, null], ["hamstring-stretch", 2, null, null], ["doorway-chest-stretch", 2, null, null], ["childs-pose", 1, null, null]]],
      ],
      uid,
    ),
    build(
      "Full Body 3x",
      "Drie keer per week het hele lichaam. Ideaal om mee te beginnen of bij weinig tijd.",
      [
        ["Dag A", [["back-squat", 3, 5, 8], ["bench-press", 3, 5, 8], ["barbell-row", 3, 8, 10], ["lateral-raise", 2, 12, 15], ["plank", 3, null, null]]],
        ["Dag B", [["deadlift", 3, 3, 5], ["overhead-press", 3, 6, 8], ["lat-pulldown", 3, 8, 12], ["walking-lunge", 2, 10, 12], ["hanging-leg-raise", 3, 10, 15]]],
        ["Dag C", [["leg-press", 3, 10, 12], ["incline-db-press", 3, 8, 12], ["seated-cable-row", 3, 10, 12], ["db-curl", 2, 10, 12, "A"], ["rope-pushdown", 2, 10, 12, "A"]]],
      ],
      uid,
    ),
  ];
}

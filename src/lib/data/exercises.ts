import type { Equipment, Exercise, Mechanic, MetricType, MuscleId } from "@/lib/types";
import { METRICS_FOR_TYPE } from "./muscles";

// Afbeeldingen: free-exercise-db (github.com/yuhonas/free-exercise-db),
// uitgebracht onder de Unlicense (publiek domein). Lokaal gebundeld in
// /public/exercises/<map>/0.webp en 1.webp via scripts/fetch-exercise-images.mjs.

const PATTERN_MECHANIC: Record<string, Mechanic> = {
  horizontal_press: "compound",
  incline_press: "compound",
  decline_press: "compound",
  chest_fly: "isolation",
  pushup: "compound",
  dip: "compound",
  vertical_pull: "compound",
  horizontal_row: "compound",
  pullover: "isolation",
  hinge: "compound",
  back_extension: "isolation",
  shrug: "isolation",
  overhead_press: "compound",
  lateral_raise: "isolation",
  front_raise: "isolation",
  rear_delt: "isolation",
  upright_row: "compound",
  biceps_curl: "isolation",
  hammer_curl: "isolation",
  triceps_pushdown: "isolation",
  triceps_overhead: "isolation",
  triceps_lying: "isolation",
  close_press: "compound",
  squat: "compound",
  leg_press: "compound",
  lunge: "compound",
  leg_extension: "isolation",
  leg_curl: "isolation",
  hip_thrust: "compound",
  glute_iso: "isolation",
  calf_raise: "isolation",
  adduction: "isolation",
  abduction: "isolation",
  crunch: "isolation",
  leg_raise: "isolation",
  plank: "isolation",
  rotation: "isolation",
  wrist: "isolation",
  carry: "compound",
  olympic: "compound",
  cardio: "compound",
  plyo: "compound",
};

type Opts = { unilateral?: boolean; metrics?: Exercise["metrics"] };

function e(
  id: string,
  name: string,
  image: string | null,
  primary: MuscleId,
  secondary: MuscleId[],
  equipment: Equipment,
  metric_type: MetricType,
  pattern: string,
  default_rest: number,
  instructions: string,
  opts: Opts = {},
): Exercise {
  return {
    id,
    name,
    image,
    primary_muscle: primary,
    secondary_muscles: secondary,
    equipment,
    metric_type,
    metrics: opts.metrics ?? (metric_type === "custom" ? ["weight", "reps"] : METRICS_FOR_TYPE[metric_type]),
    mechanic: PATTERN_MECHANIC[pattern] ?? "compound",
    pattern,
    instructions,
    default_rest,
    unilateral: opts.unilateral ?? false,
    is_custom: false,
  };
}

const U = { unilateral: true };

export const EXERCISES: Exercise[] = [
  // ───────── Borst
  e("bench-press", "Bankdrukken (halterstang)", "Barbell_Bench_Press_-_Medium_Grip", "chest", ["triceps", "shoulders"], "barbell", "weight_reps", "horizontal_press", 150, "Lig plat op de bank, voeten stevig op de grond. Laat de stang gecontroleerd zakken naar je middenborst en druk explosief terug omhoog. Schouderbladen blijven naar achteren en beneden."),
  e("db-bench-press", "Bankdrukken (dumbbells)", "Dumbbell_Bench_Press", "chest", ["triceps", "shoulders"], "dumbbell", "weight_reps", "horizontal_press", 120, "Lig plat met een dumbbell in elke hand boven je borst. Laat ze gecontroleerd zakken tot naast je borst en druk ze terug omhoog."),
  e("incline-bench-press", "Schuin bankdrukken (halterstang)", "Barbell_Incline_Bench_Press_-_Medium_Grip", "chest", ["shoulders", "triceps"], "barbell", "weight_reps", "incline_press", 150, "Bank op 30 tot 45 graden. Laat de stang zakken naar je bovenborst en druk recht omhoog."),
  e("incline-db-press", "Schuin bankdrukken (dumbbells)", "Incline_Dumbbell_Press", "chest", ["shoulders", "triceps"], "dumbbell", "weight_reps", "incline_press", 120, "Bank op 30 tot 45 graden. Laat de dumbbells zakken tot naast je bovenborst en druk ze omhoog en iets naar elkaar toe."),
  e("decline-bench-press", "Decline bankdrukken", "Decline_Barbell_Bench_Press", "chest", ["triceps", "shoulders"], "barbell", "weight_reps", "decline_press", 150, "Lig op een decline bank met je benen vastgezet. Laat de stang zakken naar je onderborst en druk terug."),
  e("machine-chest-press", "Chest press machine", "Machine_Bench_Press", "chest", ["triceps", "shoulders"], "machine", "weight_reps", "horizontal_press", 90, "Stel de stoel zo in dat de handgrepen op borsthoogte zitten. Druk naar voren tot je armen bijna gestrekt zijn en laat gecontroleerd terugkomen."),
  e("smith-bench-press", "Bankdrukken (Smith machine)", "Smith_Machine_Bench_Press", "chest", ["triceps", "shoulders"], "smith", "weight_reps", "horizontal_press", 120, "Plaats de bank zo dat de stang boven je middenborst zakt. Laat gecontroleerd zakken en druk terug."),
  e("smith-incline-press", "Schuin drukken (Smith machine)", "Smith_Machine_Incline_Bench_Press", "chest", ["shoulders", "triceps"], "smith", "weight_reps", "incline_press", 120, "Schuine bank in de Smith machine. Laat de stang zakken naar je bovenborst en druk terug."),
  e("incline-machine-press", "Schuine chest press machine", "Leverage_Incline_Chest_Press", "chest", ["shoulders", "triceps"], "machine", "weight_reps", "incline_press", 90, "Druk de handgrepen schuin omhoog en naar voren, laat gecontroleerd terugkomen."),
  e("db-fly", "Dumbbell flyes", "Dumbbell_Flyes", "chest", ["shoulders"], "dumbbell", "weight_reps", "chest_fly", 75, "Lig plat met de dumbbells boven je borst, ellebogen licht gebogen. Open je armen in een boog tot je een rek voelt en breng ze terug."),
  e("incline-db-fly", "Schuine dumbbell flyes", "Incline_Dumbbell_Flyes", "chest", ["shoulders"], "dumbbell", "weight_reps", "chest_fly", 75, "Zoals flyes, maar op een schuine bank voor meer nadruk op de bovenborst."),
  e("pec-deck", "Pec deck (butterfly)", "Butterfly", "chest", ["shoulders"], "machine", "weight_reps", "chest_fly", 75, "Zit rechtop, armen op schouderhoogte. Breng de handgrepen voor je borst samen en laat langzaam terug."),
  e("cable-crossover", "Cable crossover", "Cable_Crossover", "chest", ["shoulders"], "cable", "weight_reps", "chest_fly", 75, "Sta tussen twee hoge katrollen. Breng de handgrepen in een boog naar beneden en voor je samen."),
  e("low-cable-fly", "Low-to-high cable fly", "Low_Cable_Crossover", "chest", ["shoulders"], "cable", "weight_reps", "chest_fly", 75, "Katrollen laag. Breng de handgrepen in een boog omhoog tot schouderhoogte voor je lichaam."),
  e("push-up", "Push-up", "Pushups", "chest", ["triceps", "shoulders", "abs"], "bodyweight", "bodyweight_reps", "pushup", 75, "Handen iets breder dan schouderbreedte, lichaam in één rechte lijn. Zak tot je borst bijna de grond raakt en druk terug."),
  e("incline-push-up", "Incline push-up", "Incline_Push-Up", "chest", ["triceps", "shoulders"], "bodyweight", "bodyweight_reps", "pushup", 60, "Handen op een verhoging. Lichtere variant van de push-up."),
  e("decline-push-up", "Decline push-up", "Decline_Push-Up", "chest", ["shoulders", "triceps"], "bodyweight", "bodyweight_reps", "pushup", 60, "Voeten op een verhoging. Zwaardere variant met meer nadruk op de bovenborst."),
  e("chest-dip", "Dips (borst)", "Dips_-_Chest_Version", "chest", ["triceps", "shoulders"], "bodyweight", "bodyweight_reps", "dip", 120, "Leun iets naar voren tussen de brug. Zak tot je bovenarmen parallel zijn en druk terug. Voeg extra gewicht toe in het gewichtveld."),
  e("assisted-dip", "Assisted dips", "Dip_Machine", "triceps", ["chest", "shoulders"], "machine", "assisted", "dip", 90, "Kniel of sta op het ondersteuningsplatform. Vul in het gewichtveld de ondersteuning in: meer ondersteuning = lichter."),

  // ───────── Rug
  e("pull-up", "Pull-up", "Pullups", "back", ["biceps", "forearms"], "bodyweight", "bodyweight_reps", "vertical_pull", 120, "Hang aan de stang met een bovenhandse greep. Trek jezelf op tot je kin boven de stang is en zak gecontroleerd terug."),
  e("chin-up", "Chin-up", "Chin-Up", "back", ["biceps"], "bodyweight", "bodyweight_reps", "vertical_pull", 120, "Onderhandse greep op schouderbreedte. Trek op tot je kin boven de stang is."),
  e("assisted-pull-up", "Assisted pull-up", "Band_Assisted_Pull-Up", "back", ["biceps"], "machine", "assisted", "vertical_pull", 90, "Pull-up met ondersteuning (machine of band). Vul de ondersteuning in het gewichtveld in."),
  e("lat-pulldown", "Lat pulldown", "Wide-Grip_Lat_Pulldown", "back", ["biceps", "shoulders"], "cable", "weight_reps", "vertical_pull", 90, "Brede greep, borst omhoog. Trek de stang naar je bovenborst en laat gecontroleerd terug."),
  e("close-grip-pulldown", "Close-grip pulldown", "Close-Grip_Front_Lat_Pulldown", "back", ["biceps"], "cable", "weight_reps", "vertical_pull", 90, "Smalle greep. Trek naar je borst met je ellebogen langs je lichaam."),
  e("v-bar-pulldown", "V-bar pulldown", "V-Bar_Pulldown", "back", ["biceps"], "cable", "weight_reps", "vertical_pull", 90, "Neutrale greep met de V-handgreep. Trek naar je borst."),
  e("single-arm-pulldown", "Eenarmige pulldown", "One_Arm_Lat_Pulldown", "back", ["biceps"], "cable", "weight_reps", "vertical_pull", 60, "Trek met één arm de handgreep naar je schouder. Gewicht en herhalingen per kant.", U),
  e("barbell-row", "Barbell row", "Bent_Over_Barbell_Row", "back", ["biceps", "lower_back", "traps"], "barbell", "weight_reps", "horizontal_row", 120, "Heupen naar achteren, rug recht, bovenlichaam bijna horizontaal. Trek de stang naar je navel."),
  e("db-row", "Eenarmige dumbbell row", "One-Arm_Dumbbell_Row", "back", ["biceps", "traps"], "dumbbell", "weight_reps", "horizontal_row", 75, "Eén knie en hand op de bank. Trek de dumbbell naar je heup. Gewicht en herhalingen per kant.", U),
  e("seated-cable-row", "Seated cable row", "Seated_Cable_Rows", "back", ["biceps", "traps"], "cable", "weight_reps", "horizontal_row", 90, "Zit rechtop, trek de handgreep naar je buik en knijp je schouderbladen samen."),
  e("t-bar-row", "T-bar row", "T-Bar_Row_with_Handle", "back", ["biceps", "traps", "lower_back"], "barbell", "weight_reps", "horizontal_row", 120, "Sta over de stang, rug recht. Trek de handgreep naar je borst."),
  e("chest-supported-row", "Chest supported row", "Dumbbell_Incline_Row", "back", ["biceps", "traps"], "dumbbell", "weight_reps", "horizontal_row", 90, "Lig met je borst op een schuine bank. Trek de dumbbells naar je heupen."),
  e("machine-row", "Row machine", "Leverage_Iso_Row", "back", ["biceps", "traps"], "machine", "weight_reps", "horizontal_row", 90, "Borst tegen het kussen. Trek de handgrepen naar je toe en knijp je schouderbladen samen."),
  e("inverted-row", "Inverted row", "Inverted_Row", "back", ["biceps"], "bodyweight", "bodyweight_reps", "horizontal_row", 75, "Hang onder een stang, lichaam recht. Trek je borst naar de stang."),
  e("straight-arm-pulldown", "Straight-arm pulldown", "Straight-Arm_Pulldown", "back", ["triceps"], "cable", "weight_reps", "pullover", 60, "Armen gestrekt, duw de stang in een boog naar je dijen."),
  e("db-pullover", "Dumbbell pullover", "Straight-Arm_Dumbbell_Pullover", "back", ["chest", "triceps"], "dumbbell", "weight_reps", "pullover", 75, "Lig dwars of plat op de bank. Breng de dumbbell met bijna gestrekte armen achter je hoofd en terug."),

  // ───────── Onderrug / hinge
  e("deadlift", "Deadlift", "Barbell_Deadlift", "lower_back", ["glutes", "hamstrings", "back", "traps", "forearms"], "barbell", "weight_reps", "hinge", 180, "Stang boven je middenvoet. Rug recht, druk de grond weg en kom rechtop door heupen en knieën te strekken."),
  e("sumo-deadlift", "Sumo deadlift", "Sumo_Deadlift", "glutes", ["hamstrings", "adductors", "lower_back", "quads"], "barbell", "weight_reps", "hinge", 180, "Brede stand, handen binnen je knieën. Duw de knieën naar buiten en kom rechtop."),
  e("trap-bar-deadlift", "Trap bar deadlift", "Trap_Bar_Deadlift", "quads", ["glutes", "hamstrings", "lower_back"], "barbell", "weight_reps", "hinge", 180, "Sta in de trap bar, rug recht. Druk de grond weg en kom rechtop."),
  e("romanian-deadlift", "Roemeense deadlift", "Romanian_Deadlift", "hamstrings", ["glutes", "lower_back"], "barbell", "weight_reps", "hinge", 120, "Knieën licht gebogen. Duw je heupen naar achteren tot je een rek in je hamstrings voelt, kom terug omhoog."),
  e("db-romanian-deadlift", "Roemeense deadlift (dumbbells)", "Stiff-Legged_Dumbbell_Deadlift", "hamstrings", ["glutes", "lower_back"], "dumbbell", "weight_reps", "hinge", 120, "Zoals de Roemeense deadlift, met een dumbbell in elke hand."),
  e("good-morning", "Good morning", "Good_Morning", "hamstrings", ["lower_back", "glutes"], "barbell", "weight_reps", "hinge", 120, "Stang op je rug, knieën licht gebogen. Buig vanuit de heupen naar voren met een rechte rug en kom terug."),
  e("back-extension", "Back extension", "Hyperextensions_Back_Extensions", "lower_back", ["glutes", "hamstrings"], "bodyweight", "bodyweight_reps", "back_extension", 60, "Heupen op het kussen. Zak gecontroleerd en kom terug tot je lichaam een rechte lijn vormt."),
  e("reverse-hyper", "Reverse hyperextension", "Reverse_Hyperextension", "glutes", ["hamstrings", "lower_back"], "machine", "weight_reps", "back_extension", 60, "Lig met je bovenlichaam op de bank en til je benen achter je omhoog."),
  e("kb-swing", "Kettlebell swing", "One-Arm_Kettlebell_Swings", "glutes", ["hamstrings", "lower_back", "shoulders"], "kettlebell", "weight_reps", "hinge", 75, "Zwaai de kettlebell tussen je benen en stuw hem met je heupen naar borsthoogte."),

  // ───────── Trapezius
  e("barbell-shrug", "Barbell shrug", "Barbell_Shrug", "traps", ["forearms"], "barbell", "weight_reps", "shrug", 60, "Stang op armlengte. Trek je schouders recht omhoog naar je oren, houd kort vast en laat zakken."),
  e("db-shrug", "Dumbbell shrug", "Dumbbell_Shrug", "traps", ["forearms"], "dumbbell", "weight_reps", "shrug", 60, "Dumbbells naast je lichaam. Trek je schouders recht omhoog en laat gecontroleerd zakken."),
  e("cable-shrug", "Cable shrug", "Cable_Shrugs", "traps", [], "cable", "weight_reps", "shrug", 60, "Pak de stang aan een lage katrol en trek je schouders omhoog."),

  // ───────── Schouders
  e("overhead-press", "Overhead press (halterstang)", "Standing_Military_Press", "shoulders", ["triceps", "traps", "abs"], "barbell", "weight_reps", "overhead_press", 150, "Staand, stang op je sleutelbeenderen. Druk recht boven je hoofd en houd je romp aangespannen."),
  e("seated-db-press", "Schouderdrukken (dumbbells)", "Dumbbell_Shoulder_Press", "shoulders", ["triceps"], "dumbbell", "weight_reps", "overhead_press", 120, "Zit rechtop, dumbbells op schouderhoogte. Druk ze omhoog tot je armen bijna gestrekt zijn."),
  e("arnold-press", "Arnold press", "Arnold_Dumbbell_Press", "shoulders", ["triceps"], "dumbbell", "weight_reps", "overhead_press", 90, "Begin met handpalmen naar je toe en draai ze naar voren terwijl je omhoog drukt."),
  e("machine-shoulder-press", "Shoulder press machine", "Machine_Shoulder_Military_Press", "shoulders", ["triceps"], "machine", "weight_reps", "overhead_press", 90, "Stel de stoel in zodat de handgrepen op schouderhoogte zitten en druk omhoog."),
  e("smith-shoulder-press", "Schouderdrukken (Smith machine)", "Smith_Machine_Overhead_Shoulder_Press", "shoulders", ["triceps"], "smith", "weight_reps", "overhead_press", 120, "Zit onder de stang en druk deze boven je hoofd."),
  e("lateral-raise", "Lateral raise (dumbbells)", "Side_Lateral_Raise", "shoulders", ["traps"], "dumbbell", "weight_reps", "lateral_raise", 60, "Til de dumbbells zijwaarts op tot schouderhoogte met licht gebogen ellebogen. Laat langzaam zakken."),
  e("cable-lateral-raise", "Cable lateral raise", "Cable_Seated_Lateral_Raise", "shoulders", [], "cable", "weight_reps", "lateral_raise", 60, "Met een lage katrol de arm zijwaarts optillen tot schouderhoogte. Gewicht per kant.", U),
  e("machine-lateral-raise", "Lateral raise machine", "Seated_Side_Lateral_Raise", "shoulders", [], "machine", "weight_reps", "lateral_raise", 60, "Armen tegen de kussens, til zijwaarts op tot schouderhoogte."),
  e("front-raise", "Front raise", "Front_Incline_Dumbbell_Raise", "shoulders", ["chest"], "dumbbell", "weight_reps", "front_raise", 60, "Til de dumbbells voor je lichaam op tot schouderhoogte."),
  e("cable-front-raise", "Cable front raise", "Front_Cable_Raise", "shoulders", [], "cable", "weight_reps", "front_raise", 60, "Til de handgreep van een lage katrol voor je op tot schouderhoogte."),
  e("face-pull", "Face pull", "Face_Pull", "shoulders", ["traps", "back"], "cable", "weight_reps", "rear_delt", 60, "Touw op gezichtshoogte. Trek naar je gezicht met je ellebogen hoog en naar buiten."),
  e("reverse-pec-deck", "Reverse pec deck", "Reverse_Machine_Flyes", "shoulders", ["traps", "back"], "machine", "weight_reps", "rear_delt", 60, "Borst tegen het kussen, breng de handgrepen in een boog naar achteren."),
  e("rear-delt-fly", "Rear delt fly (dumbbells)", "Seated_Bent-Over_Rear_Delt_Raise", "shoulders", ["traps", "back"], "dumbbell", "weight_reps", "rear_delt", 60, "Voorovergebogen, til de dumbbells zijwaarts op met licht gebogen ellebogen."),
  e("cable-rear-delt-fly", "Cable rear delt fly", "Cable_Rear_Delt_Fly", "shoulders", ["traps"], "cable", "weight_reps", "rear_delt", 60, "Kruis de kabels op schouderhoogte en trek ze naar achteren uit elkaar."),
  e("upright-row", "Upright row", "Upright_Barbell_Row", "shoulders", ["traps", "biceps"], "barbell", "weight_reps", "upright_row", 75, "Trek de stang langs je lichaam omhoog tot borsthoogte, ellebogen leiden."),
  e("handstand-push-up", "Handstand push-up", "Handstand_Push-Ups", "shoulders", ["triceps", "traps"], "bodyweight", "bodyweight_reps", "overhead_press", 120, "In handstand tegen de muur. Zak tot je hoofd bijna de grond raakt en druk terug."),

  // ───────── Biceps
  e("barbell-curl", "Barbell curl", "Barbell_Curl", "biceps", ["forearms"], "barbell", "weight_reps", "biceps_curl", 60, "Ellebogen langs je lichaam. Krul de stang omhoog en laat gecontroleerd zakken."),
  e("ez-curl", "EZ-bar curl", "EZ-Bar_Curl", "biceps", ["forearms"], "ez_bar", "weight_reps", "biceps_curl", 60, "Krul de EZ-stang omhoog zonder je bovenarmen te bewegen."),
  e("db-curl", "Dumbbell curl", "Dumbbell_Bicep_Curl", "biceps", ["forearms"], "dumbbell", "weight_reps", "biceps_curl", 60, "Krul beide dumbbells omhoog en draai je handpalmen naar boven."),
  e("incline-db-curl", "Incline dumbbell curl", "Incline_Dumbbell_Curl", "biceps", ["forearms"], "dumbbell", "weight_reps", "biceps_curl", 60, "Op een schuine bank, armen hangend. Krul omhoog voor extra rek in de biceps."),
  e("hammer-curl", "Hammer curl", "Hammer_Curls", "biceps", ["forearms"], "dumbbell", "weight_reps", "hammer_curl", 60, "Neutrale greep (duimen omhoog). Krul de dumbbells omhoog."),
  e("cable-hammer-curl", "Rope hammer curl", "Cable_Hammer_Curls_-_Rope_Attachment", "biceps", ["forearms"], "cable", "weight_reps", "hammer_curl", 60, "Touw aan een lage katrol, neutrale greep, krul omhoog."),
  e("preacher-curl", "Preacher curl", "Preacher_Curl", "biceps", [], "ez_bar", "weight_reps", "biceps_curl", 60, "Bovenarmen op het kussen. Krul de stang omhoog en laat volledig zakken."),
  e("machine-preacher-curl", "Preacher curl machine", "Machine_Preacher_Curls", "biceps", [], "machine", "weight_reps", "biceps_curl", 60, "Armen op het kussen, krul de handgrepen omhoog."),
  e("cable-curl", "Cable curl", "Standing_Biceps_Cable_Curl", "biceps", ["forearms"], "cable", "weight_reps", "biceps_curl", 60, "Stang aan een lage katrol, krul omhoog met vaste ellebogen."),
  e("concentration-curl", "Concentration curl", "Concentration_Curls", "biceps", [], "dumbbell", "weight_reps", "biceps_curl", 45, "Zittend, elleboog tegen de binnenkant van je dij. Krul de dumbbell omhoog. Per kant.", U),
  e("spider-curl", "Spider curl", "Spider_Curl", "biceps", [], "ez_bar", "weight_reps", "biceps_curl", 60, "Met je borst op een schuine bank, armen loodrecht naar beneden. Krul omhoog."),
  e("reverse-curl", "Reverse curl", "Reverse_Barbell_Curl", "forearms", ["biceps"], "barbell", "weight_reps", "biceps_curl", 60, "Bovenhandse greep. Krul de stang omhoog."),

  // ───────── Triceps
  e("triceps-pushdown", "Triceps pushdown", "Triceps_Pushdown", "triceps", [], "cable", "weight_reps", "triceps_pushdown", 60, "Ellebogen langs je lichaam. Duw de stang naar beneden tot je armen gestrekt zijn."),
  e("rope-pushdown", "Rope pushdown", "Triceps_Pushdown_-_Rope_Attachment", "triceps", [], "cable", "weight_reps", "triceps_pushdown", 60, "Duw het touw naar beneden en spreid de uiteinden onderaan."),
  e("overhead-cable-extension", "Overhead cable extension", "Cable_Rope_Overhead_Triceps_Extension", "triceps", [], "cable", "weight_reps", "triceps_overhead", 60, "Met je rug naar de katrol, touw achter je hoofd. Strek je armen naar voren en omhoog."),
  e("overhead-db-extension", "Overhead dumbbell extension", "Standing_Dumbbell_Triceps_Extension", "triceps", [], "dumbbell", "weight_reps", "triceps_overhead", 60, "Houd één dumbbell met beide handen boven je hoofd. Zak achter je hoofd en strek terug."),
  e("skull-crusher", "Skull crusher", "EZ-Bar_Skullcrusher", "triceps", [], "ez_bar", "weight_reps", "triceps_lying", 75, "Lig plat, stang boven je borst. Buig je ellebogen tot de stang bij je voorhoofd is en strek terug."),
  e("db-skull-crusher", "Liggende dumbbell extension", "Lying_Dumbbell_Tricep_Extension", "triceps", [], "dumbbell", "weight_reps", "triceps_lying", 75, "Lig plat met dumbbells boven je. Buig de ellebogen en strek terug."),
  e("close-grip-bench", "Close-grip bankdrukken", "Close-Grip_Barbell_Bench_Press", "triceps", ["chest", "shoulders"], "barbell", "weight_reps", "close_press", 120, "Greep op schouderbreedte. Laat de stang zakken naar je onderborst met ellebogen langs je lichaam."),
  e("triceps-dip", "Dips (triceps)", "Dips_-_Triceps_Version", "triceps", ["chest", "shoulders"], "bodyweight", "bodyweight_reps", "dip", 90, "Lichaam rechtop tussen de brug. Zak tot je ellebogen 90 graden zijn en druk terug."),
  e("bench-dip", "Bench dip", "Bench_Dips", "triceps", ["chest", "shoulders"], "bodyweight", "bodyweight_reps", "dip", 60, "Handen op een bank achter je. Zak door je ellebogen te buigen en druk terug."),
  e("db-kickback", "Triceps kickback", "Tricep_Dumbbell_Kickback", "triceps", [], "dumbbell", "weight_reps", "triceps_pushdown", 45, "Voorovergebogen, bovenarm horizontaal. Strek je onderarm naar achteren."),
  e("machine-triceps-extension", "Triceps extension machine", "Machine_Triceps_Extension", "triceps", [], "machine", "weight_reps", "triceps_pushdown", 60, "Ellebogen op het kussen, strek je armen tegen de weerstand in."),

  // ───────── Onderarmen
  e("wrist-curl", "Wrist curl", "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench", "forearms", [], "barbell", "weight_reps", "wrist", 45, "Onderarmen op een bank, handpalmen omhoog. Krul de stang omhoog met alleen je polsen."),
  e("reverse-wrist-curl", "Reverse wrist curl", "Palms-Down_Wrist_Curl_Over_A_Bench", "forearms", [], "barbell", "weight_reps", "wrist", 45, "Handpalmen naar beneden. Til de stang op met alleen je polsen."),
  e("farmers-walk", "Farmer's walk", "Farmers_Walk", "forearms", ["traps", "abs", "glutes"], "dumbbell", "custom", "carry", 90, "Loop met zware gewichten naast je lichaam. Rechtop blijven, korte stappen.", { metrics: ["weight", "distance"] }),
  e("dead-hang", "Dead hang", null, "forearms", ["back"], "bodyweight", "time", "carry", 60, "Hang met gestrekte armen aan een stang zo lang mogelijk."),

  // ───────── Quadriceps
  e("back-squat", "Squat (halterstang)", "Barbell_Squat", "quads", ["glutes", "adductors", "lower_back"], "barbell", "weight_reps", "squat", 180, "Stang op je bovenrug, voeten op schouderbreedte. Zak tot je heupen onder je knieën zijn en kom krachtig omhoog."),
  e("front-squat", "Front squat", "Front_Barbell_Squat", "quads", ["glutes", "abs"], "barbell", "weight_reps", "squat", 180, "Stang voor op je schouders, ellebogen hoog. Zak rechtop naar beneden en kom terug."),
  e("goblet-squat", "Goblet squat", "Goblet_Squat", "quads", ["glutes", "abs"], "dumbbell", "weight_reps", "squat", 90, "Houd een dumbbell of kettlebell voor je borst. Zak diep tussen je knieën en kom terug."),
  e("hack-squat", "Hack squat", "Hack_Squat", "quads", ["glutes"], "machine", "weight_reps", "squat", 120, "Rug tegen het kussen. Zak diep en druk terug omhoog via je hele voet."),
  e("smith-squat", "Squat (Smith machine)", "Smith_Machine_Squat", "quads", ["glutes"], "smith", "weight_reps", "squat", 120, "Stang op je bovenrug in de Smith machine, voeten iets naar voren. Zak en druk terug."),
  e("leg-press", "Leg press", "Leg_Press", "quads", ["glutes", "adductors"], "machine", "weight_reps", "leg_press", 120, "Voeten op schouderbreedte op het platform. Laat zakken tot 90 graden en druk terug zonder je knieën op slot te zetten."),
  e("bodyweight-squat", "Squat (lichaamsgewicht)", "Bodyweight_Squat", "quads", ["glutes"], "bodyweight", "bodyweight_reps", "squat", 60, "Armen voor je, zak diep en kom terug omhoog."),
  e("leg-extension", "Leg extension", "Leg_Extensions", "quads", [], "machine", "weight_reps", "leg_extension", 60, "Strek je benen volledig tegen de weerstand in en laat gecontroleerd zakken."),
  e("sissy-squat", "Sissy squat", "Weighted_Sissy_Squat", "quads", [], "bodyweight", "bodyweight_reps", "leg_extension", 60, "Leun achterover terwijl je knieën naar voren gaan. Zak en kom terug."),
  e("bulgarian-split-squat", "Bulgaarse split squat", "Split_Squat_with_Dumbbells", "quads", ["glutes", "adductors"], "dumbbell", "weight_reps", "lunge", 90, "Achterste voet op een bank. Zak recht naar beneden op je voorste been. Gewicht = per dumbbell, herhalingen per been.", U),
  e("walking-lunge", "Walking lunge", "Bodyweight_Walking_Lunge", "quads", ["glutes", "hamstrings"], "dumbbell", "weight_reps", "lunge", 90, "Stap ver naar voren en zak tot je achterste knie bijna de grond raakt. Wissel af. Herhalingen per been.", U),
  e("db-lunge", "Lunge (dumbbells)", "Dumbbell_Lunges", "quads", ["glutes", "hamstrings"], "dumbbell", "weight_reps", "lunge", 90, "Stap naar voren en zak, druk terug naar de startpositie. Herhalingen per been.", U),
  e("reverse-lunge", "Reverse lunge", "Dumbbell_Rear_Lunge", "quads", ["glutes"], "dumbbell", "weight_reps", "lunge", 90, "Stap naar achteren en zak. Kniesparend alternatief voor de lunge.", U),
  e("step-up", "Step-up", "Dumbbell_Step_Ups", "quads", ["glutes"], "dumbbell", "weight_reps", "lunge", 75, "Stap op een kist of bank en druk jezelf omhoog op één been. Herhalingen per been.", U),

  // ───────── Hamstrings
  e("lying-leg-curl", "Liggende leg curl", "Lying_Leg_Curls", "hamstrings", ["calves"], "machine", "weight_reps", "leg_curl", 60, "Lig op je buik. Krul je hielen naar je billen en laat langzaam zakken."),
  e("seated-leg-curl", "Zittende leg curl", "Seated_Leg_Curl", "hamstrings", ["calves"], "machine", "weight_reps", "leg_curl", 60, "Zit rechtop, krul je benen naar beneden en achter."),
  e("standing-leg-curl", "Staande leg curl", "Standing_Leg_Curl", "hamstrings", [], "machine", "weight_reps", "leg_curl", 60, "Krul één been tegelijk. Gewicht en herhalingen per been.", U),
  e("nordic-curl", "Nordic hamstring curl", null, "hamstrings", ["glutes"], "bodyweight", "bodyweight_reps", "leg_curl", 90, "Kniel met je enkels vast. Laat je bovenlichaam zo langzaam mogelijk naar voren zakken."),
  e("ball-leg-curl", "Leg curl op fitnessbal", "Ball_Leg_Curl", "hamstrings", ["glutes"], "other", "bodyweight_reps", "leg_curl", 60, "Lig op je rug met je hielen op een bal. Til je heupen op en rol de bal naar je toe."),

  // ───────── Bilspieren
  e("hip-thrust", "Hip thrust", "Barbell_Hip_Thrust", "glutes", ["hamstrings"], "barbell", "weight_reps", "hip_thrust", 90, "Bovenrug tegen een bank, stang over je heupen. Duw je heupen omhoog tot je lichaam horizontaal is en knijp je billen samen."),
  e("glute-bridge", "Glute bridge", "Barbell_Glute_Bridge", "glutes", ["hamstrings"], "barbell", "weight_reps", "hip_thrust", 75, "Lig op de grond met de stang over je heupen. Duw je heupen omhoog."),
  e("single-leg-glute-bridge", "Eenbenige glute bridge", "Single_Leg_Glute_Bridge", "glutes", ["hamstrings"], "bodyweight", "bodyweight_reps", "hip_thrust", 45, "Op je rug, één been gestrekt. Duw je heupen omhoog via je hiel.", U),
  e("cable-kickback", "Cable glute kickback", "One-Legged_Cable_Kickback", "glutes", ["hamstrings"], "cable", "weight_reps", "glute_iso", 45, "Enkelband aan een lage katrol. Duw je been naar achteren. Per kant.", U),
  e("glute-kickback", "Glute kickback", "Glute_Kickback", "glutes", ["hamstrings"], "bodyweight", "bodyweight_reps", "glute_iso", 45, "Op handen en knieën, duw één been naar achteren en omhoog.", U),
  e("cable-pull-through", "Cable pull-through", "Pull_Through", "glutes", ["hamstrings", "lower_back"], "cable", "weight_reps", "hinge", 75, "Met je rug naar de lage katrol, touw tussen je benen. Strek je heupen naar voren."),

  // ───────── Kuiten
  e("standing-calf-raise", "Staande kuitheffing", "Standing_Calf_Raises", "calves", [], "machine", "weight_reps", "calf_raise", 45, "Ga op je tenen staan zo hoog mogelijk, laat je hielen diep zakken."),
  e("seated-calf-raise", "Zittende kuitheffing", "Seated_Calf_Raise", "calves", [], "machine", "weight_reps", "calf_raise", 45, "Zittend met gewicht op je knieën. Duw je hielen omhoog."),
  e("leg-press-calf-raise", "Kuitheffing in leg press", "Calf_Press_On_The_Leg_Press_Machine", "calves", [], "machine", "weight_reps", "calf_raise", 45, "Voorvoeten onderaan het platform, duw met je tenen."),
  e("smith-calf-raise", "Kuitheffing (Smith machine)", "Smith_Machine_Calf_Raise", "calves", [], "smith", "weight_reps", "calf_raise", 45, "Stang op je rug, voorvoeten op een verhoging. Duw omhoog."),
  e("db-calf-raise", "Kuitheffing (dumbbell)", "Standing_Dumbbell_Calf_Raise", "calves", [], "dumbbell", "weight_reps", "calf_raise", 45, "Dumbbells in je handen, ga op je tenen staan."),

  // ───────── Adductoren / abductoren
  e("hip-adduction", "Adductor machine", "Thigh_Adductor", "adductors", [], "machine", "weight_reps", "adduction", 60, "Druk je benen tegen de weerstand in naar elkaar toe."),
  e("cable-hip-adduction", "Cable hip adduction", "Cable_Hip_Adduction", "adductors", [], "cable", "weight_reps", "adduction", 45, "Enkelband aan een lage katrol. Trek je been voor je andere been langs. Per kant.", U),
  e("copenhagen-plank", "Copenhagen plank", null, "adductors", ["abs"], "bodyweight", "time", "adduction", 45, "Zijwaartse plank met je bovenste been op een bank. Houd vast.", U),
  e("hip-abduction", "Abductor machine", "Thigh_Abductor", "abductors", ["glutes"], "machine", "weight_reps", "abduction", 60, "Duw je benen tegen de weerstand in uit elkaar."),
  e("lying-hip-abduction", "Zijwaartse beenheffing", "Side_Leg_Raises", "abductors", ["glutes"], "bodyweight", "bodyweight_reps", "abduction", 45, "Op je zij, til je bovenste been gestrekt op. Per kant.", U),
  e("band-walk", "Lateral band walk", null, "abductors", ["glutes"], "band", "bodyweight_reps", "abduction", 45, "Band rond je knieën of enkels, licht gehurkt. Stap zijwaarts."),

  // ───────── Buikspieren
  e("crunch", "Crunch", "Crunches", "abs", [], "bodyweight", "bodyweight_reps", "crunch", 45, "Op je rug met gebogen knieën. Krul je bovenlichaam op naar je knieën."),
  e("cable-crunch", "Cable crunch", "Cable_Crunch", "abs", [], "cable", "weight_reps", "crunch", 60, "Geknield met het touw bij je hoofd. Krul je romp naar beneden."),
  e("machine-crunch", "Crunch machine", "Ab_Crunch_Machine", "abs", [], "machine", "weight_reps", "crunch", 60, "Krul je romp naar voren tegen de weerstand in."),
  e("decline-crunch", "Decline crunch", "Decline_Crunch", "abs", [], "bodyweight", "bodyweight_reps", "crunch", 45, "Op een decline bank, krul je bovenlichaam op."),
  e("hanging-leg-raise", "Hanging leg raise", "Hanging_Leg_Raise", "abs", ["forearms"], "bodyweight", "bodyweight_reps", "leg_raise", 60, "Hang aan een stang en til je benen op tot heuphoogte of hoger, zonder te zwaaien."),
  e("lying-leg-raise", "Liggende beenheffing", "Flat_Bench_Lying_Leg_Raise", "abs", [], "bodyweight", "bodyweight_reps", "leg_raise", 45, "Op je rug, til je gestrekte benen op tot 90 graden en laat langzaam zakken."),
  e("reverse-crunch", "Reverse crunch", "Reverse_Crunch", "abs", [], "bodyweight", "bodyweight_reps", "leg_raise", 45, "Op je rug, trek je knieën naar je borst en til je heupen van de grond."),
  e("plank", "Plank", "Plank", "abs", ["lower_back", "shoulders"], "bodyweight", "time", "plank", 45, "Op je onderarmen en tenen, lichaam in één rechte lijn. Houd vast."),
  e("side-plank", "Zijwaartse plank", "Push_Up_to_Side_Plank", "abs", [], "bodyweight", "time", "plank", 45, "Op één onderarm en de zijkant van je voet. Heupen omhoog. Per kant.", U),
  e("ab-wheel", "Ab wheel rollout", "Ab_Roller", "abs", ["lower_back", "shoulders"], "other", "bodyweight_reps", "plank", 60, "Op je knieën, rol het wiel naar voren zo ver je kunt met een stabiele romp en rol terug."),
  e("russian-twist", "Russian twist", "Russian_Twist", "abs", [], "bodyweight", "bodyweight_reps", "rotation", 45, "Zit met je benen van de grond. Draai je romp van links naar rechts, eventueel met gewicht."),
  e("cable-woodchop", "Cable woodchop", "Standing_Cable_Wood_Chop", "abs", ["shoulders"], "cable", "weight_reps", "rotation", 45, "Trek de handgreep diagonaal van hoog naar laag over je lichaam. Per kant.", U),
  e("pallof-press", "Pallof press", "Pallof_Press", "abs", [], "cable", "weight_reps", "rotation", 45, "Zijwaarts naast de katrol. Druk de handgreep recht voor je uit zonder te draaien. Per kant.", U),
  e("mountain-climber", "Mountain climbers", "Mountain_Climbers", "abs", ["quads", "shoulders"], "bodyweight", "time", "plank", 45, "In push-uppositie, trek afwisselend je knieën snel naar je borst."),

  // ───────── Olympisch / explosief
  e("power-clean", "Power clean", "Power_Clean", "hamstrings", ["glutes", "quads", "traps", "shoulders"], "barbell", "weight_reps", "olympic", 150, "Trek de stang explosief van de grond en vang hem op je schouders in een halve squat."),
  e("thruster", "Thruster", "Kettlebell_Thruster", "quads", ["shoulders", "glutes", "triceps"], "dumbbell", "weight_reps", "olympic", 120, "Front squat die doorloopt in een overhead press in één vloeiende beweging."),
  e("box-jump", "Box jump", "Front_Box_Jump", "quads", ["glutes", "calves"], "bodyweight", "bodyweight_reps", "plyo", 90, "Spring met beide voeten op een kist en land zacht. Stap terug naar beneden."),
  e("burpee", "Burpee", null, "quads", ["chest", "shoulders", "abs"], "bodyweight", "bodyweight_reps", "plyo", 60, "Hurk, spring naar plank, push-up, spring terug en spring omhoog."),

  // ───────── Cardio
  e("treadmill", "Loopband", "Running_Treadmill", "quads", ["hamstrings", "calves", "glutes"], "cardio", "distance", "cardio", 0, "Loop of ren op de loopband. Registreer afstand en tijd."),
  e("rowing-machine", "Roeimachine", "Rowing_Stationary", "back", ["quads", "hamstrings", "biceps"], "cardio", "distance", "cardio", 0, "Duw af met je benen, leun iets achterover en trek de handgreep naar je borst."),
  e("stationary-bike", "Hometrainer", "Bicycling_Stationary", "quads", ["hamstrings", "calves"], "cardio", "distance", "cardio", 0, "Fiets op een stationaire fiets. Registreer afstand en tijd."),
  e("stairmaster", "Stairmaster", "Stairmaster", "quads", ["glutes", "calves"], "cardio", "time", "cardio", 0, "Klim op een constant tempo. Registreer de tijd."),
  e("elliptical", "Crosstrainer", "Elliptical_Trainer", "quads", ["glutes", "hamstrings"], "cardio", "time", "cardio", 0, "Beweeg in een vloeiende elliptische beweging. Registreer de tijd."),
  e("jump-rope", "Touwtjespringen", null, "calves", ["quads", "shoulders"], "other", "time", "cardio", 45, "Spring met een springtouw op een constant tempo."),
  e("sled-push", "Sled push", "Sled_Push", "quads", ["glutes", "calves"], "other", "custom", "carry", 120, "Duw de slee met gestrekte armen en een lage houding.", { metrics: ["weight", "distance"] }),
];

export const EXERCISE_BY_ID: Map<string, Exercise> = new Map(EXERCISES.map((x) => [x.id, x]));

export function imageUrl(image: string | null, frame: 0 | 1 = 0): string | null {
  if (!image) return null;
  if (image.startsWith("http") || image.startsWith("data:")) return image;
  return `/exercises/${image}/${frame}.webp`;
}

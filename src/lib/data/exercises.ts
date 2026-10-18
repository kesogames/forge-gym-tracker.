import type { Equipment, Exercise, Mechanic, MetricType, MuscleId } from "@/lib/types";
import { METRICS_FOR_TYPE } from "./muscles";
import DB from "./exercises-db.json";

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
  kb_ballistic: "compound",
  landmine_press: "compound",
  jump: "compound",
  throw: "compound",
  rotation_power: "compound",
  complex: "compound",
  crawl: "compound",
  conditioning: "compound",
  mobility: "isolation",
  stretch: "isolation",
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
  // ───────── Kettlebell
  e("kb-swing-2h", "Kettlebell swing (twee handen)", "One-Arm_Kettlebell_Swings", "glutes", ["hamstrings", "lower_back", "abs"], "kettlebell", "weight_reps", "kb_ballistic", 75, "Heupen naar achteren, kettlebell tussen je benen. Stuw explosief met je heupen tot borsthoogte, armen ontspannen. Billen en buik aanspannen bovenin."),
  e("kb-swing-1h", "Kettlebell swing (één hand)", "One-Arm_Kettlebell_Swings", "glutes", ["hamstrings", "lower_back", "abs", "forearms"], "kettlebell", "weight_reps", "kb_ballistic", 75, "Als de swing, maar met één hand. Romp blijft recht en draait niet mee. Herhalingen per kant.", U),
  e("kb-american-swing", "American swing", "One-Arm_Kettlebell_Swings", "glutes", ["hamstrings", "shoulders", "lower_back"], "kettlebell", "weight_reps", "kb_ballistic", 90, "Swing tot boven je hoofd met gestrekte armen. Alleen doen met goede schoudermobiliteit."),
  e("kb-goblet-squat", "Kettlebell goblet squat", "Goblet_Squat", "quads", ["glutes", "abs"], "kettlebell", "weight_reps", "squat", 90, "Houd de kettlebell bij de hoorns voor je borst. Zak diep met je ellebogen tussen je knieën en kom terug."),
  e("kb-front-squat-double", "Front squat (twee kettlebells)", "Front_Squats_With_Two_Kettlebells", "quads", ["glutes", "abs"], "kettlebell", "weight_reps", "squat", 120, "Twee kettlebells in de rack-positie op je borst. Zak rechtop naar beneden en druk terug. Gewicht per kettlebell."),
  e("kb-clean", "Kettlebell clean", "One-Arm_Kettlebell_Clean", "glutes", ["hamstrings", "forearms", "shoulders"], "kettlebell", "weight_reps", "kb_ballistic", 75, "Swing de kettlebell naar achteren en trek hem met je heupen omhoog naar de rack-positie, zonder dat hij tegen je onderarm slaat. Per kant.", U),
  e("kb-snatch", "Kettlebell snatch", "One-Arm_Kettlebell_Snatch", "glutes", ["shoulders", "hamstrings", "traps"], "kettlebell", "weight_reps", "kb_ballistic", 90, "In één explosieve beweging van tussen je benen naar boven je hoofd met gestrekte arm. Per kant.", U),
  e("kb-press", "Kettlebell press (staand)", "One-Arm_Kettlebell_Military_Press_To_The_Side", "shoulders", ["triceps", "abs"], "kettlebell", "weight_reps", "overhead_press", 75, "Vanuit de rack-positie recht boven je hoofd drukken. Romp aangespannen, niet achterover leunen. Per kant.", U),
  e("kb-push-press", "Kettlebell push press", "One-Arm_Kettlebell_Push_Press", "shoulders", ["triceps", "quads"], "kettlebell", "weight_reps", "overhead_press", 90, "Kleine dip in je knieën en gebruik die kracht om de kettlebell boven je hoofd te drukken. Per kant.", U),
  e("kb-clean-press", "Kettlebell clean & press", "One-Arm_Kettlebell_Clean_and_Jerk", "shoulders", ["glutes", "hamstrings", "triceps"], "kettlebell", "weight_reps", "complex", 90, "Clean naar de rack-positie en direct door naar een press boven je hoofd. Per kant.", U),
  e("kb-row", "Kettlebell row", "One-Arm_Kettlebell_Row", "back", ["biceps"], "kettlebell", "weight_reps", "horizontal_row", 75, "Voorovergebogen met rechte rug, trek de kettlebell naar je heup. Per kant.", U),
  e("kb-gorilla-row", "Gorilla row", "Two-Arm_Kettlebell_Row", "back", ["biceps", "abs"], "kettlebell", "weight_reps", "horizontal_row", 75, "Twee kettlebells op de grond tussen je voeten, diepe hinge. Roei afwisselend links en rechts terwijl je de andere kettlebell op de grond houdt."),
  e("kb-deadlift", "Kettlebell deadlift", "Kettlebell_Dead_Clean", "glutes", ["hamstrings", "lower_back", "quads"], "kettlebell", "weight_reps", "hinge", 90, "Kettlebell tussen je voeten. Heupen naar achteren, rug recht, kom rechtop door je heupen te strekken."),
  e("kb-single-leg-rdl", "Eenbenige deadlift (kettlebell)", "Kettlebell_One-Legged_Deadlift", "hamstrings", ["glutes", "lower_back"], "kettlebell", "weight_reps", "hinge", 75, "Sta op één been, kettlebell in de tegenovergestelde hand. Buig voorover tot je romp bijna horizontaal is, achterste been gestrekt. Per been.", U),
  e("kb-high-pull", "Kettlebell sumo high pull", "Kettlebell_Sumo_High_Pull", "traps", ["shoulders", "glutes", "quads"], "kettlebell", "weight_reps", "upright_row", 75, "Brede stand, kettlebell tussen je voeten. Kom explosief omhoog en trek de kettlebell met hoge ellebogen naar je kin."),
  e("kb-turkish-getup", "Turkish get-up", "Kettlebell_Turkish_Get-Up_Lunge_style", "shoulders", ["abs", "glutes", "quads"], "kettlebell", "weight_reps", "complex", 90, "Van liggend naar staand en terug, met de kettlebell steeds recht boven je schouder. Langzaam en gecontroleerd. Per kant.", U),
  e("kb-windmill", "Kettlebell windmill", "Kettlebell_Windmill", "abs", ["shoulders", "hamstrings", "glutes"], "kettlebell", "weight_reps", "rotation", 60, "Kettlebell boven je hoofd, kijk ernaar. Duw je heup opzij en zak met je vrije hand langs je been naar beneden. Per kant.", U),
  e("kb-halo", "Kettlebell halo", null, "shoulders", ["abs", "traps"], "kettlebell", "weight_reps", "rotation", 45, "Houd de kettlebell bij de hoorns en draai hem in een cirkel rond je hoofd. Romp stil. Herhalingen per richting."),
  e("kb-figure-8", "Kettlebell figure 8", "Kettlebell_Figure_8", "abs", ["glutes", "forearms"], "kettlebell", "weight_reps", "rotation", 45, "In een halve hinge geef je de kettlebell in een achtvorm tussen je benen door van hand naar hand."),
  e("kb-around-world", "Around the world", "Kettlebell_Pass_Between_The_Legs", "abs", ["forearms", "shoulders"], "kettlebell", "weight_reps", "rotation", 45, "Geef de kettlebell rond je middel door van hand naar hand. Romp stil, wissel na de helft van richting."),
  e("kb-thruster", "Kettlebell thruster", "Kettlebell_Thruster", "quads", ["shoulders", "glutes", "triceps"], "kettlebell", "weight_reps", "complex", 90, "Front squat met de kettlebell(s) in de rack-positie en druk ze bij het omhoogkomen in één beweging boven je hoofd."),
  e("kb-reverse-lunge", "Reverse lunge (kettlebell)", "Dumbbell_Rear_Lunge", "quads", ["glutes"], "kettlebell", "weight_reps", "lunge", 75, "Kettlebell in de rack-positie of naast je lichaam. Stap naar achteren en zak. Per been.", U),
  e("kb-floor-press", "Kettlebell floor press", "One-Arm_Kettlebell_Floor_Press", "chest", ["triceps", "shoulders"], "kettlebell", "weight_reps", "horizontal_press", 75, "Lig op de grond. Druk de kettlebell recht omhoog en zak tot je elleboog de grond raakt. Per kant.", U),
  e("kb-pistol", "Pistol squat (kettlebell)", "Kettlebell_Pistol_Squat", "quads", ["glutes", "abs"], "kettlebell", "weight_reps", "squat", 90, "Op één been diep squatten met het andere been gestrekt voor je. Kettlebell voor je borst als tegengewicht. Per been.", U),
  e("kb-farmer-carry", "Kettlebell farmer's carry", "Farmers_Walk", "forearms", ["traps", "abs"], "kettlebell", "custom", "carry", 75, "Loop met een zware kettlebell in elke hand, rechtop, korte stappen.", { metrics: ["weight", "distance"] }),
  e("kb-suitcase-carry", "Suitcase carry", "Farmers_Walk", "abs", ["forearms", "traps"], "kettlebell", "custom", "carry", 60, "Loop met één kettlebell aan één kant. Blijf rechtop en voorkom dat je opzij hangt. Afstand per kant.", { metrics: ["weight", "distance"], unilateral: true }),

  // ───────── Landmine (halterstang in hoekhouder of hoek)
  e("landmine-press", "Landmine press (één arm)", null, "shoulders", ["chest", "triceps", "abs"], "barbell", "weight_reps", "landmine_press", 75, "Staand of half geknield, uiteinde van de stang bij je schouder. Druk schuin omhoog en naar voren tot je arm gestrekt is. Gewicht = schijven op de stang. Per kant.", U),
  e("landmine-press-2h", "Landmine press (twee handen)", null, "chest", ["shoulders", "triceps"], "barbell", "weight_reps", "landmine_press", 90, "Houd het uiteinde met beide handen voor je borst en druk schuin omhoog. Vriendelijk voor de schouders."),
  e("landmine-squat", "Landmine squat", null, "quads", ["glutes", "abs"], "barbell", "weight_reps", "squat", 90, "Houd het uiteinde voor je borst, leun licht in de stang en squat diep. Goede techniekoefening."),
  e("landmine-row", "Landmine row (T-bar)", "T-Bar_Row_with_Handle", "back", ["biceps", "traps", "lower_back"], "barbell", "weight_reps", "horizontal_row", 90, "Sta over de stang met een V-handgreep onder de schijven. Rug recht, trek naar je borst."),
  e("landmine-meadows-row", "Meadows row", null, "back", ["biceps", "forearms"], "barbell", "weight_reps", "horizontal_row", 75, "Sta haaks naast het uiteinde, pak het dikke deel bovenhands en roei met één arm naar je heup. Per kant.", U),
  e("landmine-rdl", "Landmine Roemeense deadlift", null, "hamstrings", ["glutes", "lower_back"], "barbell", "weight_reps", "hinge", 90, "Houd het uiteinde met beide handen voor je heupen en buig vanuit de heupen naar voren met een rechte rug."),
  e("landmine-sl-rdl", "Landmine eenbenige RDL", null, "hamstrings", ["glutes", "abs"], "barbell", "weight_reps", "hinge", 75, "Uiteinde in de tegenovergestelde hand, buig voorover op één been. Zeer stabiel door de stang. Per been.", U),
  e("landmine-reverse-lunge", "Landmine reverse lunge", null, "quads", ["glutes", "abs"], "barbell", "weight_reps", "lunge", 75, "Uiteinde voor je borst of bij één schouder. Stap naar achteren en zak. Per been.", U),
  e("landmine-thruster", "Landmine thruster", null, "quads", ["shoulders", "glutes", "triceps"], "barbell", "weight_reps", "complex", 90, "Squat met het uiteinde voor je borst en druk bij het omhoogkomen explosief schuin omhoog."),
  e("landmine-rotation", "Landmine rotation (rainbow)", "Landmine_180s", "abs", ["shoulders", "glutes"], "barbell", "weight_reps", "rotation_power", 60, "Armen gestrekt, uiteinde boven je hoofd. Breng de stang in een boog naar je linkerheup en terug naar rechts. Draai vanuit je heupen en voeten. Herhalingen per kant."),
  e("landmine-180", "Landmine 180's", "Landmine_180s", "abs", ["shoulders"], "barbell", "weight_reps", "rotation_power", 60, "Zittend of staand met het uiteinde voor je borst. Draai de stang van heup naar heup terwijl je armen gestrekt blijven."),
  e("landmine-rotational-press", "Landmine rotational press", null, "shoulders", ["abs", "glutes", "chest"], "barbell", "weight_reps", "rotation_power", 75, "Begin met het uiteinde bij je schouder en je heup ingedraaid. Draai explosief open en druk de stang schuin omhoog, zoals een stoot. Per kant.", U),
  e("landmine-jammer", "Landmine jammer", "Landmine_Linear_Jammer", "shoulders", ["quads", "triceps", "glutes"], "barbell", "weight_reps", "landmine_press", 90, "Vanuit een halve squat explosief uitstrekken en de stang met beide handen omhoog stoten."),
  e("landmine-viper", "Landmine viper press", null, "shoulders", ["quads", "abs", "triceps"], "barbell", "weight_reps", "complex", 90, "Squat met het uiteinde bij één schouder, kom omhoog, draai en druk uit. Wissel bovenin van schouder."),
  e("landmine-hip-thrust", "Landmine hip thrust", null, "glutes", ["hamstrings"], "barbell", "weight_reps", "hip_thrust", 75, "Bovenrug tegen een bank, het dikke uiteinde van de stang over je heupen. Duw je heupen omhoog."),
  e("landmine-deadlift", "Landmine deadlift", null, "glutes", ["hamstrings", "quads", "lower_back"], "barbell", "weight_reps", "hinge", 90, "Sta over het uiteinde met beide handen eromheen en kom rechtop. Prettig om de hinge aan te leren."),

  // ───────── Plyometrie / sprongkracht
  e("jump-squat", "Jump squat", "Freehand_Jump_Squat", "quads", ["glutes", "calves"], "bodyweight", "bodyweight_reps", "jump", 75, "Kwart- tot halve squat en spring explosief omhoog. Land zacht door je knieën en ga direct door."),
  e("weighted-jump-squat", "Jump squat met gewicht", "Weighted_Jump_Squat", "quads", ["glutes", "calves"], "dumbbell", "weight_reps", "jump", 90, "Jump squat met lichte dumbbells of een stang. Snelheid belangrijker dan gewicht."),
  e("box-jump-lateral", "Laterale box jump", "Lateral_Box_Jump", "quads", ["glutes", "adductors", "abductors"], "bodyweight", "bodyweight_reps", "jump", 75, "Spring zijwaarts op een kist en stap of spring terug. Per kant."),
  e("depth-jump", "Depth jump", "Linear_Depth_Jump", "quads", ["calves", "glutes"], "bodyweight", "bodyweight_reps", "jump", 120, "Stap van een kist, land en spring direct zo hoog of ver mogelijk. Kort grondcontact. Alleen uitgerust doen."),
  e("broad-jump", "Broad jump (verspringen)", "Standing_Long_Jump", "glutes", ["quads", "hamstrings", "calves"], "bodyweight", "custom", "jump", 90, "Zwaai je armen en spring zo ver mogelijk vooruit. Land stabiel. Registreer de afstand.", { metrics: ["reps", "distance"] }),
  e("tuck-jump", "Tuck jump", "Knee_Tuck_Jump", "quads", ["abs", "calves"], "bodyweight", "bodyweight_reps", "jump", 60, "Spring omhoog en trek je knieën naar je borst. Land zacht en ga direct door."),
  e("split-jump", "Split jump (jumping lunge)", "Split_Jump", "quads", ["glutes", "calves"], "bodyweight", "bodyweight_reps", "jump", 60, "Vanuit een lunge omhoog springen en in de lucht van been wisselen. Herhalingen totaal."),
  e("skater-jump", "Skater jumps", "Lateral_Bound", "glutes", ["quads", "abductors", "calves"], "bodyweight", "bodyweight_reps", "jump", 60, "Spring zijwaarts van been naar been, zoals een schaatser. Land op één been en stabiliseer kort."),
  e("lateral-bound", "Lateral bound", "Lateral_Bound", "glutes", ["quads", "abductors"], "bodyweight", "bodyweight_reps", "jump", 60, "Explosief zijwaarts afzetten op één been en landen op het andere. Per kant."),
  e("single-leg-hop", "Eenbenige hops", "Single-Leg_Hop_Progression", "calves", ["quads", "glutes"], "bodyweight", "bodyweight_reps", "jump", 60, "Spring herhaaldelijk op één been vooruit of over lijntjes. Per been.", U),
  e("hurdle-hops", "Hurdle hops", "Hurdle_Hops", "calves", ["quads", "glutes"], "bodyweight", "bodyweight_reps", "jump", 75, "Spring met beide voeten over een rij lage hordes of kegels, kort grondcontact."),
  e("pogo-jumps", "Pogo jumps", "Rope_Jumping", "calves", ["quads"], "bodyweight", "bodyweight_reps", "jump", 45, "Kleine, snelle sprongen vanuit je enkels met bijna gestrekte knieën."),
  e("star-jump", "Star jumps", "Star_Jump", "quads", ["shoulders", "calves"], "bodyweight", "bodyweight_reps", "jump", 45, "Spring omhoog en spreid armen en benen als een ster. Land zacht."),
  e("frog-hops", "Frog hops", "Frog_Hops", "quads", ["glutes", "calves"], "bodyweight", "bodyweight_reps", "jump", 60, "Diep in de squat, spring vooruit en land weer diep."),
  e("plyo-push-up", "Plyo push-up (klap push-up)", "Plyo_Push-up", "chest", ["triceps", "shoulders"], "bodyweight", "bodyweight_reps", "jump", 75, "Druk zo explosief omhoog dat je handen loskomen, klap eventueel, en land zacht."),
  e("box-jump-step-down", "Seated box jump", "Dumbbell_Seated_Box_Jump", "quads", ["glutes"], "bodyweight", "bodyweight_reps", "jump", 75, "Zit op een bank, sta explosief op en spring direct op een kist. Traint pure startkracht."),

  // ───────── Medicine ball / rotatiekracht
  e("mb-slam", "Medicine ball slam", "Overhead_Slam", "abs", ["back", "shoulders"], "other", "weight_reps", "throw", 60, "Til de bal boven je hoofd en smijt hem met volle kracht op de grond. Vang of pak op en herhaal."),
  e("mb-rotational-throw", "Rotatie-worp tegen muur", "Medicine_Ball_Scoop_Throw", "abs", ["glutes", "shoulders"], "other", "weight_reps", "rotation_power", 60, "Zijwaarts naast een muur. Draai weg en gooi de bal explosief vanuit je heupen tegen de muur. Per kant."),
  e("mb-scoop-toss", "Scoop toss", "Medicine_Ball_Scoop_Throw", "glutes", ["hamstrings", "shoulders"], "other", "weight_reps", "throw", 60, "Bal tussen je benen, explosieve heupstrekking en gooi de bal naar voren of achterover omhoog."),
  e("mb-chest-pass", "Medicine ball chest pass", "Medicine_Ball_Chest_Pass", "chest", ["triceps", "shoulders"], "other", "weight_reps", "throw", 60, "Stoot de bal explosief vanaf je borst tegen een muur of naar een partner."),
  e("mb-overhead-throw", "Overhead throw", "Standing_Two-Arm_Overhead_Throw", "back", ["shoulders", "abs", "triceps"], "other", "weight_reps", "throw", 60, "Bal achter je hoofd en gooi hem met beide armen zo hard mogelijk naar voren."),
  e("mb-backward-throw", "Achterwaartse worp", "Backward_Medicine_Ball_Throw", "glutes", ["hamstrings", "back"], "other", "weight_reps", "throw", 75, "Bal tussen je benen, explosief uitstrekken en de bal over je hoofd naar achteren gooien."),
  e("wall-ball", "Wall ball", null, "quads", ["shoulders", "glutes"], "other", "weight_reps", "complex", 75, "Squat met de bal voor je borst en gooi hem bij het omhoogkomen naar een doel hoog op de muur. Vang en ga direct door."),
  e("mb-russian-twist", "Russian twist met bal", "Medicine_Ball_Full_Twist", "abs", [], "other", "weight_reps", "rotation", 45, "Zittend, benen los van de grond. Tik de bal links en rechts naast je heup."),
  e("cable-woodchop-low-high", "Woodchop (laag naar hoog)", "Standing_Cable_Wood_Chop", "abs", ["shoulders", "glutes"], "cable", "weight_reps", "rotation", 45, "Katrol laag. Trek de handgreep diagonaal over je lichaam omhoog, draai vanuit je heupen. Per kant.", U),
  e("cable-rotation", "Cable rotation (horizontaal)", "Standing_Cable_Wood_Chop", "abs", ["shoulders"], "cable", "weight_reps", "rotation", 45, "Katrol op borsthoogte, armen gestrekt. Draai je romp weg van de katrol en kom gecontroleerd terug. Per kant.", U),
  e("pallof-rotation", "Pallof press met rotatie", "Pallof_Press_With_Rotation", "abs", ["shoulders"], "cable", "weight_reps", "rotation", 45, "Pallof press, maar draai bij gestrekte armen weg van de katrol en terug. Per kant.", U),
  e("band-pull-apart", "Band pull-apart", "Band_Pull_Apart", "shoulders", ["traps", "back"], "band", "bodyweight_reps", "rear_delt", 45, "Houd een band op schouderhoogte en trek hem uit elkaar tot hij je borst raakt."),
  e("plate-twist", "Plate twist", "Plate_Twist", "abs", [], "other", "weight_reps", "rotation", 45, "Zittend, schijf voor je borst. Draai van links naar rechts."),
  e("seated-barbell-twist", "Barbell twist", "Seated_Barbell_Twist", "abs", [], "barbell", "weight_reps", "rotation", 45, "Stang op je rug, zittend of staand. Draai gecontroleerd van links naar rechts."),

  // ───────── Combinaties / conditie
  e("man-maker", "Man maker", "Alternating_Renegade_Row", "chest", ["back", "shoulders", "quads", "abs"], "dumbbell", "weight_reps", "complex", 90, "Push-up op dumbbells, roei links en rechts, spring naar je handen, clean de dumbbells en druk ze boven je hoofd. Dat is één herhaling."),
  e("devil-press", "Devil press", null, "shoulders", ["glutes", "hamstrings", "chest"], "dumbbell", "weight_reps", "complex", 90, "Burpee met je handen op de dumbbells, spring terug en zwaai de dumbbells in één beweging van de grond tot boven je hoofd."),
  e("renegade-row", "Renegade row", "Alternating_Renegade_Row", "back", ["abs", "biceps", "chest"], "dumbbell", "weight_reps", "horizontal_row", 75, "In push-uppositie op twee dumbbells. Roei afwisselend links en rechts zonder je heupen te draaien."),
  e("db-snatch", "Dumbbell snatch", null, "shoulders", ["glutes", "hamstrings", "traps"], "dumbbell", "weight_reps", "olympic", 90, "Dumbbell tussen je voeten, explosief uitstrekken en in één beweging boven je hoofd trekken. Per kant.", U),
  e("db-clean-press", "Dumbbell clean & press", "Dumbbell_Clean", "shoulders", ["glutes", "hamstrings", "triceps"], "dumbbell", "weight_reps", "complex", 90, "Clean de dumbbells naar je schouders en druk ze direct boven je hoofd."),
  e("db-thruster", "Dumbbell thruster", "Kettlebell_Thruster", "quads", ["shoulders", "glutes"], "dumbbell", "weight_reps", "complex", 90, "Front squat met dumbbells op je schouders en druk ze bij het omhoogkomen boven je hoofd."),
  e("squat-to-press", "Squat to press", null, "quads", ["shoulders", "glutes"], "dumbbell", "weight_reps", "complex", 75, "Goblet squat en druk de dumbbell bovenin recht boven je hoofd."),
  e("lunge-twist", "Lunge met rotatie", "Bodyweight_Walking_Lunge", "quads", ["abs", "glutes"], "other", "weight_reps", "lunge", 60, "Lunge vooruit en draai je romp met een gewicht of bal naar je voorste been. Per kant.", U),
  e("rdl-row", "RDL + row", "Bent_Over_Two-Dumbbell_Row", "hamstrings", ["back", "glutes", "biceps"], "dumbbell", "weight_reps", "complex", 90, "Roemeense deadlift met dumbbells, onderin een roeibeweging en dan weer omhoog."),
  e("clean-and-jerk", "Clean and jerk", "Clean_and_Jerk", "quads", ["glutes", "shoulders", "traps", "hamstrings"], "barbell", "weight_reps", "olympic", 180, "Clean de stang naar je schouders en stoot hem met een dip en drive boven je hoofd, eventueel in spreidstand."),
  e("snatch", "Snatch", "Snatch", "hamstrings", ["glutes", "shoulders", "traps", "quads"], "barbell", "weight_reps", "olympic", 180, "Brede greep, trek de stang in één beweging van de grond tot boven je hoofd en vang hem in een squat."),
  e("hang-clean", "Hang clean", "Hang_Clean", "hamstrings", ["glutes", "traps", "quads"], "barbell", "weight_reps", "olympic", 150, "Begin met de stang boven je knieën. Explosieve heupstrekking en vang de stang op je schouders."),
  e("push-press", "Push press", "Push_Press", "shoulders", ["triceps", "quads"], "barbell", "weight_reps", "overhead_press", 120, "Dip kort in je knieën en gebruik die kracht om de stang boven je hoofd te drukken."),
  e("burpee-pull-up", "Burpee pull-up", null, "back", ["chest", "quads", "biceps"], "bodyweight", "bodyweight_reps", "complex", 75, "Burpee onder een stang en spring in een pull-up."),
  e("bear-crawl", "Bear crawl", "Bear_Crawl_Sled_Drags", "abs", ["shoulders", "quads"], "bodyweight", "custom", "crawl", 60, "Op handen en voeten met je knieën net boven de grond, kruip vooruit en achteruit.", { metrics: ["distance", "time"] }),
  e("battle-ropes", "Battle ropes", "Battling_Ropes", "shoulders", ["abs", "forearms"], "other", "time", "conditioning", 60, "Maak golven met beide touwen, afwisselend of tegelijk, vanuit een halve squat."),
  e("sled-pull", "Sled pull / drag", "Sled_Drag_-_Harness", "quads", ["glutes", "hamstrings", "back"], "other", "custom", "carry", 120, "Trek de slee achter je aan met een harnas of touw, of trek hem hand over hand naar je toe.", { metrics: ["weight", "distance"] }),
  e("sledgehammer", "Sledgehammer swings", "Sledgehammer_Swings", "abs", ["shoulders", "back", "forearms"], "other", "bodyweight_reps", "rotation_power", 60, "Sla met een moker op een band, afwisselend van links en rechts. Kracht uit je heupen."),
  e("tire-flip", "Tire flip", "Tire_Flip", "glutes", ["hamstrings", "quads", "back", "chest"], "other", "bodyweight_reps", "complex", 120, "Hurk, pak de band onderaan, duw met je heupen omhoog en kantel hem."),
  e("sandbag-carry", "Sandbag carry / load", "Sandbag_Load", "glutes", ["back", "abs", "quads"], "other", "custom", "carry", 90, "Til de zandzak op en draag hem voor je borst of over je schouder.", { metrics: ["weight", "distance"] }),
  e("assault-bike", "Assault bike / air bike", "Bicycling_Stationary", "quads", ["shoulders", "hamstrings"], "cardio", "custom", "cardio", 0, "Fietsen met beweegbare armen. Registreer tijd en calorieën of afstand.", { metrics: ["time", "distance"] }),
  e("ski-erg", "SkiErg", "Rowing_Stationary", "back", ["triceps", "abs", "shoulders"], "cardio", "distance", "cardio", 0, "Trek de handgrepen met gestrekte armen omlaag en buig mee in je heupen. Registreer afstand en tijd."),
  e("rope-climb", "Touwklimmen", "Rope_Climb", "back", ["biceps", "forearms"], "bodyweight", "bodyweight_reps", "vertical_pull", 120, "Klim met armen en voeten (klem) in het touw naar boven en zak gecontroleerd."),
  e("muscle-up", "Muscle-up", "Muscle_Up", "back", ["chest", "triceps"], "bodyweight", "bodyweight_reps", "vertical_pull", 150, "Explosieve pull-up die overgaat in een dip boven de stang of ringen."),

  // ───────── Core
  e("dead-bug", "Dead bug", "Dead_Bug", "abs", [], "bodyweight", "bodyweight_reps", "plank", 45, "Op je rug, armen en knieën omhoog. Strek afwisselend tegenovergestelde arm en been uit zonder je onderrug los te laten."),
  e("hollow-hold", "Hollow hold", null, "abs", [], "bodyweight", "time", "plank", 45, "Op je rug, onderrug in de grond, schouders en gestrekte benen net boven de grond. Houd vast."),
  e("bird-dog", "Bird dog", null, "lower_back", ["abs", "glutes"], "bodyweight", "bodyweight_reps", "plank", 45, "Op handen en knieën strek je tegenovergestelde arm en been uit en houd kort vast. Per kant."),
  e("v-up", "V-up", "Jackknife_Sit-Up", "abs", [], "bodyweight", "bodyweight_reps", "crunch", 45, "Kom vanuit liggend tegelijk met gestrekte armen en benen omhoog tot een V."),
  e("flutter-kicks", "Flutter kicks", "Flutter_Kicks", "abs", [], "bodyweight", "time", "leg_raise", 45, "Op je rug, benen gestrekt net boven de grond, en trap kleine slagen op en neer."),
  e("windshield-wipers", "Windshield wipers", null, "abs", ["lower_back"], "bodyweight", "bodyweight_reps", "rotation", 60, "Liggend of hangend met benen omhoog, draai je benen van links naar rechts. Herhalingen totaal."),
  e("superman", "Superman", "Superman", "lower_back", ["glutes"], "bodyweight", "bodyweight_reps", "back_extension", 45, "Op je buik, til armen en benen tegelijk op en houd kort vast."),
  e("plank-shoulder-tap", "Plank met shoulder taps", null, "abs", ["shoulders"], "bodyweight", "bodyweight_reps", "plank", 45, "In hoge plank tik je afwisselend je schouder aan zonder je heupen te laten draaien."),
  e("side-plank-rotation", "Side plank met rotatie", "Side_Bridge", "abs", ["shoulders"], "bodyweight", "bodyweight_reps", "rotation", 45, "In zijwaartse plank draai je je bovenste arm onder je lichaam door en weer open. Per kant.", U),
  e("ab-rollout-barbell", "Barbell rollout", "Ab_Roller", "abs", ["shoulders", "lower_back"], "barbell", "bodyweight_reps", "plank", 60, "Geknield met handen op een stang met schijven. Rol naar voren en terug met een stabiele romp."),

  // ───────── Mobiliteit (dynamisch, herhalingen)
  e("worlds-greatest-stretch", "World's greatest stretch", "Worlds_Greatest_Stretch", "glutes", ["hamstrings", "back", "adductors"], "bodyweight", "bodyweight_reps", "mobility", 15, "Grote lunge, hand naast je voorste voet. Breng je elleboog naar je enkel, draai daarna je arm open naar het plafond. Per kant.", U),
  e("cat-cow", "Cat-cow", "Cat_Stretch", "lower_back", ["back", "abs"], "bodyweight", "bodyweight_reps", "mobility", 15, "Op handen en knieën. Maak je rug bol en kijk naar je navel, dan hol met je borst naar voren. Rustig ademen."),
  e("thoracic-rotation", "Thoracale rotatie (open book)", "Torso_Rotation", "back", ["shoulders"], "bodyweight", "bodyweight_reps", "mobility", 15, "Lig op je zij met knieën gebogen, armen gestrekt voor je. Draai je bovenste arm in een boog naar de andere kant en volg met je blik. Per kant.", U),
  e("thread-the-needle", "Thread the needle", "Middle_Back_Stretch", "back", ["shoulders"], "bodyweight", "bodyweight_reps", "mobility", 15, "Op handen en knieën. Schuif één arm onder je lichaam door tot je schouder de grond raakt en draai daarna open naar het plafond. Per kant.", U),
  e("hip-90-90", "90/90 heupwissel", "90_90_Hamstring", "glutes", ["adductors", "abductors"], "bodyweight", "bodyweight_reps", "mobility", 15, "Zittend met beide knieën in 90 graden. Draai je knieën van links naar rechts zonder je handen te gebruiken. Rechtop blijven."),
  e("hip-cars", "Heup-CARs", "Standing_Hip_Circles", "glutes", ["abductors", "adductors"], "bodyweight", "bodyweight_reps", "mobility", 15, "Op handen en knieën of staand. Maak met je knie de grootst mogelijke langzame cirkel vanuit je heup. Per kant en richting.", U),
  e("shoulder-cars", "Schouder-CARs", "Arm_Circles", "shoulders", ["back"], "bodyweight", "bodyweight_reps", "mobility", 15, "Maak met een gestrekte arm de grootst mogelijke langzame cirkel. Romp blijft stil. Per kant en richting.", U),
  e("band-dislocates", "Band dislocates", "Round_The_World_Shoulder_Stretch", "shoulders", ["back", "chest"], "band", "bodyweight_reps", "mobility", 15, "Houd een band of stok breed vast en breng hem met gestrekte armen over je hoofd naar achteren en terug. Hoe smaller, hoe zwaarder."),
  e("wall-slides", "Wall slides", "Upward_Stretch", "shoulders", ["traps", "back"], "bodyweight", "bodyweight_reps", "mobility", 15, "Rug en armen tegen de muur, ellebogen 90 graden. Schuif je armen omhoog zonder dat ze loskomen van de muur."),
  e("inchworm", "Inchworm", "Inchworm", "hamstrings", ["shoulders", "abs"], "bodyweight", "bodyweight_reps", "mobility", 15, "Buig voorover, loop met je handen naar een plank en loop met kleine stapjes terug naar je handen."),
  e("deep-squat-hold", "Diepe squat-houding", "Sit_Squats", "quads", ["adductors", "glutes", "calves"], "bodyweight", "time", "mobility", 15, "Zak zo diep mogelijk in een squat met hielen aan de grond, ellebogen tegen je knieën. Houd vast en adem rustig."),
  e("cossack-squat", "Cossack squat", null, "adductors", ["quads", "glutes"], "bodyweight", "bodyweight_reps", "mobility", 30, "Brede stand. Zak naar één kant terwijl het andere been gestrekt blijft met tenen omhoog. Wissel af."),
  e("ankle-mobility", "Enkelmobiliteit tegen muur", "Ankle_Circles", "calves", [], "bodyweight", "bodyweight_reps", "mobility", 15, "Voet een handbreedte van de muur, duw je knie over je tenen naar de muur zonder dat je hiel loskomt. Per kant.", U),
  e("leg-swings", "Leg swings", "Front_Leg_Raises", "hamstrings", ["adductors", "glutes"], "bodyweight", "bodyweight_reps", "mobility", 15, "Houd je vast en zwaai je been ontspannen voor- en achterwaarts of zijwaarts. Per been.", U),
  e("jefferson-curl", "Jefferson curl", "Standing_Toe_Touches", "lower_back", ["hamstrings"], "dumbbell", "weight_reps", "mobility", 30, "Op een verhoging met een licht gewicht. Rol wervel voor wervel naar beneden en weer omhoog. Begin zonder of met heel weinig gewicht."),
  e("scorpion", "Scorpion", "Upper_Back-Leg_Grab", "glutes", ["lower_back", "back"], "bodyweight", "bodyweight_reps", "mobility", 15, "Op je buik met armen gespreid. Breng één voet over je lichaam naar de andere hand. Per kant."),
  e("neck-mobility", "Nekmobiliteit", "Side_Neck_Stretch", "traps", [], "bodyweight", "bodyweight_reps", "mobility", 15, "Draai, kantel en knik je hoofd langzaam in alle richtingen binnen een comfortabel bereik."),

  // ───────── Stretchen & flexibiliteit (statisch, tijd)
  e("couch-stretch", "Couch stretch", "Kneeling_Hip_Flexor", "quads", ["glutes"], "bodyweight", "time", "stretch", 15, "Knie tegen een muur of bank met je voet omhoog, andere voet voor je. Duw je heup naar voren en span je bil aan. Per kant.", U),
  e("hip-flexor-stretch", "Heupbuigerstretch (geknield)", "Kneeling_Hip_Flexor", "quads", ["glutes"], "bodyweight", "time", "stretch", 15, "Halve knielstand. Kantel je bekken en schuif je heup naar voren tot je rek voelt aan de voorkant van je heup. Per kant.", U),
  e("pigeon-stretch", "Pigeon stretch", "IT_Band_and_Glute_Stretch", "glutes", ["abductors"], "bodyweight", "time", "stretch", 15, "Voorste been gebogen voor je, achterste been gestrekt naar achteren. Zak met je romp naar voren. Per kant.", U),
  e("figure-4-stretch", "Figure 4 stretch", "Lying_Glute", "glutes", [], "bodyweight", "time", "stretch", 15, "Op je rug, enkel over je andere knie. Trek het onderste been naar je borst. Per kant.", U),
  e("hamstring-stretch", "Hamstringstretch", "Hamstring_Stretch", "hamstrings", ["calves"], "bodyweight", "time", "stretch", 15, "Op je rug met een band of handen achter je knie. Trek je gestrekte been omhoog tot je rek voelt. Per kant.", U),
  e("seated-forward-fold", "Zittende vooroverbuiging", "Seated_Floor_Hamstring_Stretch", "hamstrings", ["lower_back", "calves"], "bodyweight", "time", "stretch", 15, "Zit met gestrekte benen en buig vanuit je heupen naar voren richting je tenen."),
  e("frog-stretch", "Frog stretch", "Intermediate_Groin_Stretch", "adductors", [], "bodyweight", "time", "stretch", 15, "Op handen en knieën met je knieën zo breed mogelijk. Duw je heupen rustig naar achteren."),
  e("butterfly-stretch", "Butterfly stretch", "Adductor_Groin", "adductors", [], "bodyweight", "time", "stretch", 15, "Zittend met je voetzolen tegen elkaar. Duw je knieën rustig naar de grond."),
  e("straddle-stretch", "Straddle (spreidzit)", "The_Straddle", "adductors", ["hamstrings"], "bodyweight", "time", "stretch", 15, "Zit met je benen zo breed mogelijk en buig met een rechte rug naar voren."),
  e("quad-stretch", "Quadricepsstretch (staand)", "Quad_Stretch", "quads", [], "bodyweight", "time", "stretch", 15, "Pak je enkel achter je vast en trek je hiel naar je bil. Knieën naast elkaar. Per kant.", U),
  e("calf-stretch", "Kuitstretch tegen muur", "Calf_Stretch_Hands_Against_Wall", "calves", [], "bodyweight", "time", "stretch", 15, "Handen tegen de muur, achterste been gestrekt met hiel aan de grond. Leun naar voren. Per kant.", U),
  e("childs-pose", "Child's pose", "Childs_Pose", "lower_back", ["back", "shoulders"], "bodyweight", "time", "stretch", 15, "Zit op je hielen, buig voorover en strek je armen voor je uit. Ontspan en adem diep."),
  e("cobra-stretch", "Cobra", "One_Half_Locust", "abs", ["lower_back"], "bodyweight", "time", "stretch", 15, "Op je buik, druk je bovenlichaam omhoog met gestrekte armen. Heupen blijven op de grond."),
  e("doorway-chest-stretch", "Borststretch in deuropening", "Chest_And_Front_Of_Shoulder_Stretch", "chest", ["shoulders"], "bodyweight", "time", "stretch", 15, "Onderarm tegen een deurpost, elleboog op schouderhoogte. Draai je romp weg tot je rek voelt in je borst. Per kant.", U),
  e("lat-stretch", "Latstretch", "Overhead_Lat", "back", ["triceps"], "bodyweight", "time", "stretch", 15, "Pak een paal of rek vast en hang met je heupen naar achteren en opzij. Per kant.", U),
  e("cross-body-shoulder", "Schouderstretch (arm over borst)", "Shoulder_Stretch", "shoulders", ["back"], "bodyweight", "time", "stretch", 15, "Trek je gestrekte arm over je borst met je andere hand. Per kant.", U),
  e("triceps-stretch", "Tricepsstretch", "Triceps_Stretch", "triceps", ["back"], "bodyweight", "time", "stretch", 15, "Hand achter je hoofd tussen je schouderbladen, duw je elleboog zacht naar beneden. Per kant.", U),
  e("wrist-stretch", "Pols- en onderarmstretch", "Kneeling_Forearm_Stretch", "forearms", [], "bodyweight", "time", "stretch", 15, "Op je knieën met handpalmen of handruggen op de grond, vingers naar je toe. Leun rustig naar achteren."),
  e("side-bend-stretch", "Zijwaartse stretch", "Standing_Lateral_Stretch", "abs", ["back"], "bodyweight", "time", "stretch", 15, "Arm boven je hoofd en buig opzij tot je rek voelt in je flank. Per kant.", U),
  e("spinal-twist", "Liggende rugdraai", "Spinal_Stretch", "lower_back", ["glutes"], "bodyweight", "time", "stretch", 15, "Op je rug, trek één knie over je lichaam naar de grond en kijk de andere kant op. Per kant.", U),
  e("dead-hang-stretch", "Dead hang (ontspannen)", "One_Handed_Hang", "back", ["forearms", "shoulders"], "bodyweight", "time", "stretch", 15, "Hang ontspannen aan een stang om je schouders en rug te strekken."),
];

// Uitgebreide bibliotheek uit free-exercise-db (Engelse naam en uitvoering), na de
// handgeschreven oefeningen zodat die bij zoeken voorrang krijgen.
const DB_EXERCISES: Exercise[] = (DB as Omit<Exercise, "is_custom" | "source">[]).map((x) => ({ ...x, is_custom: false, source: "db" }));
EXERCISES.push(...DB_EXERCISES);

export const EXERCISE_BY_ID: Map<string, Exercise> = new Map(EXERCISES.map((x) => [x.id, x]));

export type ExerciseGroup = "kracht" | "plyo" | "explosief" | "rotatie" | "combinatie" | "landmine" | "cardio" | "mobiliteit" | "stretchen";

export const GROUP_NAME: Record<ExerciseGroup, string> = {
  kracht: "Kracht",
  plyo: "Plyometrie",
  explosief: "Explosief & olympisch",
  rotatie: "Rotatie & core",
  combinatie: "Combinatie & conditie",
  landmine: "Landmine",
  cardio: "Cardio",
  mobiliteit: "Mobiliteit",
  stretchen: "Stretchen & flexibiliteit",
};

/** Mobiliteit en stretchen tellen niet als werksets of spiervolume. */
export function isMobilityExercise(exerciseId: string): boolean {
  const ex = EXERCISE_BY_ID.get(exerciseId);
  return !!ex && (ex.pattern === "mobility" || ex.pattern === "stretch");
}

export function exerciseGroup(e: Pick<Exercise, "id" | "name" | "pattern">): ExerciseGroup {
  if (/landmine/i.test(e.id) || /landmine/i.test(e.name)) return "landmine";
  switch (e.pattern) {
    case "jump":
    case "plyo":
    case "throw":
      return "plyo";
    case "olympic":
    case "kb_ballistic":
      return "explosief";
    case "rotation":
    case "rotation_power":
    case "plank":
      return "rotatie";
    case "complex":
    case "conditioning":
    case "crawl":
    case "carry":
      return "combinatie";
    case "cardio":
      return "cardio";
    case "mobility":
      return "mobiliteit";
    case "stretch":
      return "stretchen";
    default:
      return "kracht";
  }
}

export function imageUrl(image: string | null, frame: 0 | 1 = 0): string | null {
  if (!image) return null;
  if (image.startsWith("http") || image.startsWith("data:")) return image;
  // In de single-page build (artifact) relatief, zodat het pad onder elke basis-URL werkt
  const base = process.env.NEXT_PUBLIC_SPA === "1" ? "exercises" : "/exercises";
  return `${base}/${image}/${frame}.webp`;
}

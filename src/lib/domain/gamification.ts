import { addDays, startOfWeek, weekKey } from "./periods";

// Gamification. XP wordt volledig afgeleid uit opgeslagen gegevens (niet opgeteld bij
// elke opslag), dus opnieuw opslaan kan nooit dubbele XP opleveren. Badges worden
// eenmalig opgeslagen met de badge-sleutel als unieke id.

export const XP = {
  session: 100, // training afgerond
  working_set: 4,
  pr: 25,
  week_goal: 75, // weekdoel gehaald
};

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  xp: number;
  icon: "trophy" | "flame" | "weight" | "star" | "calendar" | "target";
  test: (s: AggregateStats) => boolean;
}

export interface AggregateStats {
  sessions: number;
  volume_kg: number;
  working_sets: number;
  prs: number;
  best_week_streak: number; // opeenvolgende weken met weekdoel gehaald
  longest_session_sec: number;
  early_sessions: number; // gestart voor 07:00
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first-workout", title: "Eerste training", description: "Je eerste training afgerond.", xp: 50, icon: "star", test: (s) => s.sessions >= 1 },
  { key: "workouts-10", title: "Op stoom", description: "10 trainingen afgerond.", xp: 100, icon: "flame", test: (s) => s.sessions >= 10 },
  { key: "workouts-25", title: "Vaste klant", description: "25 trainingen afgerond.", xp: 150, icon: "flame", test: (s) => s.sessions >= 25 },
  { key: "workouts-50", title: "Halve eeuw", description: "50 trainingen afgerond.", xp: 250, icon: "trophy", test: (s) => s.sessions >= 50 },
  { key: "workouts-100", title: "Honderdclub", description: "100 trainingen afgerond.", xp: 500, icon: "trophy", test: (s) => s.sessions >= 100 },
  { key: "volume-10k", title: "10.000 kg", description: "In totaal 10.000 kg verplaatst.", xp: 75, icon: "weight", test: (s) => s.volume_kg >= 10_000 },
  { key: "volume-100k", title: "100.000 kg", description: "In totaal 100.000 kg verplaatst.", xp: 200, icon: "weight", test: (s) => s.volume_kg >= 100_000 },
  { key: "volume-1m", title: "Miljoenair", description: "In totaal 1.000.000 kg verplaatst.", xp: 750, icon: "weight", test: (s) => s.volume_kg >= 1_000_000 },
  { key: "sets-500", title: "500 werksets", description: "500 voltooide werksets.", xp: 150, icon: "target", test: (s) => s.working_sets >= 500 },
  { key: "first-pr", title: "Nieuw record", description: "Je eerste persoonlijke record.", xp: 50, icon: "trophy", test: (s) => s.prs >= 1 },
  { key: "prs-25", title: "Recordjager", description: "25 persoonlijke records.", xp: 200, icon: "trophy", test: (s) => s.prs >= 25 },
  { key: "streak-4", title: "Vier weken consistent", description: "4 weken op rij je weekdoel gehaald.", xp: 200, icon: "calendar", test: (s) => s.best_week_streak >= 4 },
  { key: "streak-12", title: "Kwartaal consistent", description: "12 weken op rij je weekdoel gehaald.", xp: 500, icon: "calendar", test: (s) => s.best_week_streak >= 12 },
  { key: "early-bird", title: "Vroege vogel", description: "5 trainingen gestart voor 07:00.", xp: 75, icon: "star", test: (s) => s.early_sessions >= 5 },
];

export const ACHIEVEMENT_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export function levelFromXp(xp: number): { level: number; current: number; next: number; progress: number } {
  // Elk level vraagt 250 XP meer dan het vorige: 250, 500, 750...
  let level = 1;
  let floor = 0;
  let step = 250;
  while (xp >= floor + step) {
    floor += step;
    level++;
    step = 250 * level;
  }
  return { level, current: xp - floor, next: step, progress: (xp - floor) / step };
}

/** Aantal sessies per week (sleutel = maandag YYYY-MM-DD). */
export function sessionsPerWeek(startedAts: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const iso of startedAts) {
    const k = weekKey(new Date(iso));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Langste reeks opeenvolgende weken met minstens `goal` trainingen, en de huidige reeks. */
export function weekStreaks(startedAts: string[], goal: number, now: Date = new Date()): { best: number; current: number; weeksHit: number } {
  if (!startedAts.length || goal <= 0) return { best: 0, current: 0, weeksHit: 0 };
  const per = sessionsPerWeek(startedAts);
  const first = startOfWeek(new Date(startedAts.reduce((a, b) => (a < b ? a : b))));
  const thisWeek = startOfWeek(now);
  let best = 0;
  let run = 0;
  let weeksHit = 0;
  for (let w = first; w <= thisWeek; w = addDays(w, 7)) {
    const hit = (per.get(weekKey(w)) ?? 0) >= goal;
    if (hit) {
      run++;
      weeksHit++;
      best = Math.max(best, run);
    } else if (w.getTime() !== thisWeek.getTime()) {
      run = 0; // lopende week breekt de reeks nog niet
    }
  }
  return { best, current: run, weeksHit };
}

export function totalXp(stats: AggregateStats, weeksGoalHit: number, achievementXp: number): number {
  return stats.sessions * XP.session + stats.working_sets * XP.working_set + stats.prs * XP.pr + weeksGoalHit * XP.week_goal + achievementXp;
}

export interface MonthlyChallenge {
  key: string;
  title: string;
  target: number;
  unit: "trainingen" | "werksets";
  value: number;
}

/** Maandelijkse uitdaging: trainingen = weekdoel × 4; werksets = 110% van vorige maand (min. 40). */
export function monthlyChallenges(
  now: Date,
  weeklyGoal: number,
  thisMonth: { sessions: number; sets: number },
  lastMonthSets: number,
): MonthlyChallenge[] {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const setTarget = Math.max(40, Math.round((lastMonthSets * 1.1) / 5) * 5);
  return [
    { key: `challenge-${ym}-sessions`, title: "Trainingen deze maand", target: Math.max(4, weeklyGoal * 4), unit: "trainingen", value: thisMonth.sessions },
    { key: `challenge-${ym}-sets`, title: "Werksets: 10% meer dan vorige maand", target: setTarget, unit: "werksets", value: thisMonth.sets },
  ];
}

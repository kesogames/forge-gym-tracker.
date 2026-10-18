"use client";
import { Link } from "@/lib/nav";
import { useSearchParams } from "@/lib/nav";
import { Suspense, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Award, Clock, Dumbbell, Flame, Layers, TrendingUp, Trophy, Zap } from "lucide-react";
import { db } from "@/lib/db/db";
import { getPreviousPerformance, volumeContext } from "@/lib/db/repo";
import { ACHIEVEMENT_BY_KEY, XP } from "@/lib/domain/gamification";
import { PR_LABEL, PR_UNIT } from "@/lib/domain/records";
import { formatClock, formatTimeOfDay, formatDate } from "@/lib/domain/time";
import { formatKg, formatNumber, setVolume, round1 } from "@/lib/domain/volume";
import { MUSCLE_NAME } from "@/lib/data/muscles";
import { useSessionDetail, useSettings } from "@/lib/hooks";
import { sessionMuscles, sessionTotals } from "@/lib/stats";
import { Button, Card, Pill, SectionTitle } from "@/components/ui";
import { celebrate } from "@/components/Celebrate";

export default function Page() {
  return (
    <Suspense>
      <Summary />
    </Suspense>
  );
}

function Summary() {
  const id = useSearchParams().get("id");
  const detail = useSessionDetail(id);
  const settings = useSettings();
  const ctx = useLiveQuery(volumeContext, []);
  const achievements = useLiveQuery(async () => (id ? (await db().user_achievements.toArray()).filter((a) => a.session_id === id) : []), [id], []);
  const improvements = useLiveQuery(async () => {
    if (!detail || !ctx) return [];
    const out: { name: string; cur: number; prev: number; metric: "volume" | "reps" }[] = [];
    for (const we of detail.exercises) {
      const prev = await getPreviousPerformance(we.exercise_id, detail.session.started_at, detail.session.id);
      if (!prev) continue;
      const cur = detail.setsByExercise.get(we.id) ?? [];
      const useReps = we.metric_type === "bodyweight_reps" || we.metric_type === "assisted";
      const sum = (ss: typeof cur, metric: typeof we.metric_type) => ss.reduce((a, s) => a + (useReps ? (s.completed && s.set_type !== "warmup" ? s.reps ?? 0 : 0) : setVolume(s, metric, ctx)), 0);
      const c = sum(cur, we.metric_type);
      const p = sum(prev.sets, prev.workoutExercise.metric_type);
      if (c > 0 && p > 0) out.push({ name: we.exercise_name, cur: round1(c), prev: round1(p), metric: useReps ? "reps" : "volume" });
    }
    return out;
  }, [detail, ctx]);
  const fired = useRef(false);

  useEffect(() => {
    if (!detail || fired.current) return;
    fired.current = true;
    if (detail.prs.length || achievements.length) setTimeout(() => celebrate(60), 300);
  }, [detail, achievements.length]);

  if (detail === undefined || !ctx) return null;
  if (detail === null) return <p className="text-muted py-20 text-center">Training niet gevonden.</p>;

  const { session, exercises, prs } = detail;
  const bundle = { session, exercises, sets: [...detail.setsByExercise.values()].flat() };
  const t = sessionTotals(bundle, ctx);
  const muscles = [...sessionMuscles(bundle, settings.set_count_method).entries()].filter(([, v]) => v.primary > 0).sort((a, b) => b[1].primary - a[1].primary);
  const better = improvements?.filter((i) => i.cur > i.prev) ?? [];
  const xp = XP.session + t.working_sets * XP.working_set + prs.length * XP.pr + achievements.reduce((a, x) => a + x.xp, 0);
  const headline = prs.length > 0 ? "Lekker gewerkt. Je hebt jezelf verbeterd!" : better.length > 0 ? `Sterker dan vorige keer op ${better.length} ${better.length === 1 ? "oefening" : "oefeningen"}.` : "Lekker gewerkt. Consistentie wint.";
  const prByExercise = new Map(exercises.map((e) => [e.exercise_id, e.exercise_name]));

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-2">
      <div className="relative overflow-hidden rounded-[32px] bg-accent text-accent-ink p-6 sm:p-8 animate-rise">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-accent-ink/5" />
        <div className="absolute -right-4 bottom-0 size-28 rounded-full bg-accent-ink/5" />
        <div className="relative">
          <div className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Training voltooid</div>
          <div className="num text-7xl sm:text-8xl font-bold leading-none mt-2 tabular" data-testid="summary-total">{formatClock((session.total_duration_sec ?? 0) * 1000)}</div>
          <div className="text-sm font-semibold opacity-75 mt-1">totale trainingstijd</div>
          <p className="text-xl font-bold mt-5 leading-snug max-w-sm">{headline}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-ink/10 px-3 h-8 text-sm font-bold">
            <Zap className="size-4" /> +{formatNumber(xp)} XP
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Tile icon={Clock} label="Actieve trainingstijd" value={formatClock((session.active_duration_sec ?? 0) * 1000)} />
        <Tile icon={Clock} label="Start → eind" value={`${formatTimeOfDay(session.started_at)}–${session.ended_at ? formatTimeOfDay(session.ended_at) : "–"}`} />
        <Tile icon={Dumbbell} label="Oefeningen" value={String(exercises.length)} />
        <Tile icon={Layers} label="Werksets" value={String(t.working_sets)} sub={`${formatNumber(t.reps)} herhalingen`} />
        <Tile icon={Flame} label="Trainingsvolume" value={formatKg(t.volume_kg, settings.unit)} testId="summary-volume" />
        <Tile icon={Trophy} label="Persoonlijke records" value={String(prs.length)} accent={prs.length > 0} />
      </div>
      {(session.rest_duration_sec ?? 0) > 0 && <p className="text-sm text-muted -mt-3 px-1">Rusttijd tussen sets (rusttimer): {formatClock((session.rest_duration_sec ?? 0) * 1000, false)}</p>}

      {prs.length > 0 && (
        <section>
          <SectionTitle>Persoonlijke records</SectionTitle>
          <Card className="divide-y divide-line">
            {prs.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-4 animate-rise">
                <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent-text"><Trophy className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{prByExercise.get(p.exercise_id)}</div>
                  <div className="text-sm text-muted">{PR_LABEL[p.type]}{p.type === "e1rm" && " (schatting, Epley)"}</div>
                </div>
                <div className="text-right">
                  <div className="num text-xl font-bold">{formatNumber(p.value, 1)} {PR_UNIT[p.type]}</div>
                  {p.previous_value != null && <div className="text-xs text-muted tabular">was {formatNumber(p.previous_value, 1)}</div>}
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {achievements.length > 0 && (
        <section>
          <SectionTitle>Nieuwe badges</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            {achievements.map((a) => {
              const def = ACHIEVEMENT_BY_KEY.get(a.key);
              return (
                <Card key={a.id} className="p-4 flex items-center gap-3 animate-rise">
                  <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-ink"><Award className="size-6" /></span>
                  <div>
                    <div className="font-bold">{def?.title ?? a.key}</div>
                    <div className="text-sm text-muted">{def?.description} +{a.xp} XP</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {improvements && improvements.length > 0 && (
        <section>
          <SectionTitle>Vergeleken met vorige keer</SectionTitle>
          <Card className="divide-y divide-line">
            {improvements.map((i) => {
              const d = i.cur - i.prev;
              return (
                <div key={i.name} className="flex items-center gap-3 px-4 py-3">
                  <TrendingUp className={d > 0 ? "size-4 text-accent-text" : "size-4 text-muted rotate-90"} />
                  <span className="flex-1 truncate">{i.name}</span>
                  <span className="text-sm text-muted tabular">{i.metric === "volume" ? formatKg(i.prev, settings.unit) : `${i.prev} reps`} →</span>
                  <span className="num text-lg font-bold tabular">{i.metric === "volume" ? formatKg(i.cur, settings.unit) : `${i.cur} reps`}</span>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {muscles.length > 0 && (
        <section>
          <SectionTitle>Getrainde spiergroepen</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {muscles.map(([m, v]) => (
              <Pill key={m} tone="accent" className="h-8 px-3 text-sm">{MUSCLE_NAME[m]} · {v.primary} {v.primary === 1 ? "set" : "sets"}</Pill>
            ))}
          </div>
        </section>
      )}

      <div className="grid sm:grid-cols-2 gap-2 pt-2">
        <Link href={`/historie/detail?id=${session.id}`}><Button block size="lg" variant="secondary">Details bekijken</Button></Link>
        <Link href="/"><Button block size="lg" variant="primary">Naar dashboard <ArrowRight className="size-4" /></Button></Link>
      </div>
      <p className="text-center text-xs text-muted">{formatDate(session.started_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, accent, testId }: { icon: typeof Clock; label: string; value: string; sub?: string; accent?: boolean; testId?: string }) {
  return (
    <Card className="p-4">
      <Icon className={accent ? "size-4 text-accent-text" : "size-4 text-muted"} />
      <div className="num text-[28px] font-bold leading-tight mt-2 tabular" data-testid={testId}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </Card>
  );
}

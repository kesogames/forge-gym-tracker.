"use client";
import { useSearchParams } from "@/lib/nav";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, Award, Info, Lock, Plus, Scale, Trash2, Trophy } from "lucide-react";
import { db } from "@/lib/db/db";
import { addBodyWeight, applyDefaultGoals, deleteBodyWeight, setMuscleGoal, updateSettings } from "@/lib/db/repo";
import { useBundles, useExerciseMap, useLatestBodyweight, useSettings, type Bundle } from "@/lib/hooks";
import { ChartCard, SimpleBarChart, SimpleLineChart } from "@/components/charts";
import { Bar, Button, Card, Chip, cx, Delta, EmptyState, Field, inputCls, NumField, Pill, SectionTitle, Segmented, Sheet } from "@/components/ui";
import { ExercisePicker } from "@/components/ExercisePicker";
import { ExerciseImage } from "@/components/ExerciseImage";
import { MUSCLES, MUSCLE_NAME } from "@/lib/data/muscles";
import { periodRange, addDays, toYmd, startOfDay, type Range } from "@/lib/domain/periods";
import { exerciseHistory, periodStats, pctChange } from "@/lib/stats";
import { formatDate } from "@/lib/domain/time";
import { COUNT_METHOD_LABEL, formatKg, formatNumber } from "@/lib/domain/volume";
import { PR_LABEL, PR_UNIT } from "@/lib/domain/records";
import { ACHIEVEMENTS, levelFromXp, totalXp, weekStreaks } from "@/lib/domain/gamification";
import type { MuscleId } from "@/lib/types";
import { toast, errorMessage } from "@/components/toast";

type Tab = "muscles" | "exercise" | "body" | "records";

export default function Page() {
  return (
    <Suspense>
      <Progress />
    </Suspense>
  );
}

function Progress() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("oefening") ? "exercise" : typeof window !== "undefined" && window.location.hash === "#badges" ? "records" : "muscles");
  const bundles = useBundles();
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight">Progressie</h1>
        <p className="text-muted mt-1">Word je sterker? Hier zie je het.</p>
      </header>
      <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <Segmented value={tab} onChange={setTab} options={[{ value: "muscles", label: "Spiergroepen" }, { value: "exercise", label: "Per oefening" }, { value: "body", label: "Lichaamsgewicht" }, { value: "records", label: "Records & badges" }]} />
      </div>
      {bundles === undefined ? null : tab === "muscles" ? <Muscles bundles={bundles} /> : tab === "exercise" ? <ExerciseProgress bundles={bundles} initial={params.get("oefening")} /> : tab === "body" ? <BodyWeight /> : <Records bundles={bundles} />}
    </div>
  );
}

// ───────────────────────── Spiergroepen

function Muscles({ bundles }: { bundles: Bundle[] }) {
  const settings = useSettings();
  const goals = useLiveQuery(() => db().muscle_group_goals.toArray(), [], []);
  const goalMap = new Map(goals.map((g) => [g.muscle, g.sets_per_week]));
  const bw = useLatestBodyweight();
  const ctx = { bodyweight_kg: bw, include_bodyweight: settings.include_bodyweight_volume };
  const now = new Date();
  const thisW = periodStats(bundles.filter((b) => inR(b, periodRange("this_week", now))), ctx, settings.set_count_method);
  const lastW = periodStats(bundles.filter((b) => inR(b, periodRange("last_week", now))), ctx, settings.set_count_method);
  // laatste 4 volledige weken als basis voor 'structureel laag'
  const ws = periodRange("this_week", now).start;
  // twee volledig afgeronde weken voor het signaal 'grote verandering'
  const weekBefore = periodStats(bundles.filter((b) => inR(b, { start: addDays(ws, -14), end: addDays(ws, -7) })), ctx, settings.set_count_method);
  const four = periodStats(bundles.filter((b) => inR(b, { start: addDays(ws, -28), end: ws })), ctx, settings.set_count_method);
  const lastTrained = new Map<MuscleId, string>();
  for (const b of bundles) {
    for (const e of b.exercises) {
      if (!b.sets.some((s) => s.workout_exercise_id === e.id && s.completed && s.set_type !== "warmup")) continue;
      const cur = lastTrained.get(e.primary_muscle);
      if (!cur || b.session.started_at > cur) lastTrained.set(e.primary_muscle, b.session.started_at);
    }
  }
  const [edit, setEdit] = useState<MuscleId | null>(null);
  const [val, setVal] = useState<number | null>(null);
  const hasHistory = bundles.length >= 2;

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <Info className="size-5 text-muted shrink-0" />
        <div className="text-sm text-ink-2 flex-1">
          <b>Telmethode:</b> {COUNT_METHOD_LABEL[settings.set_count_method]}. Alleen voltooide werksets, geen warming-up.
        </div>
        <Segmented value={settings.set_count_method} onChange={(v) => updateSettings({ set_count_method: v })} options={[{ value: "primary", label: "Primair" }, { value: "weighted", label: "Gewogen" }]} />
      </Card>
      {goals.length === 0 && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-sm text-ink-2">Stel weekdoelen in per spiergroep (bijv. borst 12 sets). Het zijn jouw eigen doelen, geen universele norm.</div>
          <Button variant="secondary" onClick={applyDefaultGoals}>Voorbeelddoelen instellen</Button>
        </Card>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {MUSCLES.map((m) => {
          const c = thisW.muscles.get(m.id);
          const l = lastW.muscles.get(m.id);
          const cur = c?.counted ?? 0;
          const prev = l?.counted ?? 0;
          const goal = goalMap.get(m.id) ?? null;
          const avg4 = (four.muscles.get(m.id)?.counted ?? 0) / 4;
          const low = hasHistory && goal && avg4 < goal * 0.5;
          const before = weekBefore.muscles.get(m.id)?.counted ?? 0;
          const bigChange = before >= 4 && Math.abs(prev - before) / before > 0.5;
          const last = lastTrained.get(m.id);
          return (
            <Card key={m.id} className="p-4" data-testid={`muscle-${m.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted">{last ? `Laatst ${formatDate(last, { day: "numeric", month: "short" })}` : "Nog niet getraind"} · {c?.sessions ?? 0}× deze week</div>
                </div>
                <button onClick={() => { setEdit(m.id); setVal(goal); }} className="text-xs font-semibold text-accent-text">{goal ? "Doel" : "+ Doel"}</button>
              </div>
              <div className="flex items-end gap-2 mt-3">
                <span className="num text-4xl font-bold leading-none tabular">{formatNumber(cur, 1)}</span>
                {goal && <span className="text-muted text-lg num">/ {goal}</span>}
                <span className="text-sm text-muted mb-0.5">sets</span>
                <span className="ml-auto text-right">
                  <Delta value={Math.round((cur - prev) * 10) / 10} />
                  <span className="block text-[11px] text-muted tabular">vorige week {formatNumber(prev, 1)}</span>
                </span>
              </div>
              {goal ? <Bar value={cur / goal} className="mt-3" /> : <div className="mt-3 h-2" />}
              {(c?.secondary ?? 0) > 0 && settings.set_count_method === "primary" && <div className="text-[11px] text-muted mt-2">+{c!.secondary} sets als secundaire spier</div>}
              {low && <p className="mt-2 text-xs text-warn flex gap-1.5"><AlertCircle className="size-3.5 shrink-0 mt-px" /> De afgelopen 4 weken gemiddeld {formatNumber(avg4, 1)} sets, ruim onder je doel van {goal}.</p>}
              {!low && bigChange && <p className="mt-2 text-xs text-muted flex gap-1.5"><Info className="size-3.5 shrink-0 mt-px" /> Vorige week {formatNumber(prev, 1)} sets tegenover {formatNumber(before, 1)} de week ervoor. Bewust gekozen?</p>}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted">Signalen zijn bedoeld als hulpmiddel. Wat optimaal is verschilt per persoon, doel en herstel.</p>
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={`Weekdoel ${edit ? MUSCLE_NAME[edit] : ""}`} description="Aantal werksets per week." footer={
        <>
          <Button block onClick={async () => { await setMuscleGoal(edit!, null); setEdit(null); }}>Geen doel</Button>
          <Button variant="primary" block onClick={async () => { await setMuscleGoal(edit!, val); setEdit(null); }}>Opslaan</Button>
        </>
      }>
        <div className="h-16 rounded-2xl bg-surface-2"><NumField label="Sets per week" value={val} decimal={false} max={60} onCommit={setVal} className="h-16 text-3xl font-bold" placeholder="10" autoFocus /></div>
        <div className="flex flex-wrap gap-2 mt-3">{[6, 8, 10, 12, 14, 16, 20].map((n) => <Chip key={n} active={val === n} onClick={() => setVal(n)}>{n}</Chip>)}</div>
      </Sheet>
    </div>
  );
}

function inR(b: Bundle, r: Range) {
  const t = new Date(b.session.started_at).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
}

// ───────────────────────── Per oefening

function ExerciseProgress({ bundles, initial }: { bundles: Bundle[]; initial: string | null }) {
  const settings = useSettings();
  const map = useExerciseMap();
  const bw = useLatestBodyweight();
  const ctx = useMemo(() => ({ bodyweight_kg: bw, include_bodyweight: settings.include_bodyweight_volume }), [bw, settings.include_bodyweight_volume]);
  const used = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bundles) for (const e of b.exercises) m.set(e.exercise_id, (m.get(e.exercise_id) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [bundles]);
  const [id, setId] = useState<string | null>(initial ?? null);
  const [picker, setPicker] = useState(false);
  const [cmp, setCmp] = useState<"4w" | "3m" | "6m">("4w");
  useEffect(() => {
    if (!id && used[0]) setId(used[0]);
  }, [id, used]);
  const prs = useLiveQuery(() => (id ? db().exercise_prs.where("exercise_id").equals(id).toArray() : []), [id], []);
  if (!used.length) return <Card><EmptyState icon={<Trophy className="size-7" />} title="Nog geen gegevens" body="Na je eerste training zie je hier per oefening je gewicht, herhalingen, volume en geschatte 1RM door de tijd." /></Card>;
  const ex = id ? map.get(id) : undefined;
  const hist = id ? exerciseHistory(bundles, id, ctx) : [];
  const name = ex?.name ?? bundles.flatMap((b) => b.exercises).find((e) => e.exercise_id === id)?.exercise_name ?? "";
  const last = hist[hist.length - 1];
  const prevP = hist[hist.length - 2];
  const series = hist.map((h) => ({ label: formatDate(h.date, { day: "numeric", month: "short" }), gewicht: h.best_weight, reps: h.best_reps, volume: Math.round(h.volume), e1rm: h.best_e1rm, best: h.best_set, tijd: h.duration, afstand: h.distance }));
  // periodevergelijking
  const days = cmp === "4w" ? 28 : cmp === "3m" ? 91 : 182;
  const today = addDays(startOfDay(new Date()), 1);
  const a = hist.filter((h) => new Date(h.date) >= addDays(today, -days));
  const b = hist.filter((h) => new Date(h.date) < addDays(today, -days) && new Date(h.date) >= addDays(today, -2 * days));
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0; };
  const best = (xs: (number | null)[]) => Math.max(0, ...xs.filter((x): x is number => x != null));
  const hasWeight = series.some((s) => s.gewicht != null && s.gewicht > 0);
  const hasE1 = series.some((s) => s.e1rm != null);

  return (
    <div className="space-y-4">
      <Card className="p-3 flex items-center gap-3">
        <ExerciseImage image={ex?.image ?? null} name={name} className="size-14 rounded-2xl" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate">{name}</div>
          <div className="text-sm text-muted">{hist.length} keer uitgevoerd</div>
        </div>
        <Button variant="secondary" onClick={() => setPicker(true)}>Wissel</Button>
      </Card>
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {used.slice(0, 10).map((u) => <Chip key={u} active={u === id} onClick={() => setId(u)}>{map.get(u)?.name ?? u}</Chip>)}
      </div>

      {last && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-muted">Laatste prestatie · {formatDate(last.date, { day: "numeric", month: "short" })}</div><div className="num text-2xl font-bold mt-1">{last.best_set}</div><div className="text-xs text-muted">{last.sets} sets · {last.total_reps} reps</div></Card>
          <Card className="p-4"><div className="text-xs text-muted">Vorige prestatie{prevP && ` · ${formatDate(prevP.date, { day: "numeric", month: "short" })}`}</div><div className="num text-2xl font-bold mt-1">{prevP?.best_set ?? "–"}</div><div className="text-xs text-muted">{prevP ? `${prevP.sets} sets · ${prevP.total_reps} reps` : "Eerste keer"}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted">Beste set ooit</div><div className="num text-2xl font-bold mt-1">{hist.reduce((x, h) => ((h.best_e1rm ?? 0) > (x.best_e1rm ?? 0) ? h : x), hist[0]).best_set}</div><div className="text-xs text-muted">op basis van geschatte 1RM</div></Card>
          <Card className="p-4"><div className="text-xs text-muted">Geschatte 1RM</div><div className="num text-2xl font-bold mt-1">{hasE1 ? formatKg(best(hist.map((h) => h.best_e1rm)), settings.unit) : "–"}</div><div className="text-xs text-muted">Epley-formule · schatting</div></Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-3">
        {hasWeight && <ChartCard title="Gewicht door de tijd" subtitle="Zwaarste werkset per training" table={{ head: ["Datum", "kg", "Beste set"], rows: series.map((s) => [s.label, s.gewicht ?? "–", s.best]) }}><SimpleLineChart data={series} x="label" y="gewicht" unit="kg" labelFmt={(l, p) => `${l} · ${p.best}`} /></ChartCard>}
        {series.some((s) => s.reps != null) && <ChartCard title="Herhalingen door de tijd" subtitle="Meeste herhalingen in één set" table={{ head: ["Datum", "Reps"], rows: series.map((s) => [s.label, s.reps ?? "–"]) }}><SimpleLineChart data={series} x="label" y="reps" unit="reps" /></ChartCard>}
        {hasE1 && <ChartCard title="Geschatte 1RM" subtitle="Epley: gewicht × (1 + reps/30), sets t/m 12 reps" table={{ head: ["Datum", "Gesch. 1RM"], rows: series.map((s) => [s.label, s.e1rm ?? "–"]) }}><SimpleLineChart data={series} x="label" y="e1rm" unit="kg" /></ChartCard>}
        {series.some((s) => s.volume > 0) && <ChartCard title="Trainingsvolume per training" subtitle="Gewicht × herhalingen, werksets" table={{ head: ["Datum", "Volume (kg)"], rows: series.map((s) => [s.label, s.volume]) }}><SimpleBarChart data={series} x="label" y="volume" unit="kg" /></ChartCard>}
        {series.some((s) => s.tijd != null) && <ChartCard title="Tijd per training" table={{ head: ["Datum", "Sec"], rows: series.map((s) => [s.label, s.tijd ?? "–"]) }}><SimpleBarChart data={series} x="label" y="tijd" unit="s" /></ChartCard>}
        {series.some((s) => s.afstand != null) && <ChartCard title="Afstand per training" table={{ head: ["Datum", "Meter"], rows: series.map((s) => [s.label, s.afstand ?? "–"]) }}><SimpleBarChart data={series} x="label" y="afstand" unit="m" /></ChartCard>}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-semibold">Periodes vergelijken</h3>
          <Segmented value={cmp} onChange={setCmp} options={[{ value: "4w", label: "4 wk" }, { value: "3m", label: "3 mnd" }, { value: "6m", label: "6 mnd" }]} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { l: "Trainingen", a: a.length, b: b.length, u: "" },
            { l: "Gem. volume/training", a: Math.round(avg(a.map((h) => h.volume))), b: Math.round(avg(b.map((h) => h.volume))), u: " kg" },
            { l: "Beste gewicht", a: best(a.map((h) => h.best_weight)), b: best(b.map((h) => h.best_weight)), u: " kg" },
            { l: "Beste gesch. 1RM", a: best(a.map((h) => h.best_e1rm)), b: best(b.map((h) => h.best_e1rm)), u: " kg" },
          ].map((r) => (
            <div key={r.l} className="rounded-2xl bg-surface-2 p-3">
              <div className="text-xs text-muted">{r.l}</div>
              <div className="num text-2xl font-bold">{formatNumber(r.a, 1)}{r.u}</div>
              <div className="text-xs text-muted tabular">vorige periode {formatNumber(r.b, 1)}{r.u} {pctChange(r.a, r.b) != null && <Delta value={pctChange(r.a, r.b)} unit="%" />}</div>
            </div>
          ))}
        </div>
      </Card>

      {prs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Records voor deze oefening</h3>
          <div className="divide-y divide-line">
            {[...prs].sort((x, y) => y.achieved_at.localeCompare(x.achieved_at)).map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <Trophy className="size-4 text-accent-text" />
                <span className="flex-1">{PR_LABEL[p.type]}</span>
                <span className="text-muted">{formatDate(p.achieved_at, { day: "numeric", month: "short", year: "2-digit" })}</span>
                <span className="num text-lg font-bold w-24 text-right">{formatNumber(p.value, 1)} {PR_UNIT[p.type]}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <ExercisePicker open={picker} onOpenChange={setPicker} multi={false} title="Kies oefening" onPick={([x]) => setId(x)} />
    </div>
  );
}

// ───────────────────────── Lichaamsgewicht

function BodyWeight() {
  const entries = useLiveQuery(() => db().body_weight_entries.orderBy("date").toArray(), [], []);
  const [date, setDate] = useState(toYmd(new Date()));
  const [w, setW] = useState<number | null>(entries.length ? entries[entries.length - 1].weight_kg : null);
  const settings = useSettings();
  const series = entries.map((e) => ({ label: formatDate(e.date + "T12:00:00", { day: "numeric", month: "short" }), kg: e.weight_kg }));
  const first = entries[0]?.weight_kg;
  const last = entries[entries.length - 1]?.weight_kg;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Field label="Datum"><input type="date" className={inputCls} value={date} max={toYmd(new Date())} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Gewicht (kg)"><div className="h-12 rounded-2xl bg-surface-2"><NumField label="Lichaamsgewicht" value={w} onCommit={setW} className="h-12 text-xl font-bold" placeholder="80,0" min={0} max={400} /></div></Field>
          <Button variant="primary" size="lg" onClick={async () => { try { if (w == null) throw new Error("Vul je gewicht in"); await addBodyWeight({ date, weight_kg: w }); toast("Gewicht opgeslagen", "success"); } catch (e) { toast(errorMessage(e), "error"); } }}><Plus className="size-5" /></Button>
        </div>
        <p className="text-xs text-muted mt-2">Wordt ook gebruikt voor lichaamsgewicht- en assisted oefeningen als je dat aanzet in Instellingen{settings.include_bodyweight_volume ? " (staat aan)" : ""}.</p>
      </Card>
      {entries.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4"><div className="num text-2xl font-bold">{last?.toLocaleString("nl-NL")} kg</div><div className="text-xs text-muted">Huidig</div></Card>
            <Card className="p-4"><div className="num text-2xl font-bold">{first != null && last != null ? `${last - first > 0 ? "+" : ""}${(Math.round((last - first) * 10) / 10).toLocaleString("nl-NL")}` : "–"} kg</div><div className="text-xs text-muted">Sinds start</div></Card>
            <Card className="p-4"><div className="num text-2xl font-bold">{entries.length}</div><div className="text-xs text-muted">Metingen</div></Card>
          </div>
          <ChartCard title="Lichaamsgewicht" table={{ head: ["Datum", "kg"], rows: entries.map((e) => [e.date, e.weight_kg]) }}>
            <SimpleLineChart data={series} x="label" y="kg" unit="kg" domainPad={0.03} />
          </ChartCard>
          <Card className="divide-y divide-line">
            {[...entries].reverse().slice(0, 30).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <Scale className="size-4 text-muted" />
                <span className="flex-1 text-sm">{formatDate(e.date + "T12:00:00", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</span>
                <span className="num text-lg font-bold">{e.weight_kg.toLocaleString("nl-NL")} kg</span>
                <button aria-label="Meting verwijderen" onClick={() => deleteBodyWeight(e.id)} className="p-2 text-muted hover:text-danger"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </Card>
        </>
      ) : (
        <Card><EmptyState icon={<Scale className="size-7" />} title="Nog geen metingen" body="Houd je lichaamsgewicht bij om je trend te zien. Eén meting per dag; een nieuwe meting op dezelfde dag vervangt de vorige." /></Card>
      )}
    </div>
  );
}

// ───────────────────────── Records & badges

function Records({ bundles }: { bundles: Bundle[] }) {
  const prs = useLiveQuery(() => db().exercise_prs.toArray(), [], []);
  const achievements = useLiveQuery(() => db().user_achievements.toArray(), [], []);
  const settings = useSettings();
  const map = useExerciseMap();
  const have = new Map(achievements.map((a) => [a.id, a]));
  const sets = bundles.reduce((a, b) => a + b.sets.filter((s) => s.completed && s.set_type !== "warmup").length, 0);
  const streak = weekStreaks(bundles.map((b) => b.session.started_at), settings.weekly_workout_goal);
  const xp = totalXp({ sessions: bundles.length, volume_kg: 0, working_sets: sets, prs: prs.length, best_week_streak: 0, longest_session_sec: 0, early_sessions: 0 }, streak.weeksHit, achievements.reduce((s, a) => s + a.xp, 0));
  const lv = levelFromXp(xp);
  // huidige beste per oefening (laatste record per type)
  const current = new Map<string, Map<string, (typeof prs)[number]>>();
  for (const p of [...prs].sort((a, b) => a.achieved_at.localeCompare(b.achieved_at))) {
    const m = current.get(p.exercise_id) ?? new Map();
    m.set(p.type, p);
    current.set(p.exercise_id, m);
  }
  const nameOf = (id: string) => map.get(id)?.name ?? bundles.flatMap((b) => b.exercises).find((e) => e.exercise_id === id)?.exercise_name ?? id;
  const challenges = achievements.filter((a) => a.key.startsWith("challenge-"));
  return (
    <div className="space-y-6">
      <Card className="p-5 flex items-center gap-5">
        <div className="grid size-20 place-items-center rounded-3xl bg-accent text-accent-ink"><span className="num text-4xl font-bold">{lv.level}</span></div>
        <div className="flex-1">
          <div className="font-bold text-lg">Level {lv.level}</div>
          <div className="text-sm text-muted tabular">{formatNumber(xp)} XP totaal · {formatNumber(lv.next - lv.current)} XP tot level {lv.level + 1}</div>
          <Bar value={lv.progress} className="mt-2" />
        </div>
      </Card>

      <section id="badges">
        <SectionTitle>Badges · {achievements.filter((a) => !a.key.startsWith("challenge-")).length}/{ACHIEVEMENTS.length}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = have.get(a.key);
            return (
              <Card key={a.key} className={cx("p-4", !got && "opacity-55")}>
                <span className={cx("grid size-11 place-items-center rounded-2xl", got ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}>{got ? <Award className="size-5" /> : <Lock className="size-4" />}</span>
                <div className="font-semibold mt-3">{a.title}</div>
                <div className="text-xs text-muted">{a.description}</div>
                <div className="text-xs mt-1.5 tabular">{got ? <span className="text-accent-text font-semibold">{formatDate(got.achieved_at, { day: "numeric", month: "short", year: "numeric" })}</span> : <span className="text-muted">+{a.xp} XP</span>}</div>
              </Card>
            );
          })}
        </div>
        {challenges.length > 0 && <p className="text-sm text-muted mt-3">Maanduitdagingen voltooid: {challenges.length}</p>}
      </section>

      <section>
        <SectionTitle>Persoonlijke records</SectionTitle>
        {current.size === 0 ? (
          <Card><EmptyState icon={<Trophy className="size-7" />} title="Nog geen records" body="Een record ontstaat zodra je een eerdere prestatie verbetert. De eerste keer dat je een oefening doet is je nulmeting." /></Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {[...current.entries()].map(([exId, types]) => (
              <Card key={exId} className="p-4">
                <div className="font-semibold mb-2">{nameOf(exId)}</div>
                <div className="flex flex-wrap gap-1.5">
                  {[...types.values()].map((p) => <Pill key={p.id} tone="accent">{PR_LABEL[p.type]}: {formatNumber(p.value, 1)} {PR_UNIT[p.type]}</Pill>)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

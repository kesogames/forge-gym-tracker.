"use client";
import { Link } from "@/lib/nav";
import { Fragment, useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowRight, ArrowUp, Award, CalendarCheck, Clock, Dumbbell, Flame, GripVertical, Layers, LayoutGrid, Play, RotateCcw, Target, Trophy, Zap } from "lucide-react";
import { db } from "@/lib/db/db";
import { awardChallenge, updateSettings } from "@/lib/db/repo";
import { useActiveSession, useBundles, useLatestBodyweight, useNow, useSettings, useExerciseMap, type Bundle } from "@/lib/hooks";
import { PeriodFilter, filterRange, usePersistentFilter } from "@/components/PeriodFilter";
import { ChartCard, HBarList, SimpleBarChart, SimpleLineChart } from "@/components/charts";
import { Bar, Button, Card, cx, Delta, EmptyState, Pill, ProgressRing, SectionTitle, Segmented, Sheet } from "@/components/ui";
import { applyFilters, exerciseHistory, periodStats, sessionTotals, weeklySeries } from "@/lib/stats";
import { previousRange, startOfWeek, addDays, inRange, periodRange } from "@/lib/domain/periods";
import { formatClock, formatDate, formatDuration, totalMs } from "@/lib/domain/time";
import { formatKg, formatNumber } from "@/lib/domain/volume";
import { levelFromXp, monthlyChallenges, totalXp, weekStreaks, XP } from "@/lib/domain/gamification";
import { MUSCLES, MUSCLE_NAME } from "@/lib/data/muscles";
import { celebrate } from "@/components/Celebrate";
import { startDemo } from "@/lib/demo";
import { toast, errorMessage } from "@/components/toast";
import { ActivityCalendar, Insights, LifetimeStrip, MuscleBalance, RecentRecords, TopLifts } from "@/components/DashboardExtras";

// ───────────────────────── Dashboardblokken (volgorde en zichtbaarheid instelbaar)

interface WidgetDef {
  id: string;
  label: string;
  description: string;
  size: "full" | "half";
  /** Reageert op het periodefilter */
  period?: boolean;
}

export const WIDGETS: WidgetDef[] = [
  { id: "lifetime", label: "Totaal verplaatst", description: "Totaal tonnage, trainingen en uren", size: "full" },
  { id: "calendar", label: "Trainingskalender", description: "6 maanden aan trainingsdagen", size: "half" },
  { id: "insights", label: "Inzichten", description: "Automatische tips en trends", size: "half" },
  { id: "toplifts", label: "Belangrijkste lifts", description: "Geschatte 1RM met trendlijn", size: "full" },
  { id: "stats", label: "Statistieken", description: "Trainingen, sets, volume, tijd, records, level", size: "full", period: true },
  { id: "balance", label: "Spierbalans", description: "Spinnenweb en duwen/trekken", size: "half", period: true },
  { id: "records", label: "Recente records", description: "Je laatste persoonlijke records", size: "half" },
  { id: "chart-volume", label: "Volume per week", description: "Staafgrafiek trainingsvolume", size: "half", period: true },
  { id: "chart-strength", label: "Krachtprogressie", description: "1RM, gewicht of reps per oefening", size: "half", period: true },
  { id: "chart-duration", label: "Trainingstijd per sessie", description: "Hoe lang je traint", size: "half", period: true },
  { id: "chart-exvolume", label: "Volume per oefening", description: "Top 8 oefeningen", size: "half", period: true },
  { id: "chart-frequency", label: "Frequentie per spiergroep", description: "Hoe vaak je elke spier traint", size: "full", period: true },
  { id: "muscles", label: "Sets per spiergroep", description: "Werksets per spier, met telmethode", size: "full", period: true },
  { id: "challenges", label: "Maanduitdagingen", description: "Doelen voor deze maand", size: "full" },
  { id: "recent", label: "Recente trainingen", description: "Je laatste 6 trainingen", size: "full" },
];
const WIDGET_BY_ID = new Map(WIDGETS.map((w) => [w.id, w]));

/** Volgorde uit instellingen + nieuwe blokken achteraan; verborgen blokken eruit. */
export function resolveLayout(order: string[], hidden: string[]) {
  const known = order.filter((id) => WIDGET_BY_ID.has(id));
  const full = [...known, ...WIDGETS.map((w) => w.id).filter((id) => !known.includes(id))];
  const hid = new Set(hidden.filter((id) => WIDGET_BY_ID.has(id)));
  return { order: full, hidden: hid, visible: full.filter((id) => !hid.has(id)) };
}

function CustomizeSheet({ open, onOpenChange, order, hidden }: { open: boolean; onOpenChange: (o: boolean) => void; order: string[]; hidden: Set<string> }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const save = (o: string[], h: Set<string>) => void updateSettings({ dashboard_order: o, dashboard_hidden: [...h] });
  const move = (id: string, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    save(arrayMove(order, i, j), hidden);
  };
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Dashboard aanpassen"
      description="Kies wat je wilt zien en sleep of gebruik de pijltjes voor de volgorde."
      footer={
        <>
          <Button block onClick={() => save([], new Set())}><RotateCcw className="size-4" /> Standaard</Button>
          <Button block variant="primary" onClick={() => onOpenChange(false)}>Klaar</Button>
        </>
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e: DragEndEvent) => {
        if (!e.over || e.active.id === e.over.id) return;
        save(arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id))), hidden);
      }}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {order.map((id, i) => (
              <WidgetRow key={id} w={WIDGET_BY_ID.get(id)!} visible={!hidden.has(id)} first={i === 0} last={i === order.length - 1}
                onToggle={() => { const h = new Set(hidden); if (h.has(id)) h.delete(id); else h.add(id); save(order, h); }}
                onMove={(d) => move(id, d)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Sheet>
  );
}

function WidgetRow({ w, visible, first, last, onToggle, onMove }: { w: WidgetDef; visible: boolean; first: boolean; last: boolean; onToggle: () => void; onMove: (d: -1 | 1) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: w.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx("flex items-center gap-2 rounded-2xl border border-line bg-surface p-2", isDragging && "relative z-10 shadow-2xl", !visible && "opacity-60")} data-testid={`widget-row-${w.id}`}>
      <button {...attributes} {...listeners} aria-label={`${w.label} verslepen`} className="touch-none cursor-grab p-2 text-muted"><GripVertical className="size-5" /></button>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold truncate">{w.label}</div>
        <div className="text-xs text-muted truncate">{w.description}</div>
      </div>
      <div className="flex flex-col">
        <button aria-label={`${w.label} omhoog`} disabled={first} onClick={() => onMove(-1)} className="p-1 text-muted disabled:opacity-30"><ArrowUp className="size-4" /></button>
        <button aria-label={`${w.label} omlaag`} disabled={last} onClick={() => onMove(1)} className="p-1 text-muted disabled:opacity-30"><ArrowDown className="size-4" /></button>
      </div>
      <button type="button" role="switch" aria-checked={visible} aria-label={`${w.label} tonen`} onClick={onToggle} className={cx("relative h-7 w-12 rounded-full transition shrink-0", visible ? "bg-accent" : "bg-surface-3")}>
        <span className={cx("absolute top-1 size-5 rounded-full transition-all shadow", visible ? "left-6 bg-accent-ink" : "left-1 bg-white")} />
      </button>
    </div>
  );
}

function greeting(h: number) {
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default function Dashboard() {
  const settings = useSettings();
  const bundles = useBundles();
  const active = useActiveSession();
  const bw = useLatestBodyweight();
  const [f, setF] = usePersistentFilter("forge-dash-filter");
  const ctx = useMemo(() => ({ bodyweight_kg: bw, include_bodyweight: settings.include_bodyweight_volume }), [bw, settings.include_bodyweight_volume]);
  const prs = useLiveQuery(() => db().exercise_prs.toArray(), [], []);
  const achievements = useLiveQuery(() => db().user_achievements.toArray(), [], []);
  const goalRows = useLiveQuery(() => db().muscle_group_goals.toArray(), [], []);
  const goals = useMemo(() => new Map(goalRows.map((g) => [g.muscle, g.sets_per_week])), [goalRows]);
  const exMap = useExerciseMap();
  const [customize, setCustomize] = useState(false);
  const layout = useMemo(() => resolveLayout(settings.dashboard_order, settings.dashboard_hidden), [settings.dashboard_order, settings.dashboard_hidden]);
  const now = new Date();

  const range = filterRange(f, now);
  const prev = previousRange(f.period, range, now);
  const cur = useMemo(() => (bundles ? applyFilters(bundles, { range, exerciseId: f.exerciseId, muscle: f.muscle, templateId: f.templateId }) : []), [bundles, range.start.getTime(), range.end.getTime(), f.exerciseId, f.muscle, f.templateId]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevB = useMemo(() => (bundles && prev ? applyFilters(bundles, { range: prev, exerciseId: f.exerciseId, muscle: f.muscle, templateId: f.templateId }) : []), [bundles, prev?.start.getTime(), f.exerciseId, f.muscle, f.templateId]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = useMemo(() => periodStats(cur, ctx, settings.set_count_method), [cur, ctx, settings.set_count_method]);
  const p = useMemo(() => periodStats(prevB, ctx, settings.set_count_method), [prevB, ctx, settings.set_count_method]);
  const curIds = new Set(cur.map((b) => b.session.id));
  const prevIds = new Set(prevB.map((b) => b.session.id));
  const prsCur = prs.filter((x) => curIds.has(x.session_id) && (!f.exerciseId || x.exercise_id === f.exerciseId)).length;
  const prsPrev = prs.filter((x) => prevIds.has(x.session_id) && (!f.exerciseId || x.exercise_id === f.exerciseId)).length;

  if (bundles === undefined) return null;
  const isNew = bundles.length === 0;

  return (
    <div className="space-y-6">
      <Hero bundles={bundles} active={!!active} name={settings.display_name} goal={settings.weekly_workout_goal} />

      {!isNew && (
        <div className="flex justify-end -mb-3">
          <button onClick={() => setCustomize(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink" data-testid="customize-dashboard">
            <LayoutGrid className="size-4" /> Aanpassen
          </button>
        </div>
      )}
      <CustomizeSheet open={customize} onOpenChange={setCustomize} order={layout.order} hidden={layout.hidden} />
      {isNew ? (
        <Card>
          <EmptyState
            icon={<Dumbbell className="size-7" />}
            title="Welkom bij Forge"
            body="Start je eerste training of maak eerst een schema. Na je eerste training verschijnen hier je statistieken, grafieken en records."
            action={
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/training" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 font-bold text-accent-ink"><Play className="size-4 fill-current" /> Start training</Link>
                <Link href="/schemas" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface-2 px-5 font-semibold">Schema maken</Link>
              </div>
            }
          />
          <div className="border-t border-line px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted">
            Benieuwd hoe je dashboard eruitziet met data?
            <button onClick={() => startDemo().catch((e) => toast(errorMessage(e), "error"))} className="font-semibold text-accent-text" data-testid="start-demo">Bekijk met voorbeelddata</button>
          </div>
        </Card>
      ) : (
        <div className="dash-grid grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-start">
          {layout.visible.map((id, i) => {
            const w = WIDGET_BY_ID.get(id)!;
            const firstPeriod = w.period && layout.visible.findIndex((x) => WIDGET_BY_ID.get(x)!.period) === i;
            const nameOf = (eid: string) => exMap.get(eid)?.name ?? bundles.flatMap((b) => b.exercises).find((e) => e.exercise_id === eid)?.exercise_name ?? eid;
            const node = (() => {
              switch (id) {
                case "lifetime": return <LifetimeStrip bundles={bundles} ctx={ctx} unit={settings.unit} />;
                case "calendar": return <ActivityCalendar bundles={bundles} />;
                case "insights": return <Insights all={bundles} ctx={ctx} goals={goals} unit={settings.unit} />;
                case "toplifts": return <TopLifts bundles={bundles} exMap={exMap} unit={settings.unit} />;
                case "stats": return (
                  <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Stat icon={CalendarCheck} label="Trainingen" value={formatNumber(s.sessions)} delta={prev ? s.sessions - p.sessions : null} />
                    <Stat icon={Layers} label="Werksets" value={formatNumber(s.working_sets)} delta={prev ? s.working_sets - p.working_sets : null} sub={`${formatNumber(s.reps)} herhalingen`} />
                    <Stat icon={Flame} label="Trainingsvolume" value={formatKg(s.volume_kg, settings.unit)} delta={prev ? Math.round(s.volume_kg - p.volume_kg) : null} deltaUnit=" kg" testId="stat-volume" />
                    <Stat icon={Clock} label="Trainingstijd" value={formatDuration(s.duration_sec)} delta={prev ? Math.round((s.duration_sec - p.duration_sec) / 60) : null} deltaUnit=" min" />
                    <Stat icon={Trophy} label="Persoonlijke records" value={formatNumber(prsCur)} delta={prev ? prsCur - prsPrev : null} />
                    <Stat icon={Target} label="Spiergroepen getraind" value={`${[...s.muscles.values()].filter((m) => m.primary > 0).length}`} sub={`van ${MUSCLES.length}`} />
                    <Consistency bundles={bundles} goal={settings.weekly_workout_goal} />
                    <XpCard bundles={bundles} prsCount={prs.length} achievementXp={achievements.reduce((a, x) => a + x.xp, 0)} goal={settings.weekly_workout_goal} />
                  </section>
                );
                case "balance": return <MuscleBalance muscles={s.muscles} />;
                case "records": return <RecentRecords prs={prs} exMap={exMap} unit={settings.unit} nameOf={nameOf} />;
                case "chart-volume": return <Charts only="volume" bundles={bundles} cur={cur} range={range} ctx={ctx} period={f.period} exerciseFilter={f.exerciseId} />;
                case "chart-strength": return <Charts only="strength" bundles={bundles} cur={cur} range={range} ctx={ctx} period={f.period} exerciseFilter={f.exerciseId} />;
                case "chart-duration": return <Charts only="duration" bundles={bundles} cur={cur} range={range} ctx={ctx} period={f.period} exerciseFilter={f.exerciseId} />;
                case "chart-exvolume": return <Charts only="exvolume" bundles={bundles} cur={cur} range={range} ctx={ctx} period={f.period} exerciseFilter={f.exerciseId} />;
                case "chart-frequency": return <Charts only="frequency" bundles={bundles} cur={cur} range={range} ctx={ctx} period={f.period} exerciseFilter={f.exerciseId} />;
                case "muscles": return <MuscleOverview stats={s} prevStats={prev ? p : null} />;
                case "challenges": return <Challenges bundles={bundles} goal={settings.weekly_workout_goal} done={new Set(achievements.map((a) => a.id))} />;
                case "recent": return <RecentWorkouts bundles={bundles} ctx={ctx} prs={prs} unit={settings.unit} />;
                default: return null;
              }
            })();
            return (
              <Fragment key={id}>
                {firstPeriod && (
                  <div className="lg:col-span-2 pt-2" data-testid="period-section">
                    <SectionTitle>Statistieken per periode</SectionTitle>
                    <PeriodFilter f={f} setF={setF} />
                  </div>
                )}
                <div className={cx("min-w-0", w.size === "full" && "lg:col-span-2")} data-widget={id}>{node}</div>
              </Fragment>
            );
          })}
          <div className="lg:col-span-2 flex justify-center pt-2">
            <Button variant="ghost" onClick={() => setCustomize(true)}><LayoutGrid className="size-4" /> Dashboard aanpassen</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Hero({ bundles, active, name, goal }: { bundles: Bundle[]; active: boolean; name: string; goal: number }) {
  const activeSession = useActiveSession();
  const now = useNow(1000, !!activeSession);
  const d = new Date();
  const ws = startOfWeek(d);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const weekRange = { start: ws, end: addDays(ws, 7) };
  const thisWeek = bundles.filter((b) => inRange(b.session.started_at, weekRange));
  const trained = new Set(thisWeek.map((b) => new Date(b.session.started_at).toDateString()));
  const pct = Math.min(1, thisWeek.length / goal);
  return (
    <section className="pt-2">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">{d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-0.5">{greeting(d.getHours())}{name ? `, ${name}` : ""}</h1>
        </div>
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3">
        <Link href="/training" className="group relative overflow-hidden rounded-[28px] bg-accent text-accent-ink p-5 sm:p-6 flex flex-col justify-between min-h-[150px] transition active:scale-[0.99]" data-testid="hero-start">
          <div className="absolute -right-12 -bottom-16 size-56 rounded-full bg-accent-ink/[0.06]" />
          <div className="absolute right-6 top-6 size-14 rounded-2xl bg-accent-ink text-accent grid place-items-center transition group-hover:scale-105">
            {active ? <ArrowRight className="size-6" /> : <Play className="size-6 fill-current ml-0.5" />}
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">{active ? "Training bezig" : "Klaar om te trainen?"}</div>
          <div>
            {active && activeSession ? (
              <>
                <div className="num text-5xl font-bold leading-none tabular">{formatClock(totalMs(activeSession, now))}</div>
                <div className="text-lg font-bold mt-1">Hervat {activeSession.name}</div>
              </>
            ) : (
              <div className="text-3xl font-bold tracking-tight">Start training</div>
            )}
          </div>
        </Link>
        <Card className="p-5 flex items-center gap-5">
          <ProgressRing value={pct} size={88} stroke={8}>
            <div className="text-center leading-none">
              <div className="num text-2xl font-bold">{thisWeek.length}<span className="text-muted text-base">/{goal}</span></div>
            </div>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Weekdoel</div>
            <div className="text-sm text-muted">{thisWeek.length >= goal ? "Gehaald. Sterk bezig!" : `Nog ${goal - thisWeek.length} ${goal - thisWeek.length === 1 ? "training" : "trainingen"} deze week`}</div>
            <div className="flex gap-1.5 mt-3">
              {days.map((day) => {
                const isToday = day.toDateString() === d.toDateString();
                const done = trained.has(day.toDateString());
                return (
                  <div key={day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                    <div className={cx("h-8 w-full max-w-8 rounded-lg grid place-items-center transition", done ? "bg-accent text-accent-ink" : "bg-surface-2", isToday && !done && "ring-2 ring-line-strong")}>
                      {done && <Flame className="size-3.5" />}
                    </div>
                    <span className={cx("text-[10px] font-semibold uppercase", isToday ? "text-ink" : "text-muted")}>{day.toLocaleDateString("nl-NL", { weekday: "narrow" })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, delta, deltaUnit = "", sub, testId }: { icon: typeof Clock; label: string; value: string; delta?: number | null; deltaUnit?: string; sub?: string; testId?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-muted" />
        {delta !== undefined && <Delta value={delta} unit={deltaUnit} />}
      </div>
      <div className="num text-[30px] font-bold leading-tight mt-2 tabular truncate" data-testid={testId}>{value}</div>
      <div className="text-xs text-muted">{label}{sub && <> · {sub}</>}</div>
    </Card>
  );
}

function Consistency({ bundles, goal }: { bundles: Bundle[]; goal: number }) {
  const st = weekStreaks(bundles.map((b) => b.session.started_at), goal);
  // laatste 8 weken: weken waarin het doel gehaald is
  const ws = startOfWeek(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws, -7 * (7 - i)));
  const per = weeks.map((w) => bundles.filter((b) => inRange(b.session.started_at, { start: w, end: addDays(w, 7) })).length);
  const hit = per.slice(0, 7).filter((n) => n >= goal).length;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Flame className="size-4 text-muted" />
        <span className="text-xs font-semibold text-muted">{hit}/7 wk</span>
      </div>
      <div className="num text-[30px] font-bold leading-tight mt-2">{st.current} {st.current === 1 ? "week" : "weken"}</div>
      <div className="flex gap-1 mt-1.5" aria-label="Weekdoel laatste 8 weken">
        {per.map((n, i) => <div key={i} title={`${n} trainingen`} className={cx("h-1.5 flex-1 rounded-full", n >= goal ? "bg-accent" : n > 0 ? "bg-accent/35" : "bg-surface-3")} />)}
      </div>
      <div className="text-xs text-muted mt-1">Consistentie · weekdoel op rij</div>
    </Card>
  );
}

function XpCard({ bundles, prsCount, achievementXp, goal }: { bundles: Bundle[]; prsCount: number; achievementXp: number; goal: number }) {
  const sets = bundles.reduce((a, b) => a + b.sets.filter((s) => s.completed && s.set_type !== "warmup").length, 0);
  const streak = weekStreaks(bundles.map((b) => b.session.started_at), goal);
  const xp = totalXp({ sessions: bundles.length, volume_kg: 0, working_sets: sets, prs: prsCount, best_week_streak: 0, longest_session_sec: 0, early_sessions: 0 }, streak.weeksHit, achievementXp);
  const lv = levelFromXp(xp);
  return (
    <Link href="/progressie#badges" className="block">
      <Card className="p-4 h-full">
        <div className="flex items-center justify-between">
          <Zap className="size-4 text-accent-text" />
          <span className="text-xs font-semibold text-muted tabular">{formatNumber(xp)} XP</span>
        </div>
        <div className="num text-[30px] font-bold leading-tight mt-2">Level {lv.level}</div>
        <Bar value={lv.progress} className="mt-1.5 h-1.5" />
        <div className="text-xs text-muted mt-1 tabular">{formatNumber(lv.next - lv.current)} XP tot level {lv.level + 1}</div>
      </Card>
    </Link>
  );
}

type ChartId = "volume" | "strength" | "duration" | "exvolume" | "frequency";

function Charts({ bundles, cur, range, ctx, period, exerciseFilter, only }: { bundles: Bundle[]; cur: Bundle[]; range: { start: Date; end: Date }; ctx: { bodyweight_kg: number | null; include_bodyweight: boolean }; period: string; exerciseFilter: string | null; only: ChartId }) {
  const settings = useSettings();
  const map = useExerciseMap();
  const first = cur.length ? cur.reduce((a, b) => (a.session.started_at < b.session.started_at ? a : b)).session.started_at : null;
  const startDate = range.start.getTime() < 86400000 * 365 && first ? new Date(first) : range.start;
  const endDate = new Date(Math.min(range.end.getTime(), Date.now()));
  const weeks = Math.max(4, Math.min(52, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 86400000)) + 1));
  const weekly = weeklySeries(cur, ctx, weeks, endDate);
  const sessionsSorted = [...cur].sort((a, b) => a.session.started_at.localeCompare(b.session.started_at));
  const durations = sessionsSorted.map((b) => ({ label: formatDate(b.session.started_at, { day: "numeric", month: "short" }), minuten: Math.round((b.session.total_duration_sec ?? 0) / 60), name: b.session.name }));

  // volume per oefening
  const volByEx = new Map<string, { name: string; volume: number; sets: number }>();
  for (const b of cur) {
    const exById = new Map(b.exercises.map((e) => [e.id, e]));
    for (const st of b.sets) {
      const we = exById.get(st.workout_exercise_id);
      if (!we || !st.completed || st.set_type === "warmup") continue;
      const v = volByEx.get(we.exercise_id) ?? { name: we.exercise_name, volume: 0, sets: 0 };
      v.sets++;
      v.volume += sessionTotals({ session: b.session, exercises: [we], sets: [st] }, ctx).volume_kg;
      volByEx.set(we.exercise_id, v);
    }
  }
  const topEx = [...volByEx.entries()].sort((a, b) => b[1].volume - a[1].volume);
  const [exId, setExId] = useState<string | null>(null);
  const chosen = exerciseFilter ?? exId ?? topEx[0]?.[0] ?? null;
  const hist = chosen ? exerciseHistory(bundles.filter((b) => inRange(b.session.started_at, range)), chosen, ctx) : [];
  const [metric, setMetric] = useState<"e1rm" | "weight" | "reps">("e1rm");
  const series = hist.map((h) => ({ label: formatDate(h.date, { day: "numeric", month: "short" }), e1rm: h.best_e1rm, weight: h.best_weight, reps: h.best_reps, best: h.best_set }));
  const metricKey = metric === "e1rm" && series.every((x) => x.e1rm == null) ? "weight" : metric;

  const freq = MUSCLES.map((m) => ({ label: m.name, value: cur.filter((b) => b.exercises.some((e) => e.primary_muscle === m.id && b.sets.some((s) => s.workout_exercise_id === e.id && s.completed && s.set_type !== "warmup"))).length })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  void period;

  return (
    <>
      {only === "volume" && <ChartCard
        title="Trainingsvolume per week"
        subtitle={`${formatKg(weekly.reduce((a, w) => a + w.volume, 0), settings.unit)} in ${weekly.length} weken`}
        table={{ head: ["Week van", "Volume (kg)", "Sets", "Trainingen"], rows: weekly.map((w) => [w.label, w.volume, w.sets, w.sessions]) }}
        empty={!cur.length}
      >
        <SimpleBarChart data={weekly} x="label" y="volume" unit="kg" highlightLast labelFmt={(l) => `Week van ${l}`} />
      </ChartCard>}

      {only === "strength" && <ChartCard
        title="Krachtprogressie"
        subtitle={chosen ? map.get(chosen)?.name ?? hist[0]?.best_set : "Kies een oefening"}
        action={
          topEx.length > 0 && !exerciseFilter ? (
            <select aria-label="Oefening" value={chosen ?? ""} onChange={(e) => setExId(e.target.value)} className="h-8 max-w-36 rounded-xl bg-surface-2 px-2 text-xs font-semibold outline-none">
              {topEx.map(([id, v]) => <option key={id} value={id}>{v.name}</option>)}
            </select>
          ) : null
        }
        table={{ head: ["Datum", "Beste set", "Gesch. 1RM", "Max kg", "Max reps"], rows: series.map((x) => [x.label, x.best, x.e1rm ?? "–", x.weight ?? "–", x.reps ?? "–"]) }}
        empty={series.length === 0}
      >
        <Segmented value={metric} onChange={setMetric} className="mb-2 text-xs" options={[{ value: "e1rm", label: "Gesch. 1RM" }, { value: "weight", label: "Gewicht" }, { value: "reps", label: "Herhalingen" }]} />
        <SimpleLineChart data={series} x="label" y={metricKey} unit={metricKey === "reps" ? "reps" : "kg"} height={170} labelFmt={(l, p) => `${l} · beste set ${p.best}`} />
        {metricKey === "e1rm" && <p className="text-[11px] text-muted mt-1">Geschatte 1RM met de Epley-formule (sets tot 12 herhalingen). Dit is een schatting.</p>}
      </ChartCard>}

      {only === "duration" && <ChartCard title="Trainingstijd per sessie" subtitle={durations.length ? `gemiddeld ${Math.round(durations.reduce((a, d) => a + d.minuten, 0) / durations.length)} min` : undefined} table={{ head: ["Datum", "Training", "Minuten"], rows: durations.map((d) => [d.label, d.name, d.minuten]) }} empty={!durations.length}>
        <SimpleBarChart data={durations.slice(-24)} x="label" y="minuten" unit="min" labelFmt={(l, p) => `${l} · ${p.name}`} />
      </ChartCard>}

      {only === "exvolume" && <ChartCard title="Volume per oefening" subtitle="Top 8 in deze periode" table={{ head: ["Oefening", "Volume (kg)", "Sets"], rows: topEx.map(([, v]) => [v.name, Math.round(v.volume), v.sets]) }} empty={!topEx.length}>
        <HBarList rows={topEx.slice(0, 8).map(([, v]) => ({ label: v.name, value: Math.round(v.volume), sub: `${v.sets} sets` }))} unit="kg" />
      </ChartCard>}

      {only === "frequency" && <ChartCard title="Trainingsfrequentie per spiergroep" subtitle="Aantal trainingen met minstens één werkset (primair)" table={{ head: ["Spiergroep", "Trainingen"], rows: freq.map((r) => [r.label, r.value]) }} empty={!freq.length}>
        <div className="grid sm:grid-cols-2 gap-x-8">
          <HBarList rows={freq.slice(0, Math.ceil(freq.length / 2))} max={Math.max(1, ...freq.map((r) => r.value))} />
          <HBarList rows={freq.slice(Math.ceil(freq.length / 2))} max={Math.max(1, ...freq.map((r) => r.value))} />
        </div>
      </ChartCard>}
    </>
  );
}

function MuscleOverview({ stats, prevStats }: { stats: ReturnType<typeof periodStats>; prevStats: ReturnType<typeof periodStats> | null }) {
  const settings = useSettings();
  const rows = MUSCLES.map((m) => ({ m, v: stats.muscles.get(m.id), p: prevStats?.muscles.get(m.id) })).filter((r) => (r.v?.counted ?? 0) > 0 || (r.v?.secondary ?? 0) > 0).sort((a, b) => (b.v?.counted ?? 0) - (a.v?.counted ?? 0));
  return (
    <ChartCard
      title="Sets per spiergroep"
      subtitle={settings.set_count_method === "primary" ? "Telmethode: primair = 1 set (secundair apart)" : "Telmethode: gewogen (primair 1, secundair 0,5)"}
      action={<Link href="/progressie" className="text-sm font-semibold text-accent-text px-2">Details</Link>}
      table={{ head: ["Spiergroep", "Sets", "Secundair", "Vorige periode"], rows: rows.map((r) => [MUSCLE_NAME[r.m.id], r.v?.counted ?? 0, r.v?.secondary ?? 0, r.p?.counted ?? 0]) }}
      empty={!rows.length}
    >
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
        <HBarList rows={rows.slice(0, Math.ceil(rows.length / 2)).map((r) => ({ label: MUSCLE_NAME[r.m.id], value: r.v?.counted ?? 0, sub: r.v?.secondary ? `+${r.v.secondary} sec.` : undefined }))} max={Math.max(1, ...rows.map((r) => r.v?.counted ?? 0))} />
        <HBarList rows={rows.slice(Math.ceil(rows.length / 2)).map((r) => ({ label: MUSCLE_NAME[r.m.id], value: r.v?.counted ?? 0, sub: r.v?.secondary ? `+${r.v.secondary} sec.` : undefined }))} max={Math.max(1, ...rows.map((r) => r.v?.counted ?? 0))} />
      </div>
    </ChartCard>
  );
}

function Challenges({ bundles, goal, done }: { bundles: Bundle[]; goal: number; done: Set<string> }) {
  const now = new Date();
  const thisM = periodRange("this_month", now);
  const lastM = periodRange("last_month", now);
  const cm = bundles.filter((b) => inRange(b.session.started_at, thisM));
  const lm = bundles.filter((b) => inRange(b.session.started_at, lastM));
  const sets = (bs: Bundle[]) => bs.reduce((a, b) => a + b.sets.filter((s) => s.completed && s.set_type !== "warmup").length, 0);
  const ch = monthlyChallenges(now, goal, { sessions: cm.length, sets: sets(cm) }, sets(lm));
  useEffect(() => {
    for (const c of ch) {
      if (c.value >= c.target && !done.has(c.key)) {
        void awardChallenge(c.key);
        celebrate();
      }
    }
  }, [ch.map((c) => c.value).join(","), done.size]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section>
      <SectionTitle>Uitdagingen van {now.toLocaleDateString("nl-NL", { month: "long" })}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-3">
        {ch.map((c) => {
          const ok = c.value >= c.target;
          return (
            <Card key={c.key} className={cx("p-4", ok && "border-accent/50")}>
              <div className="flex items-center gap-3">
                <span className={cx("grid size-10 place-items-center rounded-2xl", ok ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}>{ok ? <Award className="size-5" /> : <Target className="size-5" />}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.title}</div>
                  <div className="text-sm text-muted tabular">{c.value} / {c.target} {c.unit}{ok && ` · +150 XP`}</div>
                </div>
              </div>
              <Bar value={c.value / c.target} className="mt-3" />
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-2">XP: training afgerond +{XP.session}, werkset +{XP.working_set}, record +{XP.pr}, weekdoel +{XP.week_goal}. Je verdient XP met consistentie, niet alleen met zwaarder tillen.</p>
    </section>
  );
}

function RecentWorkouts({ bundles, ctx, prs, unit }: { bundles: Bundle[]; ctx: { bodyweight_kg: number | null; include_bodyweight: boolean }; prs: { session_id: string }[]; unit: "kg" | "lb" }) {
  const recent = [...bundles].sort((a, b) => b.session.started_at.localeCompare(a.session.started_at)).slice(0, 6);
  return (
    <section>
      <SectionTitle action={<Link href="/historie" className="text-sm font-semibold text-accent-text">Alles bekijken</Link>}>Recente trainingen</SectionTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recent.map((b) => {
          const t = sessionTotals(b, ctx);
          const n = prs.filter((p) => p.session_id === b.session.id).length;
          return (
            <Link key={b.session.id} href={`/historie/detail?id=${b.session.id}`} data-testid="recent-workout">
              <Card className="p-4 h-full hover:border-line-strong transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{b.session.name}</div>
                    <div className="text-sm text-muted first-letter:uppercase">{formatDate(b.session.started_at, { weekday: "short", day: "numeric", month: "short" })}</div>
                  </div>
                  {n > 0 && <Pill tone="accent"><Trophy className="size-3" /> {n}</Pill>}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Mini label="Tijd" value={formatDuration(b.session.total_duration_sec)} />
                  <Mini label="Sets" value={String(t.working_sets)} />
                  <Mini label="Volume" value={formatKg(t.volume_kg, unit).replace(/ (kg|lb)$/, "")} unit={unit} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Mini({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="num text-xl font-bold tabular leading-tight">{value}{unit && <span className="text-xs text-muted font-sans ml-0.5">{unit}</span>}</div>
      <div className="text-[11px] text-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}

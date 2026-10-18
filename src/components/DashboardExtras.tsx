"use client";
import { Link } from "@/lib/nav";
import { useMemo } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDownRight, ArrowUpRight, Flame, Lightbulb, Trophy } from "lucide-react";
import { Card, cx, SectionTitle } from "./ui";
import { ExerciseImage } from "./ExerciseImage";
import { addDays, startOfDay, startOfWeek, toYmd } from "@/lib/domain/periods";
import { estimate1RM, formatKg, formatNumber, isWorkingSet } from "@/lib/domain/volume";
import { PR_LABEL, PR_UNIT } from "@/lib/domain/records";
import { formatDate } from "@/lib/domain/time";
import { MUSCLE_NAME } from "@/lib/data/muscles";
import { sessionTotals, type BundleLike } from "@/lib/stats";
import type { Exercise, ExercisePR, MuscleId } from "@/lib/types";

type Ctx = { bodyweight_kg: number | null; include_bodyweight: boolean };

// ───────────────────────── Totaal ooit

const EQUIVALENTS: [number, string, string][] = [
  [190_000, "blauwe vinvis", "blauwe vinvissen"],
  [6_000, "Afrikaanse olifant", "Afrikaanse olifanten"],
  [1_300, "auto", "auto's"],
  [500, "vleugelpiano", "vleugelpiano's"],
  [80, "persoon", "personen"],
];

export function LifetimeStrip({ bundles, ctx, unit }: { bundles: BundleLike[]; ctx: Ctx; unit: "kg" | "lb" }) {
  const t = useMemo(() => {
    let kg = 0, sets = 0, sec = 0;
    for (const b of bundles) {
      const s = sessionTotals(b, ctx);
      kg += s.volume_kg;
      sets += s.working_sets;
      sec += b.session.total_duration_sec ?? 0;
    }
    return { kg, sets, sec };
  }, [bundles, ctx]);
  const eq = EQUIVALENTS.find(([w]) => t.kg >= w * 2) ?? EQUIVALENTS[EQUIVALENTS.length - 1];
  const count = t.kg / eq[0];
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-10 size-40 rounded-full bg-accent-soft" aria-hidden />
      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
        <div className="col-span-2">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Totaal verplaatst</div>
          <div className="num text-5xl sm:text-6xl font-bold leading-none mt-1 tabular">{formatKg(Math.round(t.kg), unit)}</div>
          <div className="text-sm text-ink-2 mt-1.5">
            Dat is ongeveer <b className="text-accent-text">{formatNumber(count, count < 10 ? 1 : 0)} {count >= 1.5 || count < 1 ? eq[2] : eq[1]}</b>
          </div>
        </div>
        <div>
          <div className="num text-3xl font-bold tabular">{formatNumber(bundles.length)}</div>
          <div className="text-xs text-muted">trainingen</div>
        </div>
        <div>
          <div className="num text-3xl font-bold tabular">{formatNumber(Math.round(t.sec / 3600))}<span className="text-lg text-muted"> uur</span></div>
          <div className="text-xs text-muted">{formatNumber(t.sets)} werksets</div>
        </div>
      </div>
    </Card>
  );
}

// ───────────────────────── Trainingskalender

export function ActivityCalendar({ bundles, weeks = 26 }: { bundles: BundleLike[]; weeks?: number }) {
  const { cells, max, activeDays, streak } = useMemo(() => {
    const perDay = new Map<string, { sets: number; names: string[] }>();
    for (const b of bundles) {
      const k = toYmd(new Date(b.session.started_at));
      const v = perDay.get(k) ?? { sets: 0, names: [] };
      v.sets += b.sets.filter(isWorkingSet).length;
      v.names.push(b.session.name);
      perDay.set(k, v);
    }
    const start = addDays(startOfWeek(new Date()), -7 * (weeks - 1));
    const today = startOfDay(new Date());
    const cells: { date: Date; sets: number; names: string[]; future: boolean }[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i);
      const v = perDay.get(toYmd(d));
      cells.push({ date: d, sets: v?.sets ?? 0, names: v?.names ?? [], future: d > today });
    }
    // huidige reeks: opeenvolgende weken met minstens één training
    let streak = 0;
    for (let w = weeks - 1; w >= 0; w--) {
      const has = cells.slice(w * 7, w * 7 + 7).some((c) => c.names.length);
      if (has) streak++;
      else if (w !== weeks - 1) break;
    }
    return { cells, max: Math.max(1, ...cells.map((c) => c.sets)), activeDays: cells.filter((c) => c.names.length).length, streak };
  }, [bundles, weeks]);

  const level = (s: number) => (s === 0 ? 0 : s / max < 0.34 ? 1 : s / max < 0.67 ? 2 : 3);
  const months: { col: number; label: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    const d = cells[w * 7].date;
    if (d.getDate() <= 7) months.push({ col: w, label: d.toLocaleDateString("nl-NL", { month: "short" }) });
  }
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold tracking-tight">Trainingskalender</h3>
          <div className="text-sm text-muted">{activeDays} trainingsdagen in {Math.round(weeks / 4.35)} maanden</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-accent-soft text-accent-text px-3 h-8 text-sm font-bold">
          <Flame className="size-4" /> {streak} {streak === 1 ? "week" : "weken"} op rij
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
        <div className="inline-grid gap-[3px] min-w-full" style={{ gridTemplateColumns: `20px repeat(${weeks}, minmax(10px, 1fr))` }}>
          <div />
          {Array.from({ length: weeks }, (_, w) => (
            <div key={w} className="text-[10px] text-muted h-4 leading-4 whitespace-nowrap overflow-visible">{months.find((m) => m.col === w)?.label ?? ""}</div>
          ))}
          {Array.from({ length: 7 }, (_, row) => (
            <Row key={row} row={row} weeks={weeks} cells={cells} level={level} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-3 text-[11px] text-muted">
        Minder
        {[0, 1, 2, 3].map((l) => <span key={l} className={cx("size-3 rounded-[3px]", CELL[l])} />)}
        Meer werksets
      </div>
    </Card>
  );
}

const CELL = ["bg-surface-3", "bg-accent/35", "bg-accent/65", "bg-accent"];

function Row({ row, weeks, cells, level }: { row: number; weeks: number; cells: { date: Date; sets: number; names: string[]; future: boolean }[]; level: (s: number) => number }) {
  return (
    <>
      <div className="text-[10px] text-muted leading-none self-center">{row % 2 === 0 ? ["ma", "", "wo", "", "vr", "", "zo"][row] : ""}</div>
      {Array.from({ length: weeks }, (_, w) => {
        const c = cells[w * 7 + row];
        return (
          <div
            key={w}
            title={c.future ? "" : `${c.date.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}: ${c.names.length ? `${c.names.join(", ")} · ${c.sets} werksets` : "geen training"}`}
            className={cx("aspect-square rounded-[3px]", c.future ? "bg-transparent" : CELL[level(c.sets)], c.names.length && c.sets === 0 && "bg-accent/35")}
          />
        );
      })}
    </>
  );
}

// ───────────────────────── Sterkste lifts

export function TopLifts({ bundles, exMap, unit }: { bundles: BundleLike[]; exMap: Map<string, Exercise>; unit: "kg" | "lb" }) {
  const lifts = useMemo(() => {
    const per = new Map<string, { name: string; image: string | null; points: { t: number; v: number }[] }>();
    for (const b of [...bundles].sort((x, y) => x.session.started_at.localeCompare(y.session.started_at))) {
      const t = new Date(b.session.started_at).getTime();
      const best = new Map<string, number>();
      const exById = new Map(b.exercises.map((e) => [e.id, e]));
      for (const s of b.sets) {
        const we = exById.get(s.workout_exercise_id);
        if (!we || we.metric_type !== "weight_reps" || !isWorkingSet(s)) continue;
        const e1 = estimate1RM(s.weight_kg, s.reps);
        if (e1 && e1 > (best.get(we.exercise_id) ?? 0)) best.set(we.exercise_id, e1);
      }
      for (const [id, v] of best) {
        const we = b.exercises.find((e) => e.exercise_id === id)!;
        const p = per.get(id) ?? { name: we.exercise_name, image: we.exercise_image, points: [] };
        p.points.push({ t, v });
        per.set(id, p);
      }
    }
    const cutoff = Date.now() - 28 * 86400_000;
    return [...per.entries()]
      .filter(([, p]) => p.points.length >= 2)
      .map(([id, p]) => {
        const best = Math.max(...p.points.map((x) => x.v));
        const before = p.points.filter((x) => x.t < cutoff);
        const ref = before.length ? Math.max(...before.map((x) => x.v)) : p.points[0].v;
        return { id, ...p, best, change: ref ? ((best - ref) / ref) * 100 : 0, sessions: p.points.length };
      })
      .sort((a, b) => b.sessions * b.best - a.sessions * a.best)
      .slice(0, 4);
  }, [bundles]);
  if (!lifts.length) return null;
  return (
    <section>
      <SectionTitle action={<Link href="/progressie" className="text-sm font-semibold text-accent-text">Alle oefeningen</Link>}>Je belangrijkste lifts</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {lifts.map((l) => (
          <Link key={l.id} href={`/progressie?oefening=${l.id}`}>
            <Card className="p-4 h-full hover:border-line-strong transition">
              <div className="flex items-center gap-2.5">
                <ExerciseImage image={exMap.get(l.id)?.image ?? l.image} name={l.name} className="size-10 rounded-xl" />
                <div className="text-sm font-semibold leading-tight line-clamp-2">{l.name}</div>
              </div>
              <div className="flex items-end justify-between gap-2 mt-3">
                <div>
                  <div className="num text-3xl font-bold leading-none tabular">{formatKg(l.best, unit)}</div>
                  <div className="text-[11px] text-muted mt-1">gesch. 1RM</div>
                </div>
                <span className={cx("inline-flex items-center text-xs font-bold tabular", l.change > 0 ? "text-accent-text" : "text-muted")}>
                  {l.change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {Math.abs(l.change).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%
                </span>
              </div>
              <Sparkline points={l.points.map((p) => p.v)} className="mt-3" />
              <div className="text-[11px] text-muted mt-1">t.o.v. 4 weken geleden · {l.sessions}×</div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const pts = points.slice(-16);
  const w = 120, h = 32, pad = 3;
  const min = Math.min(...pts), max = Math.max(...pts);
  const x = (i: number) => pad + (i / Math.max(1, pts.length - 1)) * (w - pad * 2);
  const y = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2));
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${d} L${x(pts.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cx("w-full h-8", className)} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill="var(--chart-1)" fillOpacity={0.14} />
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r={3} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  );
}

// ───────────────────────── Recente records

export function RecentRecords({ prs, exMap, nameOf, unit }: { prs: ExercisePR[]; exMap: Map<string, Exercise>; nameOf: (id: string) => string; unit: "kg" | "lb" }) {
  const recent = [...prs].sort((a, b) => b.achieved_at.localeCompare(a.achieved_at)).slice(0, 5);
  return (
    <Card className="p-4 sm:p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold tracking-tight">Recente records</h3>
        <Link href="/progressie#badges" className="text-sm font-semibold text-accent-text">Alles</Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">Nog geen records. Verbeter een eerdere prestatie en hij verschijnt hier.</p>
      ) : (
        <div className="space-y-2.5">
          {recent.map((p) => {
            const kg = PR_UNIT[p.type] === "kg";
            const diff = p.previous_value != null ? p.value - p.previous_value : null;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="relative">
                  <ExerciseImage image={exMap.get(p.exercise_id)?.image ?? null} name={nameOf(p.exercise_id)} className="size-11 rounded-xl" />
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-accent-ink"><Trophy className="size-3" /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{nameOf(p.exercise_id)}</div>
                  <div className="text-xs text-muted truncate">{PR_LABEL[p.type]} · {formatDate(p.achieved_at, { day: "numeric", month: "short" })}</div>
                </div>
                <div className="text-right">
                  <div className="num text-lg font-bold tabular">{kg ? formatKg(p.value, unit) : `${formatNumber(p.value, 1)} ${PR_UNIT[p.type]}`}</div>
                  {diff != null && <div className="text-[11px] font-semibold text-accent-text tabular">+{formatNumber(diff, 1)} {kg ? unit : PR_UNIT[p.type]}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ───────────────────────── Spierbalans

const AXES: { label: string; muscles: MuscleId[] }[] = [
  { label: "Borst", muscles: ["chest"] },
  { label: "Rug", muscles: ["back", "traps"] },
  { label: "Schouders", muscles: ["shoulders"] },
  { label: "Armen", muscles: ["biceps", "triceps", "forearms"] },
  { label: "Core", muscles: ["abs", "lower_back"] },
  { label: "Achterkant been", muscles: ["hamstrings", "glutes"] },
  { label: "Voorkant been", muscles: ["quads", "calves", "adductors", "abductors"] },
];
const PUSH: MuscleId[] = ["chest", "shoulders", "triceps"];
const PULL: MuscleId[] = ["back", "biceps", "traps"];

export function MuscleBalance({ muscles }: { muscles: Map<MuscleId, { counted: number }> }) {
  const data = AXES.map((a) => ({ axis: a.label, sets: Math.round(a.muscles.reduce((s, m) => s + (muscles.get(m)?.counted ?? 0), 0) * 10) / 10 }));
  const push = PUSH.reduce((s, m) => s + (muscles.get(m)?.counted ?? 0), 0);
  const pull = PULL.reduce((s, m) => s + (muscles.get(m)?.counted ?? 0), 0);
  const total = data.reduce((s, d) => s + d.sets, 0);
  const ratio = pull ? push / pull : null;
  return (
    <Card className="p-4 sm:p-5 h-full">
      <h3 className="font-semibold tracking-tight">Spierbalans</h3>
      <div className="text-sm text-muted">Werksets per gebied in deze periode</div>
      {total === 0 ? (
        <div className="h-[220px] grid place-items-center text-sm text-muted">Nog geen gegevens in deze periode.</div>
      ) : (
        <>
          <div className="h-[230px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke="var(--grid)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Tooltip content={({ active, payload }) => (active && payload?.length ? <div className="rounded-xl bg-surface border border-line-strong px-3 py-2 text-sm shadow-xl"><div className="text-xs text-muted">{payload[0].payload.axis}</div><div className="num text-lg font-bold">{payload[0].value} sets</div></div> : null)} />
                <Radar dataKey="sets" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.22} strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full overflow-hidden flex bg-surface-3">
              <div className="bg-[var(--chart-a)]" style={{ width: `${(push / Math.max(1, push + pull)) * 100}%` }} />
              <div className="bg-[var(--chart-b)] ml-0.5" style={{ width: `${(pull / Math.max(1, push + pull)) * 100}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-xs mt-1.5 tabular">
            <span><span className="inline-block size-2 rounded-full bg-[var(--chart-a)] mr-1" />Duwen {formatNumber(push, 1)}</span>
            <span className="text-muted">{ratio ? `verhouding ${ratio.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} : 1` : ""}</span>
            <span><span className="inline-block size-2 rounded-full bg-[var(--chart-b)] mr-1" />Trekken {formatNumber(pull, 1)}</span>
          </div>
        </>
      )}
    </Card>
  );
}

// ───────────────────────── Inzichten

export function Insights({ all, ctx, goals, unit }: { all: BundleLike[]; ctx: Ctx; goals: Map<MuscleId, number>; unit: "kg" | "lb" }) {
  const items = useMemo(() => {
    const out: { tone: "good" | "info" | "warn"; text: React.ReactNode }[] = [];
    if (all.length < 2) return out;
    const now = Date.now();
    const day = 86400_000;
    const inLast = (b: BundleLike, from: number, to: number) => {
      const t = new Date(b.session.started_at).getTime();
      return t >= now - from * day && t < now - to * day;
    };
    const vol = (bs: BundleLike[]) => bs.reduce((s, b) => s + sessionTotals(b, ctx).volume_kg, 0);
    const a = all.filter((b) => inLast(b, 28, 0));
    const p = all.filter((b) => inLast(b, 56, 28));
    if (a.length && p.length) {
      const ch = ((vol(a) - vol(p)) / Math.max(1, vol(p))) * 100;
      if (Math.abs(ch) >= 5) out.push({ tone: ch > 0 ? "good" : "info", text: <>Je trainingsvolume is de afgelopen 4 weken <b>{ch > 0 ? "gestegen" : "gedaald"} met {Math.abs(Math.round(ch))}%</b> ({formatKg(Math.round(vol(a)), unit)}).</> });
      if (a.length !== p.length) out.push({ tone: a.length > p.length ? "good" : "info", text: <>Je trainde <b>{a.length}×</b> in de laatste 4 weken, tegen {p.length}× de 4 weken daarvoor.</> });
    }
    // favoriete trainingsdag
    const dow = new Array(7).fill(0);
    for (const b of all) dow[(new Date(b.session.started_at).getDay() + 6) % 7]++;
    const best = dow.indexOf(Math.max(...dow));
    if (all.length >= 6) out.push({ tone: "info", text: <>Je vaste trainingsdag is <b>{["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"][best]}</b> ({Math.round((dow[best] / all.length) * 100)}% van je trainingen).</> });
    // verwaarloosde spieren met een doel
    const lastTrained = new Map<MuscleId, number>();
    for (const b of all) for (const e of b.exercises) {
      if (!b.sets.some((s) => s.workout_exercise_id === e.id && isWorkingSet(s))) continue;
      const t = new Date(b.session.started_at).getTime();
      if (t > (lastTrained.get(e.primary_muscle) ?? 0)) lastTrained.set(e.primary_muscle, t);
    }
    const neglected = [...goals.keys()].filter((m) => now - (lastTrained.get(m) ?? 0) > 10 * day);
    if (neglected.length) out.push({ tone: "warn", text: <><b>{neglected.slice(0, 3).map((m) => MUSCLE_NAME[m]).join(", ")}</b> {neglected.length === 1 ? "heeft" : "hebben"} al meer dan 10 dagen geen directe sets gehad, terwijl je er een doel voor hebt.</> });
    // gemiddelde trainingsduur
    const avg = (bs: BundleLike[]) => bs.reduce((s, b) => s + (b.session.total_duration_sec ?? 0), 0) / Math.max(1, bs.length) / 60;
    if (a.length >= 2) out.push({ tone: "info", text: <>Een training duurt gemiddeld <b>{Math.round(avg(a))} minuten</b>{p.length >= 2 ? `, vorige periode ${Math.round(avg(p))} minuten` : ""}.</> });
    return out.slice(0, 4);
  }, [all, ctx, goals, unit]);
  if (!items.length) return null;
  return (
    <Card className="p-4 sm:p-5 h-full">
      <h3 className="font-semibold tracking-tight flex items-center gap-2"><Lightbulb className="size-4 text-accent-text" /> Inzichten</h3>
      <ul className="mt-3 space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-snug text-ink-2">
            <span className={cx("mt-1.5 size-2 rounded-full shrink-0", it.tone === "good" ? "bg-accent" : it.tone === "warn" ? "bg-warn" : "bg-info")} />
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

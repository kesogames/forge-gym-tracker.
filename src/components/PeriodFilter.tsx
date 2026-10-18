"use client";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { PERIOD_LABEL, periodRange, toYmd, addDays, type PeriodKey, type Range } from "@/lib/domain/periods";
import { MUSCLES } from "@/lib/data/muscles";
import { db } from "@/lib/db/db";
import { useAllExercises } from "@/lib/hooks";
import type { MuscleId } from "@/lib/types";
import { Chip, cx, inputCls } from "./ui";

export interface DashFilter {
  period: PeriodKey;
  from: string;
  to: string;
  exerciseId: string | null;
  muscle: MuscleId | null;
  templateId: string | null;
}

export const defaultDashFilter = (): DashFilter => ({ period: "this_week", from: toYmd(addDays(new Date(), -30)), to: toYmd(new Date()), exerciseId: null, muscle: null, templateId: null });

export function filterRange(f: DashFilter, now = new Date()): Range {
  return periodRange(f.period, now, { from: f.from, to: f.to });
}

/** Onthoudt de laatst gekozen filter per scherm (alleen dit apparaat). */
export function usePersistentFilter(key: string, defaults: Partial<DashFilter> = {}): [DashFilter, (f: DashFilter) => void] {
  const [f, setF] = useState<DashFilter>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...defaultDashFilter(), ...defaults, ...JSON.parse(raw) };
    } catch {}
    return { ...defaultDashFilter(), ...defaults };
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(f));
    } catch {}
  }, [key, f]);
  return [f, setF];
}

const PERIODS: PeriodKey[] = ["today", "this_week", "last_week", "this_month", "last_month", "last_3_months", "last_6_months", "this_year", "all", "custom"];

export function PeriodFilter({ f, setF, extra = true }: { f: DashFilter; setF: (f: DashFilter) => void; extra?: boolean }) {
  const [more, setMore] = useState(Boolean(f.exerciseId || f.muscle || f.templateId));
  const exercises = useAllExercises();
  const usedIds = useLiveQuery(async () => new Set((await db().workout_exercises.toArray()).map((w) => w.exercise_id)), [], new Set<string>());
  const templates = useLiveQuery(() => db().templates.toArray(), [], []);
  const activeExtra = [f.exerciseId, f.muscle, f.templateId].filter(Boolean).length;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {PERIODS.map((p) => (
          <Chip key={p} active={f.period === p} onClick={() => setF({ ...f, period: p })} data-testid={`period-${p}`}>
            {PERIOD_LABEL[p]}
          </Chip>
        ))}
        {extra && (
          <Chip active={more || activeExtra > 0} onClick={() => setMore(!more)} aria-label="Meer filters">
            <SlidersHorizontal className="size-3.5 inline -mt-0.5" />
            {activeExtra > 0 && <span className="ml-1">{activeExtra}</span>}
          </Chip>
        )}
      </div>
      {f.period === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" aria-label="Vanaf" className={cx(inputCls, "h-10 text-sm")} value={f.from} max={f.to} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <span className="text-muted">t/m</span>
          <input type="date" aria-label="Tot en met" className={cx(inputCls, "h-10 text-sm")} value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </div>
      )}
      {extra && more && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 animate-rise">
          <select aria-label="Filter op oefening" className={cx(inputCls, "h-10 text-sm px-3")} value={f.exerciseId ?? ""} onChange={(e) => setF({ ...f, exerciseId: e.target.value || null })}>
            <option value="">Alle oefeningen</option>
            {exercises.filter((e) => usedIds.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select aria-label="Filter op spiergroep" className={cx(inputCls, "h-10 text-sm px-3")} value={f.muscle ?? ""} onChange={(e) => setF({ ...f, muscle: (e.target.value || null) as MuscleId | null })}>
            <option value="">Alle spiergroepen</option>
            {MUSCLES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select aria-label="Filter op schema" className={cx(inputCls, "h-10 text-sm px-3")} value={f.templateId ?? ""} onChange={(e) => setF({ ...f, templateId: e.target.value || null })}>
            <option value="">Alle schema&apos;s</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {activeExtra > 0 && (
            <button onClick={() => setF({ ...f, exerciseId: null, muscle: null, templateId: null })} className="text-sm font-semibold text-muted inline-flex items-center gap-1 sm:col-span-3">
              <X className="size-4" /> Filters wissen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

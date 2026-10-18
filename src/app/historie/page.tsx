"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, History, Trophy } from "lucide-react";
import { db } from "@/lib/db/db";
import { useBundles, useLatestBodyweight, useSettings } from "@/lib/hooks";
import { PeriodFilter, filterRange, usePersistentFilter } from "@/components/PeriodFilter";
import { Card, Chip, cx, EmptyState, Pill } from "@/components/ui";
import { applyFilters, sessionMuscles, sessionTotals } from "@/lib/stats";
import { formatDuration, formatTimeOfDay } from "@/lib/domain/time";
import { formatKg } from "@/lib/domain/volume";
import { MUSCLE_NAME } from "@/lib/data/muscles";

type Status = "all" | "completed" | "aborted";
type Dur = "all" | "short" | "mid" | "long";
type Vol = "all" | "lt5" | "5to10" | "gt10";

const DUR: Record<Dur, [string, (s: number) => boolean]> = {
  all: ["Elke duur", () => true],
  short: ["< 45 min", (s) => s < 45 * 60],
  mid: ["45–75 min", (s) => s >= 45 * 60 && s <= 75 * 60],
  long: ["> 75 min", (s) => s > 75 * 60],
};
const VOL: Record<Vol, [string, (v: number) => boolean]> = {
  all: ["Elk volume", () => true],
  lt5: ["< 5.000 kg", (v) => v < 5000],
  "5to10": ["5.000–10.000 kg", (v) => v >= 5000 && v <= 10000],
  gt10: ["> 10.000 kg", (v) => v > 10000],
};

export default function HistoryPage() {
  const bundles = useBundles(true);
  const settings = useSettings();
  const bw = useLatestBodyweight();
  const ctx = useMemo(() => ({ bodyweight_kg: bw, include_bodyweight: settings.include_bodyweight_volume }), [bw, settings.include_bodyweight_volume]);
  const [f, setF] = usePersistentFilter("forge-history-filter", { period: "all" });
  const [status, setStatus] = useState<Status>("all");
  const [dur, setDur] = useState<Dur>("all");
  const [vol, setVol] = useState<Vol>("all");
  const prs = useLiveQuery(() => db().exercise_prs.toArray(), [], []);

  const range = filterRange(f);
  const list = useMemo(() => {
    if (!bundles) return [];
    return applyFilters(bundles, { range, exerciseId: f.exerciseId, muscle: f.muscle, templateId: f.templateId })
      .filter((b) => status === "all" || b.session.status === status)
      .map((b) => ({ b, t: sessionTotals(b, ctx) }))
      .filter(({ b, t }) => DUR[dur][1](b.session.total_duration_sec ?? 0) && VOL[vol][1](t.volume_kg))
      .sort((a, b) => b.b.session.started_at.localeCompare(a.b.session.started_at));
  }, [bundles, range.start.getTime(), range.end.getTime(), f.exerciseId, f.muscle, f.templateId, status, dur, vol, ctx]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = new Map<string, typeof list>();
  for (const x of list) {
    const k = new Date(x.b.session.started_at).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    groups.set(k, [...(groups.get(k) ?? []), x]);
  }

  if (!bundles) return null;
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight">Historie</h1>
        <p className="text-muted mt-1">{bundles.length} trainingen opgeslagen</p>
      </header>
      <PeriodFilter f={f} setF={setF} />
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {(["all", "completed", "aborted"] as Status[]).map((s) => <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{{ all: "Alle", completed: "Voltooid", aborted: "Afgebroken" }[s]}</Chip>)}
        <select aria-label="Trainingsduur" value={dur} onChange={(e) => setDur(e.target.value as Dur)} className="h-9 rounded-full bg-surface border border-line px-3 text-sm font-medium text-ink-2">
          {Object.entries(DUR).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select aria-label="Trainingsvolume" value={vol} onChange={(e) => setVol(e.target.value as Vol)} className="h-9 rounded-full bg-surface border border-line px-3 text-sm font-medium text-ink-2">
          {Object.entries(VOL).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {list.length === 0 && (
        <Card>
          <EmptyState icon={<History className="size-7" />} title={bundles.length ? "Geen trainingen gevonden" : "Nog geen trainingen"} body={bundles.length ? "Pas de filters aan om meer trainingen te zien." : "Afgeronde trainingen verschijnen hier, met alle sets, tijden en notities."} />
        </Card>
      )}

      {[...groups.entries()].map(([month, items]) => (
        <section key={month}>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted mb-2 capitalize">{month} · {items.length}</h2>
          <Card className="divide-y divide-line overflow-hidden">
            {items.map(({ b, t }) => {
              const n = prs.filter((p) => p.session_id === b.session.id).length;
              const muscles = [...sessionMuscles(b, "primary").entries()].filter(([, v]) => v.primary > 0).sort((x, y) => y[1].primary - x[1].primary).slice(0, 3);
              const d = new Date(b.session.started_at);
              return (
                <Link key={b.session.id} href={`/historie/detail?id=${b.session.id}`} className="flex items-center gap-4 p-4 hover:bg-surface-2/50 transition" data-testid="history-item">
                  <div className="w-12 text-center shrink-0">
                    <div className="text-[11px] font-semibold uppercase text-muted">{d.toLocaleDateString("nl-NL", { weekday: "short" })}</div>
                    <div className="num text-3xl font-bold leading-none">{d.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate">{b.session.name}</span>
                      {b.session.status === "aborted" && <Pill tone="warn">Afgebroken</Pill>}
                      {n > 0 && <Pill tone="accent"><Trophy className="size-3" />{n}</Pill>}
                    </div>
                    <div className="text-sm text-muted tabular truncate">
                      {formatTimeOfDay(b.session.started_at)} · {formatDuration(b.session.total_duration_sec)} · {t.working_sets} sets · {formatKg(t.volume_kg, settings.unit)}
                    </div>
                    <div className={cx("text-xs text-muted truncate mt-0.5")}>{muscles.map(([m]) => MUSCLE_NAME[m]).join(" · ")}</div>
                  </div>
                  <ChevronRight className="size-5 text-muted shrink-0" />
                </Link>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}

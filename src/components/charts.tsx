"use client";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { Card, cx } from "./ui";

// Grafiekrichtlijnen: één serie per grafiek in de merkkleur, dunne marks, afgeronde
// bovenkant, rustig raster, tooltip bij hover/tik en altijd een tabelweergave.

export function ChartCard({ title, subtitle, children, table, action, className, empty }: { title: string; subtitle?: ReactNode; children: ReactNode; table?: { head: string[]; rows: (string | number)[][] }; action?: ReactNode; className?: string; empty?: boolean }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card className={cx("p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight">{title}</h3>
          {subtitle && <div className="text-sm text-muted mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-1">
          {action}
          {table && !empty && (
            <button onClick={() => setShowTable(!showTable)} aria-label={showTable ? "Toon grafiek" : "Toon tabel"} title={showTable ? "Grafiek" : "Tabel"} className="grid size-8 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink">
              {showTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
            </button>
          )}
        </div>
      </div>
      {empty ? (
        <div className="h-[180px] grid place-items-center text-sm text-muted text-center px-6">Nog geen gegevens in deze periode.</div>
      ) : showTable && table ? (
        <div className="max-h-[260px] overflow-auto text-sm">
          <table className="w-full tabular">
            <thead className="text-muted text-xs uppercase tracking-wide sticky top-0 bg-surface">
              <tr>{table.head.map((h, i) => <th key={h} className={cx("py-2 font-semibold", i ? "text-right" : "text-left")}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className={cx("py-2", j ? "text-right" : "text-left")}>{typeof c === "number" ? c.toLocaleString("nl-NL") : c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function TooltipBox({ active, payload, label, unit, labelFmt }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; unit?: string; labelFmt?: (l: string, p: Record<string, unknown>) => string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl bg-surface border border-line-strong px-3 py-2 shadow-xl text-sm">
      <div className="text-xs text-muted mb-0.5">{labelFmt ? labelFmt(String(label), p.payload) : label}</div>
      <div className="num text-lg font-bold">{Number(p.value).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}{unit ? ` ${unit}` : ""}</div>
    </div>
  );
}

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function SimpleBarChart<T extends Record<string, unknown>>({ data, x, y, unit, height = 200, highlightLast, goal, labelFmt }: { data: T[]; x: keyof T & string; y: keyof T & string; unit?: string; height?: number; highlightLast?: boolean; goal?: number; labelFmt?: (l: string, p: Record<string, unknown>) => string }) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey={x} {...axis} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...axis} width={44} tickFormatter={(v: number) => compact(v)} allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--surface-2)", radius: 6 }} content={<TooltipBox unit={unit} labelFmt={labelFmt} />} />
          {goal ? <ReferenceLine y={goal} stroke="var(--muted)" strokeDasharray="4 4" /> : null}
          <Bar dataKey={y} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={600}>
            {data.map((_, i) => <Cell key={i} fill="var(--chart-1)" fillOpacity={highlightLast && i !== data.length - 1 ? 0.45 : 1} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarList({ rows, unit, max, goalKey }: { rows: { label: string; value: number; goal?: number | null; sub?: string }[]; unit?: string; max?: number; goalKey?: boolean }) {
  const m = max ?? Math.max(1, ...rows.map((r) => Math.max(r.value, r.goal ?? 0)));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="group" title={`${r.label}: ${r.value.toLocaleString("nl-NL")}${unit ? " " + unit : ""}${r.goal ? ` van ${r.goal}` : ""}`}>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span className="font-medium truncate">{r.label}</span>
            <span className="tabular text-ink-2">
              <b className="text-ink">{r.value.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}</b>
              {r.goal ? <span className="text-muted"> / {r.goal}</span> : null}
              {unit && <span className="text-muted"> {unit}</span>}
              {r.sub && <span className="text-muted text-xs ml-1.5">{r.sub}</span>}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-surface-3">
            <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--chart-1)] transition-[width] duration-700" style={{ width: `${Math.min(100, (r.value / m) * 100)}%` }} />
            {goalKey && r.goal ? <div className="absolute -top-1 -bottom-1 w-0.5 bg-ink/60 rounded" style={{ left: `${Math.min(100, (r.goal / m) * 100)}%` }} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SimpleLineChart<T extends Record<string, unknown>>({ data, x, y, unit, height = 200, labelFmt, domainPad = 0.1 }: { data: T[]; x: keyof T & string; y: keyof T & string; unit?: string; height?: number; labelFmt?: (l: string, p: Record<string, unknown>) => string; domainPad?: number }) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey={x} {...axis} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...axis} width={44} tickFormatter={(v: number) => compact(v)} domain={[(min: number) => Math.max(0, Math.floor(min * (1 - domainPad))), (max: number) => Math.ceil(max * (1 + domainPad / 2))]} />
          <Tooltip cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} content={<TooltipBox unit={unit} labelFmt={labelFmt} />} />
          <Line type="monotone" dataKey={y} stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3.5, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2 }} connectNulls isAnimationActive animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 10_000) return `${Math.round(v / 1000)}k`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}k`;
  return v.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

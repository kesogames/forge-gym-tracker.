import type { Interval, RestTimerState, WorkoutSession } from "@/lib/types";

// Alle tijden worden berekend uit opgeslagen tijdstempels (ISO 8601, UTC) en de
// huidige klok. Er wordt nooit een teller opgehoogd; daardoor blijft de timer
// correct na vergrendelen, achtergrond, refresh of herstart.

const ms = (iso: string) => new Date(iso).getTime();

export function intervalMs(iv: Interval, now: number): number {
  const end = iv.end ? ms(iv.end) : now;
  return Math.max(0, end - ms(iv.start));
}

export function sumIntervalsMs(ivs: Interval[], now: number): number {
  return ivs.reduce((acc, iv) => acc + intervalMs(iv, now), 0);
}

type TimedSession = Pick<WorkoutSession, "started_at" | "ended_at" | "pauses" | "rest_periods">;

/** Totale sessieduur: start tot eind (of nu als nog actief). */
export function totalMs(s: TimedSession, now: number = Date.now()): number {
  const end = s.ended_at ? ms(s.ended_at) : now;
  return Math.max(0, end - ms(s.started_at));
}

export function pausedMs(s: TimedSession, now: number = Date.now()): number {
  const end = s.ended_at ? ms(s.ended_at) : now;
  return sumIntervalsMs(s.pauses, end);
}

/** Actieve trainingstijd: totale duur minus gepauzeerde periodes. */
export function activeMs(s: TimedSession, now: number = Date.now()): number {
  return Math.max(0, totalMs(s, now) - pausedMs(s, now));
}

export function restMs(s: TimedSession, now: number = Date.now()): number {
  const end = s.ended_at ? ms(s.ended_at) : now;
  return sumIntervalsMs(s.rest_periods, end);
}

export function isPaused(s: Pick<WorkoutSession, "pauses">): boolean {
  const last = s.pauses[s.pauses.length - 1];
  return !!last && last.end === null;
}

export function closeOpenIntervals(ivs: Interval[], endIso: string): Interval[] {
  return ivs.map((iv) => (iv.end ? iv : { ...iv, end: endIso }));
}

/** Resterende rusttijd in ms. */
export function restRemainingMs(t: RestTimerState, now: number = Date.now()): number {
  if (t.ends_at === null) return Math.max(0, (t.paused_remaining ?? 0) * 1000);
  return Math.max(0, ms(t.ends_at) - now);
}

export function formatClock(totalMilliseconds: number, alwaysHours = true): string {
  const totalSec = Math.floor(totalMilliseconds / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!alwaysHours && h === 0) return `${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Korte duur, bijv. "1u 12m" of "42m". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}u ${String(m).padStart(2, "0")}m`;
}

export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }): string {
  return new Date(iso).toLocaleDateString("nl-NL", opts);
}

export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

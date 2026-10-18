// Periodefilters. Weken beginnen op maandag (NL/BE). Alle grenzen in lokale tijd.

export type PeriodKey =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "all"
  | "custom";

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: "Vandaag",
  this_week: "Deze week",
  last_week: "Vorige week",
  this_month: "Deze maand",
  last_month: "Vorige maand",
  last_3_months: "3 maanden",
  last_6_months: "6 maanden",
  this_year: "Dit jaar",
  all: "Alle tijd",
  custom: "Eigen bereik",
};

export interface Range {
  start: Date; // inclusief
  end: Date; // exclusief
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // ma=0
  return addDays(s, -dow);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function periodRange(key: PeriodKey, now: Date = new Date(), custom?: { from: string; to: string }): Range {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (key) {
    case "today":
      return { start: today, end: tomorrow };
    case "this_week":
      return { start: startOfWeek(now), end: addDays(startOfWeek(now), 7) };
    case "last_week":
      return { start: addDays(startOfWeek(now), -7), end: startOfWeek(now) };
    case "this_month":
      return { start: startOfMonth(now), end: addMonths(now, 1) };
    case "last_month":
      return { start: addMonths(now, -1), end: startOfMonth(now) };
    case "last_3_months":
      return { start: addDays(today, -91), end: tomorrow };
    case "last_6_months":
      return { start: addDays(today, -182), end: tomorrow };
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
    case "custom": {
      if (custom?.from && custom?.to) {
        const [a, b] = [custom.from, custom.to].sort();
        return { start: parseLocalDate(a), end: addDays(parseLocalDate(b), 1) };
      }
      return { start: new Date(0), end: tomorrow };
    }
    case "all":
    default:
      return { start: new Date(0), end: new Date(8.64e15) };
  }
}

/** De direct voorafgaande periode van gelijke lengte (voor vergelijkingen). */
export function previousRange(key: PeriodKey, r: Range, now: Date = new Date()): Range | null {
  switch (key) {
    case "this_week":
    case "last_week":
      return { start: addDays(r.start, -7), end: r.start };
    case "this_month":
    case "last_month":
      return { start: addMonths(r.start, -1), end: r.start };
    case "this_year":
      return { start: new Date(r.start.getFullYear() - 1, 0, 1), end: r.start };
    case "all":
      return null;
    default: {
      const len = r.end.getTime() - r.start.getTime();
      void now;
      return { start: new Date(r.start.getTime() - len), end: r.start };
    }
  }
}

export function inRange(iso: string, r: Range): boolean {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
}

export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function weekKey(d: Date): string {
  return toYmd(startOfWeek(d));
}

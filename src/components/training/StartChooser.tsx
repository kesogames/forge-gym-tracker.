"use client";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ChevronRight, ClipboardList, Play, Plus, Repeat, Star } from "lucide-react";
import { db } from "@/lib/db/db";
import { getTemplateFull, startSession, type StartSource, type TemplateFull } from "@/lib/db/repo";
import { formatDate, formatDuration } from "@/lib/domain/time";
import { Button, Card, cx, EmptyState, Pill, SectionTitle } from "../ui";
import { toast, errorMessage } from "../toast";
import { unlockAudio } from "./RestTimer";

/** Bepaalt per schema welke dag 'volgende' is: de dag na de laatst uitgevoerde. */
async function loadTemplatesWithNext(): Promise<(TemplateFull & { nextDayId: string | null; lastAt: string | null })[]> {
  const templates = (await db().templates.toArray()).filter((t) => !t.archived);
  const sessions = (await db().workout_sessions.where("status").equals("completed").toArray()).sort((a, b) => b.started_at.localeCompare(a.started_at));
  const out = [];
  for (const t of templates) {
    const full = await getTemplateFull(t.id);
    if (!full) continue;
    const last = sessions.find((s) => s.template_id === t.id);
    const idx = last ? full.days.findIndex((d) => d.id === last.template_day_id) : -1;
    const next = full.days.length ? full.days[(idx + 1) % full.days.length] : null;
    out.push({ ...full, nextDayId: next?.id ?? null, lastAt: last?.started_at ?? null });
  }
  return out.sort((a, b) => Number(b.template.favorite) - Number(a.template.favorite) || (b.lastAt ?? "").localeCompare(a.lastAt ?? "") || a.template.name.localeCompare(b.template.name));
}

export function StartChooser() {
  const templates = useLiveQuery(loadTemplatesWithNext, []);
  const recent = useLiveQuery(async () => (await db().workout_sessions.where("status").equals("completed").reverse().sortBy("started_at")).slice(0, 5), []);
  const [busy, setBusy] = useState(false);

  const start = async (src: StartSource) => {
    if (busy) return;
    unlockAudio();
    setBusy(true);
    try {
      await startSession(src);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight">Training starten</h1>
        <p className="text-muted mt-1">Kies je schema. De timer start direct en alles wordt automatisch opgeslagen.</p>
      </header>

      {templates && templates.length > 0 && (
        <section>
          <SectionTitle action={<Link href="/schemas" className="text-sm font-semibold text-accent-text">Beheren</Link>}>Uit schema</SectionTitle>
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.template.id} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-lg tracking-tight truncate">{t.template.name}</h3>
                  {t.template.favorite && <Star className="size-4 fill-accent-text text-accent-text shrink-0" />}
                  {t.lastAt && <span className="ml-auto text-xs text-muted whitespace-nowrap">laatst {formatDate(t.lastAt)}</span>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {t.days.map((d) => {
                    const isNext = d.id === t.nextDayId && t.days.length > 1;
                    return (
                      <button
                        key={d.id}
                        disabled={busy}
                        onClick={() => start({ kind: "template", templateId: t.template.id, dayId: d.id })}
                        data-testid="start-day"
                        className={cx(
                          "group flex items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.99]",
                          isNext ? "bg-accent text-accent-ink" : "bg-surface-2 hover:bg-surface-3",
                        )}
                      >
                        <span className={cx("grid size-10 place-items-center rounded-xl shrink-0", isNext ? "bg-accent-ink/10" : "bg-surface")}>
                          <Play className="size-4 fill-current ml-0.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold truncate">{d.name}</span>
                          <span className={cx("block text-xs truncate", isNext ? "opacity-70" : "text-muted")}>
                            {d.exercises.length} oefeningen · {d.exercises.reduce((a, e) => a + e.sets, 0)} sets
                          </span>
                        </span>
                        {isNext && <Pill className="bg-accent-ink/10 text-accent-ink">Volgende</Pill>}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {templates && templates.length === 0 && (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-7" />}
            title="Nog geen schema"
            body="Maak een schema of kies een voorbeeld (Push/Pull/Legs, Upper/Lower, Full Body). Je kunt ook direct een lege training starten."
            action={<Link href="/schemas"><Button variant="secondary">Schema maken</Button></Link>}
          />
        </Card>
      )}

      <section>
        <SectionTitle>Of</SectionTitle>
        <Button size="xl" variant="primary" block disabled={busy} onClick={() => start({ kind: "empty" })} data-testid="start-empty">
          <Plus className="size-5" /> Lege training starten
        </Button>
      </section>

      {recent && recent.length > 0 && (
        <section>
          <SectionTitle>Vorige training herhalen</SectionTitle>
          <Card className="divide-y divide-line">
            {recent.map((s) => (
              <button key={s.id} disabled={busy} onClick={() => start({ kind: "repeat", sessionId: s.id })} className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2/50 first:rounded-t-3xl last:rounded-b-3xl">
                <Repeat className="size-5 text-muted shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{s.name}</span>
                  <span className="block text-xs text-muted">{formatDate(s.started_at, { weekday: "short", day: "numeric", month: "short" })} · {formatDuration(s.total_duration_sec)}</span>
                </span>
                <ChevronRight className="size-5 text-muted" />
              </button>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

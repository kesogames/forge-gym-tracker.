"use client";
import { useRouter, useSearchParams } from "@/lib/nav";
import { Suspense, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Clock, NotebookPen, Pencil, Repeat, Trash2, Trophy } from "lucide-react";
import { deleteSession, editSessionTimes, recomputeRecords, startSession, updateSessionMeta, updateSet, volumeContext, setSetCompleted } from "@/lib/db/repo";
import { useActiveSession, useSessionDetail, useSettings } from "@/lib/hooks";
import { formatClock, formatDate, formatTimeOfDay } from "@/lib/domain/time";
import { formatKg, formatNumber, setVolume } from "@/lib/domain/volume";
import { PR_LABEL, PR_UNIT } from "@/lib/domain/records";
import { MUSCLE_NAME } from "@/lib/data/muscles";
import { sessionMuscles, sessionTotals } from "@/lib/stats";
import { Button, Card, Confirm, cx, Field, IconButton, inputCls, NumField, Pill, SectionTitle, Sheet } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { formatSetShort } from "@/components/training/ExerciseCard";
import { toast, errorMessage } from "@/components/toast";

export default function Page() {
  return (
    <Suspense>
      <Detail />
    </Suspense>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Detail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const detail = useSessionDetail(id);
  const settings = useSettings();
  const active = useActiveSession();
  const ctx = useLiveQuery(volumeContext, []);
  const [editing, setEditing] = useState(false);
  const [del, setDel] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (detail?.session.status === "active") router.replace("/training");
  }, [detail, router]);

  if (detail === undefined || !ctx) return null;
  if (detail === null) return <p className="text-muted py-20 text-center">Training niet gevonden.</p>;
  const { session, exercises, setsByExercise, prs } = detail;
  const bundle = { session, exercises, sets: [...setsByExercise.values()].flat() };
  const t = sessionTotals(bundle, ctx);
  const muscles = [...sessionMuscles(bundle, settings.set_count_method).entries()].filter(([, v]) => v.primary > 0 || v.secondary > 0).sort((a, b) => b[1].counted - a[1].counted);
  const prBySet = new Map(prs.map((p) => [p.set_id, p]));

  const repeat = async () => {
    if (active) {
      toast("Rond eerst je actieve training af", "error");
      return router.push("/training");
    }
    await startSession({ kind: "repeat", sessionId: session.id });
    router.push("/training");
  };

  const finishEdit = async () => {
    setEditing(false);
    await recomputeRecords(null);
    toast("Wijzigingen opgeslagen. Records zijn bijgewerkt.", "success");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2 pt-1">
        <IconButton label="Terug" onClick={() => router.back()}><ArrowLeft className="size-5" /></IconButton>
        <div className="flex-1" />
        {editing ? (
          <Button variant="primary" onClick={finishEdit}><Check className="size-4" /> Klaar</Button>
        ) : (
          <>
            <IconButton label="Bewerken" variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" /></IconButton>
            <IconButton label="Verwijderen" variant="secondary" onClick={() => setDel(true)}><Trash2 className="size-4" /></IconButton>
          </>
        )}
      </div>

      <header>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
          {session.status === "aborted" && <Pill tone="warn">Afgebroken</Pill>}
        </div>
        <p className="text-muted mt-1 first-letter:uppercase">{formatDate(session.started_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </header>

      <Card className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Big label="Totale trainingstijd" value={formatClock((session.total_duration_sec ?? 0) * 1000)} />
          <Big label="Actieve trainingstijd" value={formatClock((session.active_duration_sec ?? session.total_duration_sec ?? 0) * 1000)} />
          <Big label="Werksets" value={String(t.working_sets)} sub={`${t.reps} herhalingen`} />
          <Big label="Volume" value={formatKg(t.volume_kg, settings.unit)} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-4 border-t border-line text-sm text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {formatTimeOfDay(session.started_at)} – {session.ended_at ? formatTimeOfDay(session.ended_at) : "–"}</span>
          {session.pauses.length > 0 && <span>{session.pauses.length} {session.pauses.length === 1 ? "pauze" : "pauzes"}</span>}
          {(session.rest_duration_sec ?? 0) > 0 && <span>Rust {formatClock((session.rest_duration_sec ?? 0) * 1000, false)}</span>}
          {t.distance_m > 0 && <span>{formatNumber(t.distance_m)} m</span>}
          {t.duration_sec > 0 && <span>{formatClock(t.duration_sec * 1000, false)} tijdgebonden</span>}
          {editing && <button className="text-accent-text font-semibold" onClick={() => { setStart(toLocalInput(session.started_at)); setEnd(toLocalInput(session.ended_at ?? session.started_at)); setTimesOpen(true); }}>Tijden aanpassen</button>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" variant="primary" onClick={repeat}><Repeat className="size-4" /> Opnieuw uitvoeren</Button>
        <Button size="lg" variant="secondary" onClick={() => { setNotes(session.notes); setNotesOpen(true); }}><NotebookPen className="size-4" /> Notitie</Button>
      </div>

      {session.notes && <Card className="p-4 text-[15px] whitespace-pre-wrap text-ink-2">{session.notes}</Card>}

      {prs.length > 0 && (
        <section>
          <SectionTitle>Persoonlijke records</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {prs.map((p) => (
              <Pill key={p.id} tone="accent" className="h-8 px-3 text-sm">
                <Trophy className="size-3.5" /> {exercises.find((e) => e.exercise_id === p.exercise_id)?.exercise_name}: {PR_LABEL[p.type].toLowerCase()} {formatNumber(p.value, 1)} {PR_UNIT[p.type]}
              </Pill>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionTitle>Oefeningen · {exercises.length}</SectionTitle>
        {exercises.map((we) => {
          const sets = setsByExercise.get(we.id) ?? [];
          const vol = sets.reduce((a, s) => a + setVolume(s, we.metric_type, ctx), 0);
          let n = 0;
          return (
            <Card key={we.id} className="p-4">
              <div className="flex items-center gap-3">
                <ExerciseImage image={we.exercise_image} name={we.exercise_name} muscle={we.primary_muscle} className="size-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{we.exercise_name}</div>
                  <div className="text-sm text-muted">{MUSCLE_NAME[we.primary_muscle]}{vol > 0 && ` · ${formatKg(vol, settings.unit)}`}{we.unilateral && " · per kant"}</div>
                </div>
              </div>
              {we.notes && <p className="text-sm text-ink-2 mt-3 rounded-xl bg-surface-2 px-3 py-2">{we.notes}</p>}
              <div className="mt-3 divide-y divide-line">
                {sets.map((s) => {
                  const label = s.set_type === "warmup" ? "W" : `${++n}${s.set_type === "drop" ? "D" : s.set_type === "failure" ? "F" : ""}`;
                  const pr = prBySet.get(s.id);
                  return (
                    <div key={s.id} className={cx("flex items-center gap-3 py-2 text-[15px]", !s.completed && "opacity-50")}>
                      <span className={cx("num w-7 text-center font-bold", s.set_type === "warmup" ? "text-warn" : "text-muted")}>{label}</span>
                      {editing ? (
                        <div className="flex-1 flex gap-2">
                          {we.metrics.includes("weight") && <EditNum label="kg" value={s.weight_kg} onCommit={(v) => updateSet(s.id, { weight_kg: v })} />}
                          {we.metrics.includes("reps") && <EditNum label="reps" value={s.reps} decimal={false} onCommit={(v) => updateSet(s.id, { reps: v })} />}
                          {we.metrics.includes("distance") && <EditNum label="m" value={s.distance_m} onCommit={(v) => updateSet(s.id, { distance_m: v })} />}
                          {we.metrics.includes("time") && <EditNum label="sec" value={s.duration_sec} decimal={false} onCommit={(v) => updateSet(s.id, { duration_sec: v })} />}
                          <button aria-label={s.completed ? "Markeer als niet voltooid" : "Markeer als voltooid"} onClick={() => setSetCompleted(s.id, !s.completed).catch((e) => toast(errorMessage(e), "error"))} className={cx("size-10 rounded-xl grid place-items-center shrink-0", s.completed ? "bg-accent text-accent-ink" : "bg-surface-2")}>
                            <Check className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex-1 tabular font-semibold">{formatSetShort(s, we.metrics, settings.unit)}{we.metrics.includes("reps") && we.metrics.includes("weight") ? " reps" : ""}</span>
                      )}
                      {!editing && (s.rpe != null || s.rir != null) && <span className="text-xs text-muted tabular">{s.rpe != null && `RPE ${s.rpe}`}{s.rir != null && ` RIR ${s.rir}`}</span>}
                      {!editing && pr && <Pill tone="accent"><Trophy className="size-3" /> PR</Pill>}
                      {!editing && s.notes && <span className="text-xs text-muted truncate max-w-32" title={s.notes}>{s.notes}</span>}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </section>

      {muscles.length > 0 && (
        <section>
          <SectionTitle>Spiergroepen</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {muscles.map(([m, v]) => (
              <Pill key={m} tone={v.primary > 0 ? "accent" : "default"} className="h-8 px-3 text-sm">
                {MUSCLE_NAME[m]} · {v.primary > 0 ? `${v.primary} sets` : `${v.secondary} secundair`}
              </Pill>
            ))}
          </div>
        </section>
      )}

      <Confirm open={del} onOpenChange={setDel} title="Training verwijderen?" body="Deze training en alle sets worden definitief verwijderd. Records en statistieken worden opnieuw berekend." confirmLabel="Verwijderen" danger onConfirm={async () => { await deleteSession(session.id); router.replace("/historie"); }} />
      <Sheet open={notesOpen} onOpenChange={setNotesOpen} title="Notitie bij training" footer={<Button variant="primary" size="lg" block onClick={async () => { await updateSessionMeta(session.id, { notes }); setNotesOpen(false); }}>Opslaan</Button>}>
        <textarea className={cx(inputCls, "h-40 py-3 resize-none")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Sheet>
      <Sheet
        open={timesOpen}
        onOpenChange={setTimesOpen}
        title="Tijden aanpassen"
        description="Bijvoorbeeld als je vergat de training af te ronden."
        footer={
          <Button variant="primary" size="lg" block onClick={async () => {
            try {
              await editSessionTimes(session.id, new Date(start).toISOString(), new Date(end).toISOString());
              setTimesOpen(false);
            } catch (e) {
              toast(errorMessage(e), "error");
            }
          }}>Opslaan</Button>
        }
      >
        <div className="space-y-4">
          <Field label="Starttijd"><input type="datetime-local" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Eindtijd"><input type="datetime-local" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
      </Sheet>
      <div className="h-4" />
    </div>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="num text-[28px] font-bold leading-tight tabular">{value}</div>
      <div className="text-xs text-muted">{label}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

function EditNum({ label, value, onCommit, decimal = true }: { label: string; value: number | null; onCommit: (v: number | null) => void; decimal?: boolean }) {
  return (
    <div className="flex-1 h-10 rounded-xl bg-surface-2 flex items-center pr-2 min-w-0">
      <NumField label={label} value={value} decimal={decimal} onCommit={onCommit} className="h-10 text-lg font-semibold" />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

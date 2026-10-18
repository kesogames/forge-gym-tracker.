"use client";
import { useRouter } from "@/lib/nav";
import { useState } from "react";
import { Flag, NotebookPen, Pause, Play, Plus, Trash2, XCircle } from "lucide-react";
import { abortSession, addExerciseToSession, deleteSession, finishSession, pauseSession, resumeSession, updateSessionMeta } from "@/lib/db/repo";
import { activeMs, formatClock, formatTimeOfDay, isPaused, pausedMs, restMs, totalMs } from "@/lib/domain/time";
import { useNow, useSessionDetail } from "@/lib/hooks";
import type { WorkoutSession } from "@/lib/types";
import { Button, Confirm, cx, EmptyState, Field, inputCls, Sheet } from "../ui";
import { SaveIndicator } from "../SaveIndicator";
import { ExercisePicker } from "../ExercisePicker";
import { ExerciseCard } from "./ExerciseCard";
import { RestTimer } from "./RestTimer";
import { toast, errorMessage } from "../toast";

export function ActiveWorkout({ session }: { session: WorkoutSession }) {
  const detail = useSessionDetail(session.id);
  const router = useRouter();
  const now = useNow(1000);
  const [picker, setPicker] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(session.notes);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const paused = isPaused(session);

  const allSets = detail ? [...detail.setsByExercise.values()].flat() : [];
  const completed = allSets.filter((s) => s.completed);
  const incomplete = allSets.length - completed.length;

  const finish = async () => {
    setBusy(true);
    try {
      const r = await finishSession(session.id);
      router.replace(`/training/samenvatting?id=${r.sessionId}`);
    } catch (e) {
      toast(errorMessage(e), "error");
      setBusy(false);
    }
  };

  return (
    <div className={cx("max-w-3xl mx-auto", session.rest_timer && "pb-28")}>
      {/* Timer-header */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 pt-[calc(env(safe-area-inset-top)+4px)] lg:pt-0 pb-3 bg-bg/90 backdrop-blur-xl">
        <div className={cx("rounded-[28px] p-4 sm:p-5 border transition-colors", paused ? "bg-surface border-warn/40" : "bg-surface border-line shadow-card")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div data-testid="workout-status" className={cx("flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]", paused ? "text-warn" : "text-accent-text")}>
                <span className={cx("size-2 rounded-full", paused ? "bg-warn" : "bg-accent animate-pulse-dot")} />
                {paused ? "Gepauzeerd" : "Training bezig"}
              </div>
              <div className="num text-[56px] sm:text-[64px] font-bold leading-[0.95] mt-1 tabular" data-testid="workout-timer" aria-label="Trainingstijd">
                {formatClock(totalMs(session, now))}
              </div>
              <div className="text-sm text-muted mt-1">
                Gestart om {formatTimeOfDay(session.started_at)}
                {session.pauses.length > 0 && <> · actief <span className="tabular text-ink-2 font-semibold" data-testid="active-time">{formatClock(activeMs(session, now))}</span> · pauze {formatClock(pausedMs(session, now), false)}</>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button size="md" variant={paused ? "primary" : "secondary"} onClick={() => (paused ? resumeSession(session.id) : pauseSession(session.id))}>
                {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4" />}
                {paused ? "Hervat" : "Pauze"}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
            <div className="min-w-0">
              <div className="font-semibold truncate">{session.name}</div>
              <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
                <span className="tabular">{completed.filter((s) => s.set_type !== "warmup").length} werksets voltooid</span>
                {restMs(session, now) > 0 && <span className="tabular">· rust {formatClock(restMs(session, now), false)}</span>}
                <SaveIndicator />
              </div>
            </div>
            <Button variant="primary" onClick={() => setFinishOpen(true)} data-testid="finish-button">
              <Flag className="size-4" /> Afronden
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-1">
        {detail?.exercises.map((we, i) => (
          <ExerciseCard key={we.id} we={we} sets={detail.setsByExercise.get(we.id) ?? []} session={session} index={i} count={detail.exercises.length} />
        ))}
        {detail && detail.exercises.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line-strong">
            <EmptyState icon={<Plus className="size-7" />} title="Lege training" body="Voeg je eerste oefening toe. De timer loopt al." />
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
          <Button size="lg" variant="outline" onClick={() => setPicker(true)} data-testid="add-exercise">
            <Plus className="size-5" /> Oefening toevoegen
          </Button>
          <Button size="lg" variant="ghost" onClick={() => { setNotes(session.notes); setNotesOpen(true); }} aria-label="Trainingsnotitie">
            <NotebookPen className="size-5" />
          </Button>
        </div>
        {session.notes && <p className="text-sm text-muted px-2 whitespace-pre-wrap">{session.notes}</p>}
      </div>

      <RestTimer session={session} />

      <ExercisePicker
        open={picker}
        onOpenChange={setPicker}
        onPick={async (ids) => {
          for (const id of ids) await addExerciseToSession(session.id, id);
        }}
      />

      <Sheet open={notesOpen} onOpenChange={setNotesOpen} title="Notitie bij training" footer={<Button variant="primary" block size="lg" onClick={async () => { await updateSessionMeta(session.id, { notes }); setNotesOpen(false); }}>Opslaan</Button>}>
        <Field label="Naam">
          <input className={inputCls} defaultValue={session.name} onBlur={(e) => e.target.value.trim() && updateSessionMeta(session.id, { name: e.target.value.trim() })} />
        </Field>
        <div className="h-4" />
        <Field label="Notitie">
          <textarea className={cx(inputCls, "h-32 py-3 resize-none")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hoe ging het? Slaap, energie, bijzonderheden…" />
        </Field>
      </Sheet>

      <Confirm open={confirmDelete} onOpenChange={setConfirmDelete} title="Training verwijderen?" body="De training en alle sets worden definitief verwijderd. Dit kan niet ongedaan worden." confirmLabel="Verwijderen" danger onConfirm={async () => { await deleteSession(session.id); router.replace("/"); }} />

      <Sheet open={finishOpen} onOpenChange={setFinishOpen} title="Training afronden?" description={`${formatClock(totalMs(session, now))} totale trainingstijd`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="num text-3xl font-bold">{completed.filter((s) => s.set_type !== "warmup").length}</div>
              <div className="text-xs text-muted">werksets voltooid</div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="num text-3xl font-bold">{detail?.exercises.length ?? 0}</div>
              <div className="text-xs text-muted">oefeningen</div>
            </div>
          </div>
          {incomplete > 0 && (
            <p className="text-sm text-ink-2 rounded-2xl border border-line p-3">
              <b>{incomplete} {incomplete === 1 ? "set is" : "sets zijn"} niet afgevinkt</b> en {incomplete === 1 ? "wordt" : "worden"} niet opgeslagen. Vink ze eerst af als je ze wel hebt gedaan.
            </p>
          )}
          {completed.length === 0 && <p className="text-sm text-warn">Je hebt nog geen sets afgevinkt. Afronden slaat een lege training op.</p>}
          <Button variant="primary" size="xl" block onClick={finish} disabled={busy} data-testid="confirm-finish">
            <Flag className="size-5" /> Training afronden
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={async () => { await abortSession(session.id); toast("Training afgebroken en bewaard", "success"); router.replace("/"); }}>
              <XCircle className="size-4" /> Afbreken
            </Button>
            <Button variant="danger" onClick={() => { setFinishOpen(false); setConfirmDelete(true); }}>
              <Trash2 className="size-4" /> Verwijderen
            </Button>
          </div>
          <p className="text-xs text-muted">Afgebroken trainingen blijven in je historie maar tellen niet mee in statistieken.</p>
        </div>
      </Sheet>
    </div>
  );
}

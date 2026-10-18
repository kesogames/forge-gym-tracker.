"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, History, Link2, MoreVertical, NotebookPen, Plus, Repeat, Timer, Trash2, Trophy } from "lucide-react";
import { db } from "@/lib/db/db";
import {
  addSet,
  alternativesFor,
  deleteSet,
  getPreviousPerformance,
  moveWorkoutExercise,
  removeWorkoutExercise,
  replaceWorkoutExercise,
  setExerciseNote,
  setSetCompleted,
  updateSet,
  updateWorkoutExercise,
} from "@/lib/db/repo";
import { bestByType, liveSetPRs, PR_LABEL } from "@/lib/domain/records";
import { formatDate } from "@/lib/domain/time";
import { useAllExercises, useExerciseMap, useSettings } from "@/lib/hooks";
import { MUSCLE_NAME } from "@/lib/data/muscles";
import type { Metric, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/lib/types";
import { Button, Confirm, cx, Field, IconButton, inputCls, NumField, Pill, Sheet, Stepper } from "../ui";
import { ExerciseImage } from "../ExerciseImage";
import { ExerciseRow } from "../ExercisePicker";
import { toast, errorMessage } from "../toast";
import { celebrate } from "../Celebrate";
import { unlockAudio } from "./RestTimer";

const SET_TYPE_LABEL: Record<WorkoutSet["set_type"], string> = { warmup: "Warming-up", normal: "Werkset", drop: "Dropset", failure: "Tot falen" };
const SET_TYPE_SHORT: Record<WorkoutSet["set_type"], string> = { warmup: "W", normal: "", drop: "D", failure: "F" };

export function formatSetShort(s: Pick<WorkoutSet, "weight_kg" | "reps" | "duration_sec" | "distance_m">, metrics: Metric[], unit: "kg" | "lb" = "kg"): string {
  const parts: string[] = [];
  const w = s.weight_kg != null ? (unit === "lb" ? Math.round(s.weight_kg * 2.20462 * 10) / 10 : s.weight_kg) : null;
  if (metrics.includes("weight") && w != null && w > 0) parts.push(`${w.toLocaleString("nl-NL")} ${unit}`);
  if (metrics.includes("reps") && s.reps != null) parts.push(`${s.reps}`);
  if (metrics.includes("distance") && s.distance_m != null) parts.push(`${s.distance_m.toLocaleString("nl-NL")} m`);
  if (metrics.includes("time") && s.duration_sec != null) parts.push(`${s.duration_sec} s`);
  if (metrics.includes("weight") && metrics.includes("reps")) return parts.join(" × ") || "–";
  return parts.join(" · ") || "–";
}

/** Invoerkolommen per oefeningstype. */
function inputColumns(we: WorkoutExercise): { key: "weight_kg" | "reps" | "duration_sec" | "distance_m"; label: string; decimal: boolean }[] {
  const cols: { key: "weight_kg" | "reps" | "duration_sec" | "distance_m"; label: string; decimal: boolean }[] = [];
  const wLabel = we.metric_type === "assisted" ? "Hulp kg" : we.metric_type === "bodyweight_reps" ? "+kg" : "kg";
  if (we.metrics.includes("weight")) cols.push({ key: "weight_kg", label: wLabel, decimal: true });
  if (we.metrics.includes("distance")) cols.push({ key: "distance_m", label: "Meter", decimal: true });
  if (we.metrics.includes("reps")) cols.push({ key: "reps", label: "Reps", decimal: false });
  if (we.metrics.includes("time")) cols.push({ key: "duration_sec", label: "Sec", decimal: false });
  return cols;
}

export function ExerciseCard({ we, sets, session, index, count }: { we: WorkoutExercise; sets: WorkoutSet[]; session: WorkoutSession; index: number; count: number }) {
  const settings = useSettings();
  const unit = settings.unit;
  const [menu, setMenu] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [setSheet, setSetSheet] = useState<WorkoutSet | null>(null);
  const [restOpen, setRestOpen] = useState(false);
  const [prSets, setPrSets] = useState<Record<string, string[]>>({});

  const prev = useLiveQuery(() => getPreviousPerformance(we.exercise_id, session.started_at, session.id), [we.exercise_id, session.started_at, session.id]);
  const exNote = useLiveQuery(() => db().exercise_notes.get(we.exercise_id), [we.exercise_id]);
  // Beste prestaties uit eerdere trainingen, voor live PR-detectie
  const historic = useLiveQuery(async () => {
    const wes = (await db().workout_exercises.where("exercise_id").equals(we.exercise_id).toArray()).filter((x) => x.session_id !== session.id);
    const ss = await db().workout_sessions.bulkGet([...new Set(wes.map((w) => w.session_id))]);
    const done = new Set(ss.filter((s) => s && s.status === "completed" && s.started_at < session.started_at).map((s) => s!.id));
    const valid = wes.filter((w) => done.has(w.session_id)).map((w) => w.id);
    const hs = await db().workout_sets.where("workout_exercise_id").anyOf(valid).toArray();
    return bestByType(we, hs);
  }, [we.exercise_id, session.id]);

  const cols = inputColumns(we);
  const prevWork = prev?.sets.filter((s) => s.set_type !== "warmup") ?? [];
  const prevWarm = prev?.sets.filter((s) => s.set_type === "warmup") ?? [];
  const doneCount = sets.filter((s) => s.completed && s.set_type !== "warmup").length;
  const workIdx = useMemo(() => {
    const m = new Map<string, number>();
    let w = 0;
    let wu = 0;
    for (const s of sets) m.set(s.id, s.set_type === "warmup" ? wu++ : w++);
    return m;
  }, [sets]);

  const rangeText = we.rep_min || we.rep_max ? (we.rep_min && we.rep_max && we.rep_min !== we.rep_max ? `${we.rep_min}–${we.rep_max}` : `${we.rep_max ?? we.rep_min}`) : null;

  const complete = async (s: WorkoutSet, value: boolean) => {
    unlockAudio();
    try {
      const r = await setSetCompleted(s.id, value);
      if (value && r.changed) {
        navigator.vibrate?.(12);
        if (historic) {
          const prs = liveSetPRs(we, { ...s, completed: true }, historic);
          if (prs.length) {
            setPrSets((p) => ({ ...p, [s.id]: prs }));
            toast(`Nieuw record: ${PR_LABEL[prs[0]].toLowerCase()} op ${we.exercise_name}`, "pr", 3200);
            celebrate();
          }
        }
      }
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <article className="rounded-3xl bg-surface border border-line shadow-card overflow-hidden" data-testid="exercise-card">
      {we.superset_group && (
        <div className="flex items-center gap-1.5 px-4 pt-3 text-xs font-bold uppercase tracking-wider text-info">
          <Link2 className="size-3.5" /> Superset {we.superset_group}
        </div>
      )}
      <header className="flex items-center gap-3 p-3 pb-2">
        <ExerciseImage image={we.exercise_image} name={we.exercise_name} muscle={we.primary_muscle} className="size-14 rounded-2xl" animate />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[17px] leading-tight tracking-tight">{we.exercise_name}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[13px] text-muted">
            <span>{MUSCLE_NAME[we.primary_muscle]}</span>
            {rangeText && <span>· doel {we.target_sets ?? sets.length}×{rangeText}</span>}
            {we.unilateral && <Pill className="h-5">per kant</Pill>}
          </div>
        </div>
        <span className="num text-lg font-semibold text-muted tabular">{doneCount}/{sets.filter((s) => s.set_type !== "warmup").length}</span>
        <IconButton label="Oefeningopties" size="sm" onClick={() => setMenu(true)}>
          <MoreVertical className="size-5" />
        </IconButton>
      </header>

      {/* Vorige prestatie */}
      <div className="mx-3 mb-2 rounded-2xl bg-surface-2/70 px-3 py-2.5">
        {prev ? (
          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted uppercase tracking-wide">
              <History className="size-3.5" /> Vorige training · {formatDate(prev.session.started_at, { day: "numeric", month: "long" })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[14px] text-ink-2 tabular">
              {prev.sets.map((s, i) => (
                <span key={s.id} className={cx(s.set_type === "warmup" && "text-muted")}>
                  <span className="text-muted">{s.set_type === "warmup" ? "W" : i + 1 - prevWarm.length}.</span> {formatSetShort(s, we.metrics, unit)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-muted">Eerste keer: kies een gewicht waarmee je alle sets netjes kunt uitvoeren. Volgende keer zie je hier wat je deed.</div>
        )}
      </div>

      {(we.notes || exNote?.text) && (
        <button onClick={() => setNotesOpen(true)} className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-start gap-2 rounded-2xl border border-dashed border-line-strong px-3 py-2 text-left text-[13px] text-ink-2">
          <NotebookPen className="size-4 mt-0.5 shrink-0 text-muted" />
          <span className="space-y-0.5">
            {exNote?.text && <span className="block">{exNote.text}</span>}
            {we.notes && <span className="block text-muted">{we.notes}</span>}
          </span>
        </button>
      )}

      {/* Sets */}
      <div className="px-2 pb-2">
        <div className="grid items-center gap-1.5 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted" style={{ gridTemplateColumns: gridCols(cols.length) }}>
          <span className="text-center">Set</span>
          <span>Vorige</span>
          {cols.map((c) => <span key={c.key} className="text-center">{c.key === "weight_kg" && unit === "lb" ? c.label.replace("kg", "lb") : c.label}</span>)}
          <span className="text-center">✓</span>
        </div>
        <div className="space-y-1">
          {sets.map((s) => {
            const i = workIdx.get(s.id) ?? 0;
            const prevSet = s.set_type === "warmup" ? prevWarm[i] : prevWork[i];
            return (
              <SetRow
                key={s.id}
                s={s}
                cols={cols}
                label={s.set_type === "warmup" ? "W" : `${i + 1}${SET_TYPE_SHORT[s.set_type]}`}
                prevText={prevSet ? formatSetShort(prevSet, we.metrics, unit).replace(/ (kg|lb) × /, "×").replace(/ (kg|lb)$/, "") : "–"}
                placeholder={prevSet}
                rangeText={rangeText}
                pr={prSets[s.id]}
                unit={unit}
                onComplete={(v) => complete(s, v)}
                onMenu={() => setSetSheet(s)}
              />
            );
          })}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => addSet(we.id)}>
            <Plus className="size-4" /> Set
          </Button>
          <Button variant="ghost" onClick={() => addSet(we.id, { type: "warmup" })}>
            <Plus className="size-4" /> Warming-up
          </Button>
          <IconButton label={`Rusttijd ${we.rest_seconds} seconden`} variant="ghost" onClick={() => setRestOpen(true)}>
            <span className="flex flex-col items-center leading-none"><Timer className="size-4" /><span className="num text-[11px] mt-0.5">{we.rest_seconds}s</span></span>
          </IconButton>
        </div>
      </div>

      {/* Menu */}
      <Sheet open={menu} onOpenChange={setMenu} title={we.exercise_name}>
        <div className="grid gap-1.5">
          <MenuItem icon={NotebookPen} label="Notities" onClick={() => { setMenu(false); setNotesOpen(true); }} />
          <MenuItem icon={Repeat} label="Vervangen door alternatief" onClick={() => { setMenu(false); setAltOpen(true); }} />
          <MenuItem icon={Timer} label={`Rusttijd (${we.rest_seconds}s)`} onClick={() => { setMenu(false); setRestOpen(true); }} />
          <MenuItem icon={ArrowUp} label="Omhoog" disabled={index === 0} onClick={() => moveWorkoutExercise(we.id, -1)} />
          <MenuItem icon={ArrowDown} label="Omlaag" disabled={index === count - 1} onClick={() => moveWorkoutExercise(we.id, 1)} />
          <MenuItem icon={Trash2} label="Oefening verwijderen" danger onClick={() => { setMenu(false); setConfirmRemove(true); }} />
        </div>
      </Sheet>

      <NotesSheet open={notesOpen} onOpenChange={setNotesOpen} we={we} exerciseNote={exNote?.text ?? ""} />
      <AlternativesSheet open={altOpen} onOpenChange={setAltOpen} we={we} />
      <Sheet open={restOpen} onOpenChange={setRestOpen} title="Rusttijd" description="Na elke voltooide set start de rusttimer automatisch.">
        <div className="flex flex-col items-center gap-4 py-2">
          <Stepper label="Rusttijd" value={we.rest_seconds} step={15} max={600} suffix="s" onChange={(v) => updateWorkoutExercise(we.id, { rest_seconds: v })} />
          <div className="flex flex-wrap justify-center gap-2">
            {[30, 60, 90, 120, 180, 240].map((v) => (
              <button key={v} onClick={() => updateWorkoutExercise(we.id, { rest_seconds: v })} className={cx("h-10 px-4 rounded-full text-sm font-semibold num", we.rest_seconds === v ? "bg-accent text-accent-ink" : "bg-surface-2")}>
                {v < 60 ? `${v}s` : `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`}
              </button>
            ))}
          </div>
        </div>
      </Sheet>
      <Confirm
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Oefening verwijderen?"
        body={`${we.exercise_name} en alle ${sets.length} sets worden uit deze training verwijderd.`}
        confirmLabel="Verwijderen"
        danger
        onConfirm={() => removeWorkoutExercise(we.id)}
      />
      {setSheet && <SetSheet s={sets.find((x) => x.id === setSheet.id) ?? setSheet} we={we} onClose={() => setSetSheet(null)} />}
    </article>
  );
}

function gridCols(n: number) {
  return `40px minmax(0,1fr) ${Array(n).fill("minmax(58px,76px)").join(" ")} 48px`;
}

function SetRow({
  s, cols, label, prevText, placeholder, rangeText, pr, unit, onComplete, onMenu,
}: {
  s: WorkoutSet;
  cols: ReturnType<typeof inputColumns>;
  label: string;
  prevText: string;
  placeholder?: WorkoutSet;
  rangeText: string | null;
  pr?: string[];
  unit: "kg" | "lb";
  onComplete: (v: boolean) => void;
  onMenu: () => void;
}) {
  const lastTap = useRef(0);
  const toUnit = (kg: number | null) => (kg == null ? null : unit === "lb" ? Math.round(kg * 2.20462 * 10) / 10 : kg);
  const fromUnit = (v: number | null) => (v == null ? null : unit === "lb" ? Math.round((v / 2.20462) * 100) / 100 : v);
  return (
    <div
      data-testid="set-row"
      data-completed={s.completed}
      className={cx(
        "grid items-center gap-1.5 rounded-2xl px-1 py-1 transition-colors",
        s.completed ? "bg-accent-soft animate-flash" : s.set_type === "warmup" ? "bg-transparent" : "",
      )}
      style={{ gridTemplateColumns: gridCols(cols.length) }}
    >
      <button onClick={onMenu} aria-label={`Set ${label} opties`} className={cx("h-11 rounded-xl text-sm font-bold num", s.set_type === "warmup" ? "text-warn" : s.set_type === "drop" || s.set_type === "failure" ? "text-info" : "text-ink-2", "bg-surface-2/60 hover:bg-surface-3")}>
        {label}
      </button>
      <div className="min-w-0 text-[13px] text-muted truncate tabular flex items-center gap-1">
        {pr ? <span className="inline-flex items-center gap-1 text-accent-text font-bold animate-pop"><Trophy className="size-3.5" /> PR</span> : prevText}
        {s.notes && <NotebookPen className="size-3 shrink-0" />}
      </div>
      {cols.map((c) => {
        const isW = c.key === "weight_kg";
        const val = isW ? toUnit(s.weight_kg) : (s[c.key] as number | null);
        const ph = placeholder?.[c.key] != null ? String(isW ? toUnit(placeholder.weight_kg) : placeholder[c.key]) : c.key === "reps" && rangeText ? rangeText : "0";
        return (
          <div key={c.key} className={cx("h-11 rounded-xl", s.completed ? "bg-transparent" : "bg-surface-2")}>
            <NumField
              label={`${c.label} set ${label}`}
              value={val}
              decimal={c.decimal}
              placeholder={ph.replace(".", ",")}
              max={c.key === "distance_m" ? 1_000_000 : c.key === "duration_sec" ? 86_400 : c.key === "reps" ? 1000 : 2000}
              onCommit={(v) => void updateSet(s.id, { [c.key]: isW ? fromUnit(v) : v }, { propagate: true }).catch((e) => toast(errorMessage(e), "error"))}
              className={cx("h-11 text-xl font-semibold", s.completed ? "text-ink" : "text-ink-2")}
            />
          </div>
        );
      })}
      <button
        aria-label={s.completed ? `Set ${label} niet voltooid maken` : `Set ${label} voltooien`}
        aria-pressed={s.completed}
        onClick={() => {
          // voorkom dubbele verwerking bij snel dubbel tikken
          const t = Date.now();
          if (t - lastTap.current < 350) return;
          lastTap.current = t;
          (document.activeElement as HTMLElement | null)?.blur?.();
          // wacht één tick zodat een openstaande invoer eerst wordt opgeslagen
          setTimeout(() => onComplete(!s.completed), 30);
        }}
        className={cx(
          "h-11 w-12 grid place-items-center rounded-xl transition active:scale-90",
          s.completed ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted hover:text-ink border border-line",
        )}
      >
        <Check className={cx("size-5", s.completed && "animate-pop")} strokeWidth={3} />
      </button>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger, disabled }: { icon: typeof Plus; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className={cx("flex items-center gap-3 h-13 px-4 rounded-2xl text-[15px] font-semibold text-left disabled:opacity-40", danger ? "text-danger bg-danger/8" : "bg-surface-2")}>
      <Icon className="size-5" /> {label}
    </button>
  );
}

function NotesSheet({ open, onOpenChange, we, exerciseNote }: { open: boolean; onOpenChange: (o: boolean) => void; we: WorkoutExercise; exerciseNote: string }) {
  const [a, setA] = useState(we.notes);
  const [b, setB] = useState(exerciseNote);
  useEffect(() => {
    if (open) {
      setA(we.notes);
      setB(exerciseNote);
    }
  }, [open, we.notes, exerciseNote]);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Notities"
      footer={
        <Button variant="primary" block size="lg" onClick={async () => { await updateWorkoutExercise(we.id, { notes: a }); await setExerciseNote(we.exercise_id, b); onOpenChange(false); }}>
          Opslaan
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Notitie bij deze training" hint="Blijft bij deze training in je historie.">
          <textarea className={cx(inputCls, "h-24 py-3 resize-none")} value={a} onChange={(e) => setA(e.target.value)} placeholder="Bijv. voelde zwaar, linkerschouder" />
        </Field>
        <Field label="Vaste notitie bij deze oefening" hint="Zie je bij elke training, bijv. stoelstand of grip.">
          <textarea className={cx(inputCls, "h-20 py-3 resize-none")} value={b} onChange={(e) => setB(e.target.value)} placeholder="Bijv. stoel op stand 4" />
        </Field>
      </div>
    </Sheet>
  );
}

function AlternativesSheet({ open, onOpenChange, we }: { open: boolean; onOpenChange: (o: boolean) => void; we: WorkoutExercise }) {
  const all = useAllExercises();
  const map = useExerciseMap();
  const ex = map.get(we.exercise_id);
  const alts = ex ? alternativesFor(ex, all) : [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Alternatieven" description={`Vervang ${we.exercise_name}, bijvoorbeeld als het apparaat bezet is.`}>
      <div className="space-y-0.5">
        {alts.map((a) => (
          <ExerciseRow
            key={a.id}
            e={a}
            onClick={async () => {
              try {
                await replaceWorkoutExercise(we.id, a.id);
                toast(`Vervangen door ${a.name}`, "success");
                onOpenChange(false);
              } catch (e) {
                toast(errorMessage(e), "error");
              }
            }}
          />
        ))}
        {!alts.length && <p className="text-muted text-center py-8">Geen alternatieven gevonden.</p>}
      </div>
    </Sheet>
  );
}

function SetSheet({ s, we, onClose }: { s: WorkoutSet; we: WorkoutExercise; onClose: () => void }) {
  const [note, setNote] = useState(s.notes);
  const settings = useSettings();
  const step = settings.unit === "lb" ? 5 / 2.20462 : 2.5;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title="Set" description={we.exercise_name}>
      <div className="space-y-5">
        <Field label="Type set">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SET_TYPE_LABEL) as WorkoutSet["set_type"][]).map((t) => (
              <button key={t} onClick={() => updateSet(s.id, { set_type: t })} className={cx("h-11 rounded-2xl text-sm font-semibold", s.set_type === t ? "bg-accent text-accent-ink" : "bg-surface-2")}>
                {SET_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          {s.set_type === "warmup" && <p className="text-xs text-muted mt-2">Warming-upsets tellen niet mee in volume en settelling.</p>}
        </Field>
        {we.metrics.includes("weight") && (
          <Field label="Snel gewicht aanpassen">
            <div className="flex gap-2">
              {[-2, -1, 1, 2].map((k) => (
                <button key={k} onClick={() => updateSet(s.id, { weight_kg: Math.max(0, Math.round(((s.weight_kg ?? 0) + k * step) * 100) / 100) })} className="flex-1 h-11 rounded-2xl bg-surface-2 num font-bold">
                  {k > 0 ? "+" : "−"}{(Math.abs(k) * (settings.unit === "lb" ? 5 : 2.5)).toLocaleString("nl-NL")}
                </button>
              ))}
            </div>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="RPE (1–10)" hint="Hoe zwaar voelde de set?">
            <div className="h-12 rounded-2xl bg-surface-2">
              <NumField label="RPE" value={s.rpe} min={1} max={10} onCommit={(v) => updateSet(s.id, { rpe: v })} className="h-12 text-lg" placeholder="–" />
            </div>
          </Field>
          <Field label="RIR" hint="Herhalingen in reserve">
            <div className="h-12 rounded-2xl bg-surface-2">
              <NumField label="RIR" value={s.rir} decimal={false} max={10} onCommit={(v) => updateSet(s.id, { rir: v })} className="h-12 text-lg" placeholder="–" />
            </div>
          </Field>
        </div>
        <Field label="Notitie bij deze set">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== s.notes && updateSet(s.id, { notes: note })} placeholder="Bijv. met spotter" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={async () => { await addSet(we.id, { copyFrom: s.id }); onClose(); }}>
            <Copy className="size-4" /> Kopiëren
          </Button>
          <Button variant="danger" onClick={async () => { await deleteSet(s.id); onClose(); }}>
            <Trash2 className="size-4" /> Verwijderen
          </Button>
        </div>
        {!s.completed && <p className="text-xs text-muted">Een set overslaan? Laat hem gewoon open. Niet-voltooide sets tellen nergens mee en worden bij afronden verwijderd.</p>}
      </div>
    </Sheet>
  );
}

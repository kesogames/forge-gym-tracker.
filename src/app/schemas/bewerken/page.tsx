"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, GripVertical, Link2, Plus, Trash2, X } from "lucide-react";
import { getTemplateFull, saveTemplateFull, uid } from "@/lib/db/repo";
import type { TemplateFullInput } from "@/lib/db/schemas";
import { useExerciseMap, useSettings } from "@/lib/hooks";
import { MUSCLE_NAME } from "@/lib/data/muscles";
import { Button, Card, cx, Field, IconButton, inputCls, NumField, Stepper } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { ExercisePicker } from "@/components/ExercisePicker";
import { toast, errorMessage } from "@/components/toast";

type Day = TemplateFullInput["days"][number];
type TEx = Day["exercises"][number];

export default function Page() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}

function Editor() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const [data, setData] = useState<TemplateFullInput | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [picker, setPicker] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const exMap = useExerciseMap();

  useEffect(() => {
    (async () => {
      if (id) {
        const f = await getTemplateFull(id);
        if (f) {
          setData({
            template: { id: f.template.id, name: f.template.name, description: f.template.description, favorite: f.template.favorite, archived: f.template.archived },
            days: f.days.map((d) => ({ id: d.id, name: d.name, exercises: d.exercises.map(({ id, exercise_id, sets, rep_min, rep_max, rest_seconds, target_weight, superset_group, notes }) => ({ id, exercise_id, sets, rep_min, rep_max, rest_seconds, target_weight, superset_group, notes })) })),
          });
          return;
        }
      }
      setData({ template: { id: uid(), name: "", description: "", favorite: false, archived: false }, days: [{ id: uid(), name: "Dag 1", exercises: [] }] });
    })();
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (!data) return null;
  const day = data.days[Math.min(dayIdx, data.days.length - 1)];
  const update = (fn: (d: TemplateFullInput) => TemplateFullInput) => {
    setData((d) => (d ? fn(structuredClone(d)) : d));
    setDirty(true);
  };
  const updateDay = (fn: (d: Day) => void) => update((d) => { fn(d.days[dayIdx]); return d; });

  const save = async () => {
    setSaving(true);
    try {
      const tid = await saveTemplateFull(data);
      setDirty(false);
      toast("Schema opgeslagen", "success");
      router.replace(`/schemas`);
      void tid;
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-2 pt-1 mb-4">
        <IconButton label="Terug" onClick={() => (dirty && !confirm("Wijzigingen niet opgeslagen. Toch teruggaan?") ? null : router.back())}><ArrowLeft className="size-5" /></IconButton>
        <h1 className="text-2xl font-bold tracking-tight flex-1">{id ? "Schema bewerken" : "Nieuw schema"}</h1>
        <Button variant="primary" onClick={save} disabled={saving} data-testid="save-template">Opslaan</Button>
      </div>

      <Card className="p-4 space-y-4">
        <Field label="Naam">
          <input className={inputCls} value={data.template.name} onChange={(e) => update((d) => ({ ...d, template: { ...d.template, name: e.target.value } }))} placeholder="Bijv. Push / Pull / Legs" data-testid="template-name" />
        </Field>
        <Field label="Beschrijving (optioneel)">
          <input className={inputCls} value={data.template.description} onChange={(e) => update((d) => ({ ...d, template: { ...d.template, description: e.target.value } }))} placeholder="Doel, frequentie, opmerkingen" />
        </Field>
      </Card>

      {/* Dagen */}
      <div className="flex items-center gap-2 mt-6 mb-3 overflow-x-auto scrollbar-none -mx-4 px-4">
        {data.days.map((d, i) => (
          <button key={d.id} onClick={() => setDayIdx(i)} className={cx("h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap border", i === dayIdx ? "bg-ink text-bg border-transparent" : "bg-surface border-line text-ink-2")}>
            {d.name || `Dag ${i + 1}`} <span className="opacity-60">· {d.exercises.length}</span>
          </button>
        ))}
        <button onClick={() => { update((d) => { d.days.push({ id: uid(), name: `Dag ${d.days.length + 1}`, exercises: [] }); return d; }); setDayIdx(data.days.length); }} className="h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap border border-dashed border-line-strong text-muted">
          <Plus className="size-4 inline -mt-0.5" /> Dag
        </button>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field label="Naam trainingsdag">
              <input className={inputCls} value={day.name} onChange={(e) => updateDay((d) => { d.name = e.target.value; })} placeholder="Bijv. Push" />
            </Field>
          </div>
          {data.days.length > 1 && (
            <>
              <IconButton label="Dag naar links" variant="secondary" disabled={dayIdx === 0} onClick={() => { update((d) => { d.days = arrayMove(d.days, dayIdx, dayIdx - 1); return d; }); setDayIdx(dayIdx - 1); }}><ArrowUp className="size-4 -rotate-90" /></IconButton>
              <IconButton label="Dag verwijderen" variant="danger" onClick={() => { if (!day.exercises.length || confirm(`${day.name} met ${day.exercises.length} oefeningen verwijderen?`)) { update((d) => { d.days.splice(dayIdx, 1); return d; }); setDayIdx(Math.max(0, dayIdx - 1)); } }}><Trash2 className="size-4" /></IconButton>
            </>
          )}
        </div>
      </Card>

      <DayExercises day={day} onChange={(fn) => updateDay(fn)} />

      <Button size="lg" variant="outline" block className="mt-3" onClick={() => setPicker(true)} data-testid="template-add-exercise">
        <Plus className="size-5" /> Oefeningen toevoegen
      </Button>

      <ExercisePicker
        open={picker}
        onOpenChange={setPicker}
        onPick={(ids) => updateDay((d) => { for (const exId of ids) d.exercises.push(newTemplateExercise(exId)); })}
      />

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] lg:bottom-6 z-30 px-4 lg:pl-72 pointer-events-none">
        <div className="max-w-3xl mx-auto flex justify-end">
          {dirty && <Button size="lg" variant="primary" className="pointer-events-auto shadow-2xl" onClick={save} disabled={saving}>Schema opslaan</Button>}
        </div>
      </div>
    </div>
  );

  function newTemplateExercise(exerciseId: string): TEx {
    const ex = exMap.get(exerciseId);
    const timed = ex?.metric_type === "time" || ex?.metric_type === "distance";
    return { id: uid(), exercise_id: exerciseId, sets: timed ? 1 : 3, rep_min: timed ? null : 8, rep_max: timed ? null : 12, rest_seconds: ex?.default_rest ?? 90, target_weight: null, superset_group: null, notes: "" };
  }
}

function DayExercises({ day, onChange }: { day: Day; onChange: (fn: (d: Day) => void) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onChange((d) => {
      const from = d.exercises.findIndex((x) => x.id === e.active.id);
      const to = d.exercises.findIndex((x) => x.id === e.over!.id);
      d.exercises = arrayMove(d.exercises, from, to);
    });
  };
  if (!day.exercises.length) return <p className="text-center text-muted py-10 text-[15px]">Nog geen oefeningen op deze dag.</p>;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={day.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 mt-3">
          {day.exercises.map((e, i) => (
            <SortableExercise key={e.id} e={e} index={i} count={day.exercises.length} onChange={(fn) => onChange((d) => fn(d.exercises[i]))} onMove={(dir) => onChange((d) => { d.exercises = arrayMove(d.exercises, i, i + dir); })} onRemove={() => onChange((d) => { d.exercises.splice(i, 1); })} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableExercise({ e, index, count, onChange, onMove, onRemove }: { e: TEx; index: number; count: number; onChange: (fn: (x: TEx) => void) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: e.id });
  const map = useExerciseMap();
  const settings = useSettings();
  const ex = map.get(e.exercise_id);
  const [open, setOpen] = useState(false);
  const reps = e.rep_min && e.rep_max && e.rep_min !== e.rep_max ? `${e.rep_min}–${e.rep_max}` : e.rep_max ?? e.rep_min ?? "–";
  const timed = ex && (ex.metric_type === "time" || ex.metric_type === "distance");
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx("rounded-3xl bg-surface border border-line", isDragging && "z-10 shadow-2xl relative opacity-90")} data-testid="template-exercise">
      <div className="flex items-center gap-2 p-2.5">
        <button {...attributes} {...listeners} aria-label="Slepen om te herschikken" className="touch-none cursor-grab p-2 text-muted"><GripVertical className="size-5" /></button>
        <ExerciseImage image={ex?.image ?? null} name={ex?.name ?? e.exercise_id} className="size-12 rounded-xl" />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)}>
          <div className="font-semibold truncate">{ex?.name ?? "Onbekende oefening"}</div>
          <div className="text-[13px] text-muted truncate">
            {timed ? `${e.sets} ${e.sets === 1 ? "ronde" : "rondes"}` : `${e.sets} × ${reps}`} · rust {e.rest_seconds}s{e.target_weight ? ` · ${e.target_weight} kg` : ""}
            {e.superset_group && <span className="text-info font-semibold"> · Superset {e.superset_group}</span>}
          </div>
        </button>
        <div className="flex flex-col">
          <button aria-label="Omhoog" disabled={index === 0} onClick={() => onMove(-1)} className="p-1 text-muted disabled:opacity-30"><ArrowUp className="size-4" /></button>
          <button aria-label="Omlaag" disabled={index === count - 1} onClick={() => onMove(1)} className="p-1 text-muted disabled:opacity-30"><ArrowDown className="size-4" /></button>
        </div>
        <IconButton label="Details" size="sm" onClick={() => setOpen(!open)}><ChevronDown className={cx("size-5 transition", open && "rotate-180")} /></IconButton>
      </div>
      {open && (
        <div className="border-t border-line p-4 space-y-4 animate-rise">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <Field label="Sets"><Stepper label="Sets" value={e.sets} min={1} max={20} onChange={(v) => onChange((x) => { x.sets = v; })} /></Field>
            {!timed && (
              <Field label="Herhalingen (bereik)">
                <div className="flex items-center gap-1.5 h-[52px] rounded-2xl bg-surface-2 px-2">
                  <NumField label="Minimaal aantal herhalingen" value={e.rep_min} decimal={false} max={1000} onCommit={(v) => onChange((x) => { x.rep_min = v; if (v != null && x.rep_max != null && x.rep_max < v) x.rep_max = v; })} className="text-lg h-10" placeholder="8" />
                  <span className="text-muted">–</span>
                  <NumField label="Maximaal aantal herhalingen" value={e.rep_max} decimal={false} max={1000} onCommit={(v) => onChange((x) => { x.rep_max = v; })} className="text-lg h-10" placeholder="12" />
                </div>
              </Field>
            )}
            <Field label="Rust (s)"><Stepper label="Rust" value={e.rest_seconds} step={15} max={600} onChange={(v) => onChange((x) => { x.rest_seconds = v; })} /></Field>
            {!timed && (
              <Field label={`Doelgewicht (${settings.unit})`}>
                <div className="h-[52px] rounded-2xl bg-surface-2">
                  <NumField label="Doelgewicht" value={e.target_weight} onCommit={(v) => onChange((x) => { x.target_weight = v; })} className="text-lg h-[52px]" placeholder="–" />
                </div>
              </Field>
            )}
          </div>
          <Field label="Superset / circuit" hint="Oefeningen met dezelfde letter doe je na elkaar; de rusttimer start na de laatste.">
            <div className="flex gap-2">
              {[null, "A", "B", "C", "D"].map((g) => (
                <button key={g ?? "none"} onClick={() => onChange((x) => { x.superset_group = g; })} className={cx("h-10 min-w-10 px-3 rounded-xl text-sm font-bold", e.superset_group === g ? "bg-info text-white" : "bg-surface-2 text-ink-2")}>
                  {g ?? <X className="size-4" />}
                </button>
              ))}
              <Link2 className="size-4 text-muted self-center ml-1" />
            </div>
          </Field>
          <Field label="Notitie bij deze oefening in het schema">
            <input className={inputCls} value={e.notes} onChange={(ev) => onChange((x) => { x.notes = ev.target.value; })} placeholder="Bijv. tempo 3-1-1, pauze onderin" />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{ex && MUSCLE_NAME[ex.primary_muscle]}</span>
            <Button variant="danger" size="sm" onClick={onRemove}><Trash2 className="size-4" /> Verwijderen</Button>
          </div>
        </div>
      )}
    </div>
  );
}

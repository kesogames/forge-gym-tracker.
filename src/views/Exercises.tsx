"use client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/nav";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Plus, Star, Timer, Trash2, TrendingUp } from "lucide-react";
import { db } from "@/lib/db/db";
import { alternativesFor, deleteCustomExercise, setExerciseNote, toggleFavoriteExercise } from "@/lib/db/repo";
import { useAllExercises, useBundles, useLatestBodyweight, useSettings } from "@/lib/hooks";
import { EQUIPMENT_NAME, METRIC_TYPE_NAME, MUSCLE_NAME } from "@/lib/data/muscles";
import { exerciseGroup, GROUP_NAME } from "@/lib/data/exercises";
import { exerciseHistory } from "@/lib/stats";
import { formatDate } from "@/lib/domain/time";
import { Button, Card, Confirm, cx, Field, inputCls, Pill, Sheet } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { ExerciseFilters, ExerciseRow, emptyFilter, filterExercises, type ExerciseFilterState } from "@/components/ExercisePicker";
import { CustomExerciseForm } from "@/components/CustomExerciseForm";
import type { CustomExercise, Exercise } from "@/lib/types";
import { toast } from "@/components/toast";

export default function ExercisesPage() {
  const all = useAllExercises();
  const settings = useSettings();
  const [f, setF] = useState<ExerciseFilterState>(emptyFilter);
  const [sel, setSel] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const list = useMemo(() => filterExercises(all, f, settings.favorite_exercises), [all, f, settings.favorite_exercises]);
  const [limit, setLimit] = useState(60);
  useEffect(() => setLimit(60), [f]);
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oefeningen</h1>
          <p className="text-muted mt-1">{all.length} oefeningen: kracht, kettlebell, landmine, plyo, rotatie en meer</p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}><Plus className="size-4" /> Eigen</Button>
      </header>
      <div className="sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 py-2 bg-bg/90 backdrop-blur-xl [&_.-mx-5]:mx-0 [&_.-mx-5]:px-0">
        <ExerciseFilters f={f} setF={setF} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {list.slice(0, limit).map((e) => (
          <button key={e.id} onClick={() => setSel(e)} className="group text-left rounded-3xl bg-surface border border-line overflow-hidden hover:border-line-strong transition active:scale-[0.99]" data-testid="exercise-tile">
            <div className="relative">
              <ExerciseImage image={e.image} name={e.name} muscle={e.primary_muscle} className="aspect-[4/3] w-full" animate />
              {settings.favorite_exercises.includes(e.id) && <Star className="absolute top-2 right-2 size-5 fill-accent text-accent drop-shadow" />}
            </div>
            <div className="p-3">
              <div className="font-semibold text-[15px] leading-snug line-clamp-2">{e.name}</div>
              <div className="text-xs text-muted mt-1 truncate">{MUSCLE_NAME[e.primary_muscle]} · {EQUIPMENT_NAME[e.equipment]}</div>
            </div>
          </button>
        ))}
      </div>
      {list.length > limit && (
        <Button block size="lg" variant="secondary" onClick={() => setLimit((l) => l + 90)}>
          Meer tonen ({list.length - limit} over)
        </Button>
      )}
      {!list.length && <p className="text-center text-muted py-12">Geen oefeningen gevonden.</p>}
      <p className="text-xs text-muted text-center">Afbeeldingen: free-exercise-db, Unlicense (publiek domein).</p>
      {sel && <ExerciseDetail e={all.find((x) => x.id === sel.id) ?? sel} onClose={() => setSel(null)} onPick={(x) => setSel(x)} />}
      <CustomExerciseForm open={creating} onOpenChange={setCreating} initialName={f.q} />
    </div>
  );
}

function ExerciseDetail({ e, onClose, onPick }: { e: Exercise; onClose: () => void; onPick: (e: Exercise) => void }) {
  const all = useAllExercises();
  const settings = useSettings();
  const bundles = useBundles();
  const bw = useLatestBodyweight();
  const note = useLiveQuery(() => db().exercise_notes.get(e.id), [e.id]);
  const [noteText, setNoteText] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [del, setDel] = useState(false);
  const fav = settings.favorite_exercises.includes(e.id);
  const hist = bundles ? exerciseHistory(bundles, e.id, { bodyweight_kg: bw, include_bodyweight: settings.include_bodyweight_volume }) : [];
  const last = hist[hist.length - 1];
  const bestE1 = hist.reduce<number | null>((a, h) => (h.best_e1rm != null && (a == null || h.best_e1rm > a) ? h.best_e1rm : a), null);
  const bestW = hist.reduce<number | null>((a, h) => (h.best_weight != null && (a == null || h.best_weight > a) ? h.best_weight : a), null);
  const alts = alternativesFor(e, all);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={e.name} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 -mx-1">
          <ExerciseImage image={e.image} name={e.name} muscle={e.primary_muscle} className="aspect-[4/3] w-full rounded-2xl" />
          {e.image && !e.image.startsWith("data:") ? <ExerciseImage image={e.image} frame={1} name={`${e.name} eindpositie`} className="aspect-[4/3] w-full rounded-2xl" /> : <div className="rounded-2xl bg-surface-2 grid place-items-center text-sm text-muted p-4 text-center">Geen extra afbeelding</div>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="accent">{MUSCLE_NAME[e.primary_muscle]}</Pill>
          {e.secondary_muscles.map((m) => <Pill key={m}>{MUSCLE_NAME[m]}</Pill>)}
          <Pill>{EQUIPMENT_NAME[e.equipment]}</Pill>
          <Pill>{METRIC_TYPE_NAME[e.metric_type]}</Pill>
          <Pill>{GROUP_NAME[exerciseGroup(e)]}</Pill>
          <Pill>{e.mechanic === "compound" ? "Samengesteld" : "Geïsoleerd"}</Pill>
          {e.unilateral && <Pill>Eenzijdig</Pill>}
          <Pill><Timer className="size-3" /> {e.default_rest}s rust</Pill>
        </div>
        {e.instructions && (
          <div>
            {e.source === "db" && <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Uitvoering (Engels, uit de open oefeningendatabase)</div>}
            <p className="text-[15px] leading-relaxed text-ink-2" lang={e.source === "db" ? "en" : "nl"}>{e.instructions}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant={fav ? "primary" : "secondary"} onClick={() => toggleFavoriteExercise(e.id)}><Star className={cx("size-4", fav && "fill-current")} /> {fav ? "Favoriet" : "Favoriet maken"}</Button>
          {e.is_custom && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" /> Bewerken</Button>}
          {e.is_custom && <Button variant="danger" onClick={() => setDel(true)}><Trash2 className="size-4" /></Button>}
        </div>

        {hist.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Jouw prestaties</h3>
              <Link href={`/progressie?oefening=${e.id}`} className="text-sm font-semibold text-accent-text inline-flex items-center gap-1"><TrendingUp className="size-4" /> Progressie</Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><div className="num text-xl font-bold">{last.best_set}</div><div className="text-xs text-muted">Laatste beste set · {formatDate(last.date)}</div></div>
              <div><div className="num text-xl font-bold">{bestW != null ? `${bestW.toLocaleString("nl-NL")} kg` : "–"}</div><div className="text-xs text-muted">Zwaarste gewicht</div></div>
              <div><div className="num text-xl font-bold">{bestE1 != null ? `${bestE1.toLocaleString("nl-NL")} kg` : "–"}</div><div className="text-xs text-muted">Gesch. 1RM (Epley)</div></div>
            </div>
            <div className="text-xs text-muted mt-2">{hist.length} keer uitgevoerd</div>
          </Card>
        )}

        <Field label="Vaste notitie" hint="Zie je bij elke training met deze oefening.">
          <textarea className={cx(inputCls, "h-20 py-3 resize-none")} value={noteText ?? note?.text ?? ""} onChange={(ev) => setNoteText(ev.target.value)} onBlur={() => noteText !== null && setExerciseNote(e.id, noteText).then(() => toast("Notitie opgeslagen", "success"))} placeholder="Bijv. stoel op stand 4, smalle grip" />
        </Field>

        {alts.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Alternatieven</h3>
            <div className="space-y-0.5 -mx-2">{alts.map((a) => <ExerciseRow key={a.id} e={a} onClick={() => onPick(a)} />)}</div>
          </div>
        )}
      </div>
      {e.is_custom && <CustomExerciseForm open={editing} onOpenChange={setEditing} existing={e as CustomExercise} />}
      <Confirm open={del} onOpenChange={setDel} title="Eigen oefening verwijderen?" body="De oefening verdwijnt uit de bibliotheek. Trainingen waarin je hem deed blijven bewaard (met naam en gegevens)." confirmLabel="Verwijderen" danger onConfirm={async () => { await deleteCustomExercise(e.id); onClose(); }} />
    </Sheet>
  );
}

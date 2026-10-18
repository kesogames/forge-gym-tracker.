"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search, Star, X } from "lucide-react";
import { Button, Chip, cx, inputCls, Sheet } from "./ui";
import { ExerciseImage } from "./ExerciseImage";
import { CustomExerciseForm } from "./CustomExerciseForm";
import { useAllExercises, useSettings } from "@/lib/hooks";
import { EQUIPMENT_NAME, METRIC_TYPE_NAME, MUSCLES, MUSCLE_NAME } from "@/lib/data/muscles";
import type { Equipment, Exercise, MetricType, MuscleId } from "@/lib/types";
import { exerciseGroup, GROUP_NAME, type ExerciseGroup } from "@/lib/data/exercises";

export interface ExerciseFilterState {
  q: string;
  muscle: MuscleId | null;
  equipment: Equipment | null;
  type: MetricType | null;
  favorites: boolean;
  group: ExerciseGroup | null;
}

export const emptyFilter: ExerciseFilterState = { q: "", muscle: null, equipment: null, type: null, favorites: false, group: null };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filterExercises(all: Exercise[], f: ExerciseFilterState, favorites: string[]): Exercise[] {
  const terms = norm(f.q).split(/\s+/).filter(Boolean);
  return all.filter((e) => {
    if (f.muscle && e.primary_muscle !== f.muscle && !e.secondary_muscles.includes(f.muscle)) return false;
    if (f.equipment && e.equipment !== f.equipment) return false;
    if (f.type && e.metric_type !== f.type) return false;
    if (f.favorites && !favorites.includes(e.id)) return false;
    if (f.group && exerciseGroup(e) !== f.group) return false;
    if (terms.length) {
      const hay = norm(`${e.name} ${MUSCLE_NAME[e.primary_muscle]} ${EQUIPMENT_NAME[e.equipment]} ${e.id.replace(/-/g, " ")}`);
      return terms.every((t) => hay.includes(t));
    }
    return true;
  }).sort((a, b) => {
    // primaire spier eerst bij spierfilter, favorieten bovenaan
    const fa = Number(favorites.includes(b.id)) - Number(favorites.includes(a.id));
    if (fa) return fa;
    // handgeschreven (Nederlands) vóór de uitgebreide database
    const src = Number(a.source === "db") - Number(b.source === "db");
    if (src) return src;
    if (f.muscle) {
      const p = Number(b.primary_muscle === f.muscle) - Number(a.primary_muscle === f.muscle);
      if (p) return p;
    }
    return a.name.localeCompare(b.name, "nl");
  });
}

export function ExerciseFilters({ f, setF, showFav = true }: { f: ExerciseFilterState; setF: (f: ExerciseFilterState) => void; showFav?: boolean }) {
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" />
        <input
          type="search"
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
          placeholder="Zoek oefening, spier of materiaal"
          aria-label="Zoek oefening"
          className={cx(inputCls, "pl-11")}
        />
        {f.q && (
          <button onClick={() => setF({ ...f, q: "" })} aria-label="Zoekterm wissen" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted">
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5">
        {showFav && (
          <Chip active={f.favorites} onClick={() => setF({ ...f, favorites: !f.favorites })}>
            <Star className={cx("size-3.5 inline -mt-0.5 mr-1", f.favorites && "fill-current")} />
            Favorieten
          </Chip>
        )}
        {MUSCLES.map((m) => (
          <Chip key={m.id} active={f.muscle === m.id} onClick={() => setF({ ...f, muscle: f.muscle === m.id ? null : m.id })}>
            {m.name}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <select aria-label="Soort oefening" value={f.group ?? ""} onChange={(e) => setF({ ...f, group: (e.target.value || null) as ExerciseGroup | null })} className={cx(inputCls, "h-10 text-sm px-3 min-w-0 col-span-2 sm:col-span-1")}>
          <option value="">Alle soorten</option>
          {Object.entries(GROUP_NAME).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select aria-label="Materiaal" value={f.equipment ?? ""} onChange={(e) => setF({ ...f, equipment: (e.target.value || null) as Equipment | null })} className={cx(inputCls, "h-10 text-sm px-3 min-w-0")}>
          <option value="">Alle materialen</option>
          {Object.entries(EQUIPMENT_NAME).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select aria-label="Oefeningstype" value={f.type ?? ""} onChange={(e) => setF({ ...f, type: (e.target.value || null) as MetricType | null })} className={cx(inputCls, "h-10 text-sm px-3 min-w-0")}>
          <option value="">Alle meetwijzen</option>
          {Object.entries(METRIC_TYPE_NAME).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function ExerciseRow({ e, selected, onClick, right, favorite }: { e: Exercise; selected?: boolean; onClick?: () => void; right?: React.ReactNode; favorite?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("w-full flex items-center gap-3 p-2 rounded-2xl text-left transition", selected ? "bg-accent-soft" : "hover:bg-surface-2 active:bg-surface-2")}
    >
      <ExerciseImage image={e.image} name={e.name} muscle={e.primary_muscle} className="size-14 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[15px] truncate flex items-center gap-1.5">
          {e.name}
          {favorite && <Star className="size-3.5 fill-accent-text text-accent-text shrink-0" />}
        </div>
        <div className="text-[13px] text-muted truncate">
          {MUSCLE_NAME[e.primary_muscle]} · {EQUIPMENT_NAME[e.equipment]}
          {e.is_custom && " · Eigen"}
          {e.source === "db" && " · Database"}
        </div>
      </div>
      {right ?? (selected !== undefined && (
        <span className={cx("grid size-7 place-items-center rounded-full border-2 transition shrink-0", selected ? "bg-accent border-accent text-accent-ink" : "border-line-strong")}>
          {selected && <Check className="size-4" strokeWidth={3} />}
        </span>
      ))}
    </button>
  );
}

export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  multi = true,
  title = "Oefening toevoegen",
  initialMuscle = null,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (ids: string[]) => void;
  multi?: boolean;
  title?: string;
  initialMuscle?: MuscleId | null;
}) {
  const all = useAllExercises();
  const settings = useSettings();
  const [f, setF] = useState<ExerciseFilterState>({ ...emptyFilter, muscle: initialMuscle });
  const [sel, setSel] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const list = useMemo(() => filterExercises(all, f, settings.favorite_exercises), [all, f, settings.favorite_exercises]);
  const [limit, setLimit] = useState(50);
  useEffect(() => setLimit(50), [f]);

  const close = (o: boolean) => {
    if (!o) {
      setSel([]);
      setF({ ...emptyFilter, muscle: initialMuscle });
    }
    onOpenChange(o);
  };

  return (
    <>
      <Sheet
        open={open && !creating}
        onOpenChange={close}
        title={title}
        size="lg"
        footer={
          multi ? (
            <Button variant="primary" size="lg" block disabled={!sel.length} onClick={() => { onPick(sel); close(false); }}>
              {sel.length ? `${sel.length} ${sel.length === 1 ? "oefening" : "oefeningen"} toevoegen` : "Selecteer oefeningen"}
            </Button>
          ) : undefined
        }
      >
        <div className="sticky top-0 z-10 bg-surface pb-3 -mt-1 pt-1">
          <ExerciseFilters f={f} setF={setF} />
        </div>
        <div className="flex items-center justify-between text-sm text-muted mb-1 px-1">
          <span>{list.length} oefeningen</span>
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1 font-semibold text-accent-text">
            <Plus className="size-4" /> Eigen oefening
          </button>
        </div>
        <div className="space-y-0.5">
          {list.slice(0, limit).map((e) => (
            <ExerciseRow
              key={e.id}
              e={e}
              favorite={settings.favorite_exercises.includes(e.id)}
              selected={multi ? sel.includes(e.id) : undefined}
              onClick={() => {
                if (!multi) {
                  onPick([e.id]);
                  close(false);
                } else setSel((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]));
              }}
            />
          ))}
          {list.length > limit && (
            <button onClick={() => setLimit((l) => l + 80)} className="w-full h-12 rounded-2xl bg-surface-2 text-sm font-semibold mt-2">
              Meer tonen ({list.length - limit} over)
            </button>
          )}
          {!list.length && <p className="text-center text-muted py-10">Geen oefeningen gevonden. Pas je filters aan of maak een eigen oefening.</p>}
        </div>
      </Sheet>
      <CustomExerciseForm
        open={creating}
        onOpenChange={setCreating}
        initialName={f.q}
        onSaved={(id) => {
          setCreating(false);
          if (multi) setSel((s) => [...s, id]);
          else {
            onPick([id]);
            close(false);
          }
        }}
      />
    </>
  );
}

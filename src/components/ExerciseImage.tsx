"use client";
import { useEffect, useState } from "react";
import { Dumbbell, Flame, HeartPulse, Move, Pause, Play, Repeat2, RotateCw, Shuffle, Zap, PersonStanding } from "lucide-react";
import { EXERCISE_BY_ID, exerciseGroup, imageUrl, type ExerciseGroup } from "@/lib/data/exercises";
import { MUSCLE_NAME } from "@/lib/data/muscles";
import { SPA } from "@/lib/nav";
import { packedImageUrl } from "@/lib/imagePack";
import type { MuscleId } from "@/lib/types";
import { cx } from "./ui";

// Alle oefeningbeelden krijgen dezelfde behandeling: vaste uitsnede, lichte
// kleurcorrectie en een zachte onderrand, zodat foto's uit verschillende bronnen
// als één set ogen. Oefeningen met een start- en eindfoto kunnen 'bewegen' door
// vloeiend tussen beide posities te wisselen.

const GROUP_ICON: Record<ExerciseGroup, typeof Dumbbell> = {
  kracht: Dumbbell,
  plyo: Zap,
  explosief: Flame,
  rotatie: RotateCw,
  combinatie: Shuffle,
  landmine: Dumbbell,
  cardio: HeartPulse,
  mobiliteit: Move,
  stretchen: PersonStanding,
};

function useResolved(raw: string | null): { src: string | null; failed: boolean } {
  const packed = SPA && !!raw && !raw.startsWith("data:") && !raw.startsWith("http");
  const [state, setState] = useState<{ key: string | null; src: string | null; failed: boolean }>({ key: null, src: null, failed: false });
  useEffect(() => {
    if (!packed || !raw) return;
    let alive = true;
    packedImageUrl(raw).then((u) => alive && setState({ key: raw, src: u, failed: !u }));
    return () => {
      alive = false;
    };
  }, [packed, raw]);
  if (!raw) return { src: null, failed: true };
  if (!packed) return { src: raw, failed: false };
  return state.key === raw ? { src: state.src, failed: state.failed } : { src: null, failed: false };
}

export function ExerciseImage({
  image,
  name,
  muscle,
  className,
  frame = 0,
  exerciseId,
  play = false,
  badge = false,
  rounded,
}: {
  image: string | null;
  name: string;
  muscle?: MuscleId;
  className?: string;
  frame?: 0 | 1;
  exerciseId?: string;
  /** Wissel automatisch tussen start- en eindpositie */
  play?: boolean;
  /** Toon een klein afspeel-icoon als hint dat er een animatie is */
  badge?: boolean;
  rounded?: string;
  /** @deprecated vervangen door play */
  animate?: boolean;
}) {
  const a = useResolved(imageUrl(image, frame));
  const b = useResolved(play ? imageUrl(image, frame === 0 ? 1 : 0) : null);
  const [errA, setErrA] = useState(false);
  const [showB, setShowB] = useState(false);
  const canPlay = play && !!b.src && !errA;

  useEffect(() => {
    if (!canPlay) return setShowB(false);
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setInterval(() => setShowB((v) => !v), reduce ? 1800 : 1100);
    return () => clearInterval(t);
  }, [canPlay]);

  if (a.failed || errA || (!a.src && !image)) return <Placeholder name={name} muscle={muscle} exerciseId={exerciseId} className={className} rounded={rounded} />;
  if (!a.src) return <div className={cx("bg-surface-2 animate-pulse", className, rounded)} aria-label={name} role="img" />;

  return (
    <div className={cx("relative overflow-hidden bg-surface-2 isolate", className, rounded)} role="img" aria-label={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.src} alt="" loading="lazy" decoding="async" onError={() => setErrA(true)} className="absolute inset-0 size-full object-cover exercise-photo" />
      {canPlay && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.src!} alt="" decoding="async" className={cx("absolute inset-0 size-full object-cover exercise-photo transition-opacity duration-500 ease-in-out", showB ? "opacity-100" : "opacity-0")} />
      )}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/25 via-transparent to-transparent mix-blend-multiply" />
      {badge && image && (
        <span className="absolute bottom-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <Play className="size-3 fill-current ml-px" />
        </span>
      )}
    </div>
  );
}

function Placeholder({ name, muscle, exerciseId, className, rounded }: { name: string; muscle?: MuscleId; exerciseId?: string; className?: string; rounded?: string }) {
  const ex = exerciseId ? EXERCISE_BY_ID.get(exerciseId) : undefined;
  const group = ex ? exerciseGroup(ex) : "kracht";
  const Icon = GROUP_ICON[group];
  return (
    <div className={cx("relative grid place-items-center overflow-hidden bg-gradient-to-br from-surface-3 via-surface-2 to-surface-2 text-accent-text", className, rounded)} aria-label={name} role="img">
      <div className="absolute -right-4 -bottom-6 size-[70%] rounded-full bg-accent-soft" />
      <Icon className="relative size-[34%] max-w-12 max-h-12 opacity-80" strokeWidth={1.6} />
      {muscle && <span className="absolute bottom-1 inset-x-0 text-center text-[9px] font-semibold uppercase tracking-wider text-muted">{MUSCLE_NAME[muscle]}</span>}
    </div>
  );
}

/** Grote speler met afspeel-/pauzeknop en positie-indicator, voor uitleg van een oefening. */
export function ExercisePlayer({ image, name, exerciseId, className }: { image: string | null; name: string; exerciseId?: string; className?: string }) {
  const [playing, setPlaying] = useState(true);
  const has = !!image && !image.startsWith("data:");
  return (
    <div className={cx("relative", className)}>
      <button type="button" onClick={() => has && setPlaying((p) => !p)} className="block w-full" aria-label={playing ? "Animatie pauzeren" : "Animatie afspelen"}>
        <ExerciseImage image={image} name={name} exerciseId={exerciseId} play={has && playing} className="aspect-[4/3] w-full" rounded="rounded-3xl" />
      </button>
      {has && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 text-white text-xs font-semibold px-2.5 h-7 backdrop-blur-sm">
            <Repeat2 className="size-3.5" /> Start ↔ eindpositie
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-ink shadow-lg">
            {playing ? <Pause className="size-4" /> : <Play className="size-4 fill-current ml-0.5" />}
          </span>
        </div>
      )}
    </div>
  );
}

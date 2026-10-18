"use client";
import { Timer } from "lucide-react";
import { Pill, Sheet } from "./ui";
import { ExercisePlayer } from "./ExerciseImage";
import { EQUIPMENT_NAME, MUSCLE_NAME } from "@/lib/data/muscles";
import { exerciseGroup, GROUP_NAME } from "@/lib/data/exercises";
import type { Exercise } from "@/lib/types";

/** Splitst een uitvoeringstekst in losse stappen (zinnen). */
export function instructionSteps(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ÀÉÈÍÓÚ])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ExerciseHowTo({ e }: { e: Exercise }) {
  const steps = instructionSteps(e.instructions);
  return (
    <div className="space-y-4">
      <ExercisePlayer image={e.image} name={e.name} exerciseId={e.id} />
      <div className="flex flex-wrap gap-1.5">
        <Pill tone="accent">{MUSCLE_NAME[e.primary_muscle]}</Pill>
        {e.secondary_muscles.map((m) => <Pill key={m}>{MUSCLE_NAME[m]}</Pill>)}
        <Pill>{EQUIPMENT_NAME[e.equipment]}</Pill>
        <Pill>{GROUP_NAME[exerciseGroup(e)]}</Pill>
        {e.default_rest > 0 && <Pill><Timer className="size-3" /> {e.default_rest}s rust</Pill>}
        {e.unilateral && <Pill>Per kant</Pill>}
      </div>
      {steps.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{e.source === "db" ? "Uitvoering (Engels, uit de open oefeningendatabase)" : "Uitvoering"}</div>
          <ol className="space-y-2.5" lang={e.source === "db" ? "en" : "nl"}>
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-ink mt-0.5">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function ExerciseDemoSheet({ e, open, onOpenChange }: { e: Exercise | undefined; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!e) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={e.name} description="Tik op het beeld om te pauzeren">
      <ExerciseHowTo e={e} />
    </Sheet>
  );
}

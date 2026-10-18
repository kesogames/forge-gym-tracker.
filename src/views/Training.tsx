"use client";
import { useActiveSession } from "@/lib/hooks";
import { ActiveWorkout } from "@/components/training/ActiveWorkout";
import { StartChooser } from "@/components/training/StartChooser";

export default function TrainingPage() {
  const active = useActiveSession();
  if (active === undefined) return null;
  return active ? <ActiveWorkout session={active} /> : <StartChooser />;
}

"use client";
import { useEffect, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button, Chip, Field, inputCls, Sheet, Toggle, cx } from "./ui";
import { toast, errorMessage } from "./toast";
import { ExerciseImage } from "./ExerciseImage";
import { saveCustomExercise } from "@/lib/db/repo";
import { EQUIPMENT_NAME, METRICS_FOR_TYPE, METRIC_NAME, METRIC_TYPE_NAME, MUSCLES } from "@/lib/data/muscles";
import type { CustomExercise, Equipment, Metric, MetricType, MuscleId } from "@/lib/types";

/** Verkleint een gekozen foto naar max. 480px webp data-URL, zodat hij lokaal en in de DB past. */
async function resizeImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/webp", 0.75);
}

export function CustomExerciseForm({ open, onOpenChange, onSaved, initialName = "", existing }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved?: (id: string) => void; initialName?: string; existing?: CustomExercise }) {
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState<MuscleId>("chest");
  const [secondary, setSecondary] = useState<MuscleId[]>([]);
  const [equipment, setEquipment] = useState<Equipment>("dumbbell");
  const [type, setType] = useState<MetricType>("weight_reps");
  const [metrics, setMetrics] = useState<Metric[]>(["weight", "reps"]);
  const [rest, setRest] = useState(90);
  const [unilateral, setUnilateral] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? initialName);
    setPrimary(existing?.primary_muscle ?? "chest");
    setSecondary(existing?.secondary_muscles ?? []);
    setEquipment(existing?.equipment ?? "dumbbell");
    setType(existing?.metric_type ?? "weight_reps");
    setMetrics(existing?.metrics ?? ["weight", "reps"]);
    setRest(existing?.default_rest ?? 90);
    setUnilateral(existing?.unilateral ?? false);
    setInstructions(existing?.instructions ?? "");
    setImage(existing?.image ?? null);
  }, [open, existing, initialName]);

  const save = async () => {
    try {
      const r = await saveCustomExercise(
        { name, primary_muscle: primary, secondary_muscles: secondary.filter((m) => m !== primary), equipment, metric_type: type, metrics: type === "custom" ? metrics : METRICS_FOR_TYPE[type], instructions, default_rest: rest, unilateral, image },
        existing?.id,
      );
      toast(existing ? "Oefening bijgewerkt" : "Oefening toegevoegd", "success");
      onSaved?.(r.id);
      onOpenChange(false);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Oefening bewerken" : "Eigen oefening"}
      size="lg"
      footer={<Button variant="primary" size="lg" block onClick={save}>Opslaan</Button>}
    >
      <div className="space-y-5">
        <div className="flex gap-4 items-center">
          <label className="relative cursor-pointer">
            <ExerciseImage image={image} name={name || "?"} className="size-20 rounded-2xl" />
            <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-accent text-accent-ink"><Camera className="size-4" /></span>
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImage(await resizeImage(f)); }} />
          </label>
          <div className="flex-1">
            <Field label="Naam">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Landmine press" autoFocus />
            </Field>
          </div>
          {image && <button aria-label="Afbeelding verwijderen" onClick={() => setImage(null)} className="p-2 text-muted"><Trash2 className="size-4" /></button>}
        </div>
        <Field label="Primaire spiergroep">
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map((m) => <Chip key={m.id} active={primary === m.id} onClick={() => setPrimary(m.id)}>{m.name}</Chip>)}
          </div>
        </Field>
        <Field label="Secundaire spiergroepen (optioneel)">
          <div className="flex flex-wrap gap-2">
            {MUSCLES.filter((m) => m.id !== primary).map((m) => (
              <Chip key={m.id} active={secondary.includes(m.id)} onClick={() => setSecondary((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))}>{m.name}</Chip>
            ))}
          </div>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Materiaal">
            <select className={inputCls} value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
              {Object.entries(EQUIPMENT_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as MetricType)}>
              {Object.entries(METRIC_TYPE_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        {type === "custom" && (
          <Field label="Meetwaarden">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(METRIC_NAME) as Metric[]).map((m) => (
                <Chip key={m} active={metrics.includes(m)} onClick={() => setMetrics((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}>{METRIC_NAME[m]}</Chip>
              ))}
            </div>
          </Field>
        )}
        <Field label="Standaard rusttijd (seconden)">
          <input className={cx(inputCls, "num text-lg")} inputMode="numeric" value={rest} onChange={(e) => setRest(Math.min(1800, Number(e.target.value.replace(/\D/g, "")) || 0))} />
        </Field>
        <Toggle checked={unilateral} onChange={setUnilateral} label="Eenzijdig" description="Gewicht en herhalingen per kant. Volume wordt niet verdubbeld." />
        <Field label="Uitvoering (optioneel)">
          <textarea className={cx(inputCls, "h-24 py-3 resize-none")} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Korte instructie" />
        </Field>
      </div>
    </Sheet>
  );
}

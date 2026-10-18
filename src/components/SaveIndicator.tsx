"use client";
import { Check, CloudOff, Loader2, AlertTriangle, Cloud, HardDrive } from "lucide-react";
import { useStatus } from "@/lib/db/status";
import { cx } from "./ui";

/** Zichtbare opslagstatus: lokaal opslaan + (optioneel) sync met de cloud. */
export function SaveIndicator({ className }: { className?: string }) {
  const s = useStatus();
  let icon = <Check className="size-3.5" />;
  let text = "Opgeslagen";
  let tone = "text-muted";
  if (s.save === "saving") {
    icon = <Loader2 className="size-3.5 animate-spin" />;
    text = "Opslaan…";
  } else if (s.save === "error") {
    icon = <AlertTriangle className="size-3.5" />;
    text = "Niet opgeslagen";
    tone = "text-danger";
  } else if (s.sync === "syncing") {
    icon = <Loader2 className="size-3.5 animate-spin" />;
    text = "Synchroniseren…";
  } else if (s.sync === "synced") {
    icon = <Cloud className="size-3.5" />;
    text = "Opgeslagen in de cloud";
  } else if (s.sync === "offline") {
    icon = <CloudOff className="size-3.5" />;
    text = "Offline · lokaal opgeslagen";
    tone = "text-warn";
  } else if (s.sync === "error") {
    icon = <CloudOff className="size-3.5" />;
    text = "Lokaal opgeslagen · sync mislukt";
    tone = "text-warn";
  } else if (s.save === "saved" || s.save === "idle") {
    icon = <HardDrive className="size-3.5" />;
    text = s.sync === "signed_out" ? "Opgeslagen op dit apparaat" : "Opgeslagen op dit apparaat";
  }
  return (
    <span role="status" title={s.lastError ?? undefined} className={cx("inline-flex items-center gap-1.5 text-xs font-medium", tone, className)}>
      {icon}
      {text}
    </span>
  );
}

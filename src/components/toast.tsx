"use client";
import { useSyncExternalStore } from "react";
import { cx } from "./ui";

export interface Toast {
  id: number;
  text: string;
  tone: "default" | "success" | "error" | "pr";
}

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, tone: Toast["tone"] = "default", ms = 2600) {
  const t = { id: ++seq, text, tone };
  toasts = [...toasts.slice(-2), t];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, ms);
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 pt-[calc(env(safe-area-inset-top)+12px)] px-4">
      {list.map((t) => (
        <div
          key={t.id}
          className={cx(
            "animate-rise pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-[15px] font-semibold shadow-2xl border",
            t.tone === "error" && "bg-danger text-white border-transparent",
            t.tone === "success" && "bg-surface border-line text-ink",
            t.tone === "pr" && "bg-accent text-accent-ink border-transparent",
            t.tone === "default" && "bg-surface border-line text-ink",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "issues" in e) {
    const issues = (e as { issues: { message: string }[] }).issues;
    return issues[0]?.message ?? "Ongeldige invoer";
  }
  return e instanceof Error ? e.message : String(e);
}

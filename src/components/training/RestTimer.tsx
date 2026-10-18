"use client";
import { useEffect, useRef } from "react";
import { Pause, Play, SkipForward, Timer } from "lucide-react";
import { adjustRest, skipRest, toggleRestPause } from "@/lib/db/repo";
import { formatRest, restRemainingMs } from "@/lib/domain/time";
import { useNow, useSettings } from "@/lib/hooks";
import type { WorkoutSession } from "@/lib/types";
import { cx, IconButton } from "../ui";

let audioCtx: AudioContext | null = null;
/** Korte dubbele piep via WebAudio (geen geluidsbestand nodig). */
export function beep() {
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioCtx;
    [0, 0.22].forEach((offset) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + offset);
      o.stop(ctx.currentTime + offset + 0.2);
    });
  } catch {}
}

/** Ontgrendelt audio op iOS: moet vanuit een gebruikersactie gebeuren. */
export function unlockAudio() {
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {}
}

async function notify(title: string, body: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag: "rest-timer", icon: "/icons/icon-192.png", silent: false });
    else new Notification(title, { body, tag: "rest-timer" });
  } catch {}
}

export function RestTimer({ session }: { session: WorkoutSession }) {
  const t = session.rest_timer;
  const now = useNow(250, !!t);
  const settings = useSettings();
  const fired = useRef<string | null>(null);
  const remaining = t ? restRemainingMs(t, now) : 0;
  const done = !!t && t.ends_at !== null && remaining <= 0;

  useEffect(() => {
    if (!t || !done || fired.current === t.started_at) return;
    fired.current = t.started_at;
    // Alleen melden als de rust net is afgelopen (niet bij heropenen uren later)
    const overdue = t.ends_at ? Date.now() - new Date(t.ends_at).getTime() : 0;
    if (overdue < 15_000) {
      if (settings.rest_sound) beep();
      navigator.vibrate?.([180, 80, 180]);
      if (settings.rest_notifications && document.visibilityState !== "visible") void notify("Rust voorbij", "Tijd voor je volgende set.");
    }
  }, [done, t, settings.rest_sound, settings.rest_notifications]);

  // Rust na afloop automatisch sluiten
  useEffect(() => {
    if (!done || !t?.ends_at) return;
    const left = 4000 - (Date.now() - new Date(t.ends_at).getTime());
    const h = setTimeout(() => void skipRest(session.id), Math.max(0, left));
    return () => clearTimeout(h);
  }, [done, t?.ends_at, session.id]);

  if (!t) return null;
  const total = t.duration * 1000;
  const progress = total ? 1 - remaining / total : 1;
  const paused = t.ends_at === null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] lg:bottom-6 z-40 px-3 lg:pl-72 pointer-events-none">
      <div
        role="timer"
        aria-label="Rusttimer"
        className={cx(
          "pointer-events-auto mx-auto max-w-xl rounded-3xl border shadow-2xl overflow-hidden animate-rise",
          done ? "bg-accent text-accent-ink border-transparent" : "bg-surface border-line-strong",
        )}
      >
        <div className="relative h-1 bg-surface-3/50">
          <div className={cx("absolute inset-y-0 left-0", done ? "bg-accent-ink/30" : "bg-accent")} style={{ width: `${Math.min(100, progress * 100)}%`, transition: "width 250ms linear" }} />
        </div>
        <div className="flex items-center gap-2 p-3 pl-4">
          <Timer className={cx("size-5 shrink-0", done ? "" : "text-accent-text")} />
          <div className="min-w-0">
            <div className={cx("text-[11px] font-bold uppercase tracking-wider", done ? "opacity-70" : "text-muted")}>{done ? "Rust voorbij" : paused ? "Rust gepauzeerd" : "Rust"}</div>
            <div className="num text-4xl font-bold leading-none" aria-live="off">{done ? "Go!" : formatRest(Math.ceil(remaining / 1000))}</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {!done && (
              <>
                <button onClick={() => adjustRest(session.id, -15)} className="h-11 px-3 rounded-2xl bg-surface-2 text-sm font-bold num" aria-label="15 seconden minder">−15</button>
                <button onClick={() => adjustRest(session.id, 15)} className="h-11 px-3 rounded-2xl bg-surface-2 text-sm font-bold num" aria-label="15 seconden meer">+15</button>
                <IconButton label={paused ? "Rust hervatten" : "Rust pauzeren"} variant="secondary" onClick={() => toggleRestPause(session.id)}>
                  {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
                </IconButton>
              </>
            )}
            <IconButton label="Rust overslaan" variant={done ? "ghost" : "primary"} onClick={() => skipRest(session.id)} className={done ? "text-accent-ink" : ""}>
              <SkipForward className="size-5" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

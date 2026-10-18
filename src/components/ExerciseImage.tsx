"use client";
import { useState } from "react";
import { imageUrl } from "@/lib/data/exercises";
import { MUSCLE_NAME } from "@/lib/data/muscles";
import type { MuscleId } from "@/lib/types";
import { cx } from "./ui";

/** Oefeningafbeelding met nette placeholder als er geen (werkende) afbeelding is. */
export function ExerciseImage({ image, name, muscle, className, animate, frame = 0 }: { image: string | null; name: string; muscle?: MuscleId; className?: string; animate?: boolean; frame?: 0 | 1 }) {
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState(false);
  const src = imageUrl(image, animate && hover ? 1 : frame);
  if (!src || failed) {
    const initials = name
      .replace(/\(.*?\)/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("");
    return (
      <div className={cx("relative grid place-items-center overflow-hidden bg-gradient-to-br from-surface-3 to-surface-2 text-muted", className)} aria-label={name} role="img">
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-[60%] opacity-[0.07]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" />
        </svg>
        <span className="num text-xl font-bold text-ink-2">{initials}</span>
        {muscle && <span className="absolute bottom-1 inset-x-0 text-center text-[9px] font-semibold uppercase tracking-wider">{MUSCLE_NAME[muscle]}</span>}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cx("object-cover bg-surface-2", className)}
    />
  );
}

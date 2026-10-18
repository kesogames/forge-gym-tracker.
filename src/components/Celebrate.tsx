"use client";
// Lichte confetti-animatie zonder externe library. Respecteert prefers-reduced-motion via CSS.
export function celebrate(count = 36) {
  if (typeof document === "undefined") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:70;overflow:hidden";
  const colors = ["var(--accent)", "#ffffff", "var(--info)", "var(--accent)"];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const size = 6 + Math.random() * 6;
    p.style.cssText = `position:absolute;top:0;left:${Math.random() * 100}%;width:${size}px;height:${size * 0.45}px;background:${colors[i % colors.length]};border-radius:2px;--dx:${(Math.random() - 0.5) * 160}px;--rot:${Math.random() * 720 - 360}deg;animation:confetti-fall ${1.4 + Math.random() * 1.2}s cubic-bezier(.2,.6,.4,1) ${Math.random() * 0.25}s forwards`;
    root.appendChild(p);
  }
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 3200);
}

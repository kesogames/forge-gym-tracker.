"use client";
import { Link } from "@/lib/nav";
import { usePathname, useRouter } from "@/lib/nav";
import { useEffect, useState, type ReactNode } from "react";
import { ClipboardList, Dumbbell, History, Home, Library, MoreHorizontal, Play, Settings, TrendingUp, Pause } from "lucide-react";
import { cx, Sheet } from "./ui";
import { Toaster } from "./toast";
import { SaveIndicator } from "./SaveIndicator";
import { useActiveSession, useMounted, useNow, useSettings } from "@/lib/hooks";
import { formatClock, isPaused, totalMs } from "@/lib/domain/time";
import { startAutoSync } from "@/lib/sync/engine";
import { isDemoMode } from "@/lib/db/db";
import { stopDemo } from "@/lib/demo";

export const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/schemas", label: "Schema's", icon: ClipboardList },
  { href: "/oefeningen", label: "Oefeningen", icon: Library },
  { href: "/progressie", label: "Progressie", icon: TrendingUp },
  { href: "/historie", label: "Historie", icon: History },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Logo className="opacity-60 animate-pulse" />
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const active = useActiveSession();
  const [more, setMore] = useState(false);
  const demo = isDemoMode();

  // Thema toepassen
  useEffect(() => {
    const apply = () => {
      let t = settings.theme;
      if (t === "system") t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      document.documentElement.dataset.theme = t;
    };
    apply();
    try {
      localStorage.setItem("forge-theme", settings.theme);
    } catch {}
    const mq = matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  useEffect(() => {
    startAutoSync();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SPA !== "1") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Bij openen van de app met een actieve training: direct terug naar die training
  useEffect(() => {
    if (!active) return;
    try {
      if (sessionStorage.getItem("forge-resumed")) return;
      sessionStorage.setItem("forge-resumed", "1");
    } catch {}
    if (path === "/") router.replace("/training");
  }, [active, path, router]);

  const onTraining = path.startsWith("/training");
  const mobileNav = [NAV[0], NAV[2], NAV[1], NAV[4]];

  return (
    <div className="min-h-dvh lg:flex">
      <Toaster />
      {/* Desktop zijbalk */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col border-r border-line px-4 py-6 sticky top-0 h-dvh">
        <Link href="/" className="px-3 mb-8">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                "flex items-center gap-3 h-11 px-3 rounded-2xl text-[15px] font-medium transition",
                isActive(path, n.href) ? "bg-surface-2 text-ink" : "text-muted hover:text-ink hover:bg-surface-2/60",
              )}
            >
              <n.icon className={cx("size-5", isActive(path, n.href) && "text-accent-text")} />
              {n.label}
              {n.href === "/training" && active && <span className="ml-auto size-2 rounded-full bg-accent animate-pulse-dot" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          {active ? <ActiveMini compact /> : (
            <Link href="/training" className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-accent text-accent-ink font-bold">
              <Play className="size-4 fill-current" /> Start training
            </Link>
          )}
          <div className="px-1"><SaveIndicator /></div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {demo && (
          <div className="sticky top-0 z-40 bg-info text-white pt-safe" data-testid="demo-banner">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-2 flex items-center gap-3 text-sm">
              <span className="font-semibold flex-1">Voorbeeldmodus · dit zijn voorbeeldgegevens, je eigen trainingen zijn veilig</span>
              <button onClick={() => void stopDemo()} className="h-8 px-3 rounded-full bg-white/20 font-semibold whitespace-nowrap">Stoppen</button>
            </div>
          </div>
        )}
        <main className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 pt-[calc(env(safe-area-inset-top)+12px)] lg:pt-8", active && !onTraining ? "pb-44" : "pb-28", "lg:pb-12")}>
          {children}
        </main>
      </div>

      {/* Mobiel: actieve-training balk + onderste navigatie */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        {active && !onTraining && (
          <div className="px-3 pb-2 pointer-events-auto">
            <ActiveMini />
          </div>
        )}
        <nav className="pointer-events-auto border-t border-line bg-bg/85 backdrop-blur-xl pb-safe">
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
            {mobileNav.slice(0, 2).map((n) => (
              <NavItem key={n.href} {...n} active={isActive(path, n.href)} />
            ))}
            <Link href="/training" aria-label={active ? "Naar training" : "Start training"} className="grid place-items-center">
              <span className={cx("grid size-14 -mt-5 place-items-center rounded-[20px] shadow-lg transition active:scale-95", "bg-accent text-accent-ink", onTraining && "ring-4 ring-accent/25")}>
                {active ? <Dumbbell className="size-6" /> : <Play className="size-6 fill-current ml-0.5" />}
              </span>
            </Link>
            <NavItem {...mobileNav[3]} active={isActive(path, mobileNav[3].href)} />
            <button onClick={() => setMore(true)} className={cx("flex flex-col items-center justify-center gap-1 text-[11px] font-medium", ["/historie", "/oefeningen", "/instellingen"].some((h) => path.startsWith(h)) ? "text-ink" : "text-muted")}>
              <MoreHorizontal className="size-5" />
              Meer
            </button>
          </div>
        </nav>
      </div>

      <Sheet open={more} onOpenChange={setMore} title="Meer">
        <div className="grid gap-2">
          {[NAV[5], NAV[3], NAV[6]].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMore(false)} className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-surface-2 text-[15px] font-semibold">
              <n.icon className="size-5 text-accent-text" /> {n.label}
            </Link>
          ))}
          <div className="pt-2 px-1"><SaveIndicator /></div>
        </div>
      </Sheet>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link href={href} className={cx("flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition", active ? "text-ink" : "text-muted")}>
      <Icon className={cx("size-5", active && "text-accent-text")} />
      {label}
    </Link>
  );
}

function ActiveMini({ compact }: { compact?: boolean }) {
  const active = useActiveSession();
  const now = useNow(1000, !!active);
  if (!active) return null;
  const paused = isPaused(active);
  return (
    <Link href="/training" className={cx("flex items-center gap-3 rounded-2xl bg-accent text-accent-ink shadow-xl", compact ? "h-14 px-4" : "h-14 px-4")}>
      <span className="relative flex size-2.5">
        <span className={cx("absolute inline-flex h-full w-full rounded-full bg-accent-ink", !paused && "animate-ping opacity-40")} />
        <span className="relative inline-flex size-2.5 rounded-full bg-accent-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">{paused ? "Gepauzeerd" : "Training bezig"}</div>
        <div className="text-sm font-semibold truncate">{active.name}</div>
      </div>
      <span className="num text-2xl font-bold">{formatClock(totalMs(active, now))}</span>
      {paused && <Pause className="size-4" />}
    </Link>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
          <path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" />
        </svg>
      </span>
      <span className="num text-2xl font-bold tracking-wide uppercase">Forge</span>
    </span>
  );
}

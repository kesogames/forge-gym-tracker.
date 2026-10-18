"use client";
import NextLink from "next/link";
import { usePathname as useNextPathname, useRouter as useNextRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from "react";

// Navigatie-laag. Standaard gebruikt de app de Next.js-router. Met
// NEXT_PUBLIC_SPA=1 (build voor een omgeving zonder server-routes, zoals een
// claude.ai-artifact) draait alles op één pagina met een eigen router op basis
// van de hash (#/training?id=...).

export const SPA = process.env.NEXT_PUBLIC_SPA === "1";

interface Loc {
  path: string;
  search: string;
}

function parse(href: string): Loc {
  const h = href.replace(/^#/, "");
  const [p, q = ""] = h.split("?");
  const path = !p || p === "/" ? "/" : p.startsWith("/") ? p : `/${p}`;
  return { path, search: q };
}

function initial(): Loc {
  if (typeof window === "undefined") return { path: "/", search: "" };
  try {
    return parse(window.location.hash || "/");
  } catch {
    return { path: "/", search: "" };
  }
}

let loc: Loc = initial();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function go(href: string, replace = false) {
  loc = parse(href);
  try {
    const url = `#${loc.path}${loc.search ? `?${loc.search}` : ""}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  } catch {}
  window.scrollTo?.(0, 0);
  emit();
}

if (SPA && typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    loc = initial();
    emit();
  });
}

function useLoc(): Loc {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => loc,
    () => loc,
  );
}

export function useRouter() {
  if (SPA) return { push: (h: string) => go(h), replace: (h: string) => go(h, true), back: () => window.history.back() };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useNextRouter();
}

export function usePathname(): string {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (SPA) return useLoc().path;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useNextPathname();
}

export function useSearchParams(): Pick<URLSearchParams, "get"> {
  if (SPA) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const l = useLoc();
    return new URLSearchParams(l.search);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useNextSearchParams();
}

export function Link({ href, children, onClick, ...rest }: { href: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  if (!SPA) {
    return (
      <NextLink href={href} onClick={onClick} {...rest}>
        {children}
      </NextLink>
    );
  }
  return (
    <a
      href={`#${href}`}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        if (href.includes("#") && !href.startsWith("#")) {
          const [p, anchor] = href.split("#");
          go(p);
          setTimeout(() => document.getElementById(anchor)?.scrollIntoView(), 50);
        } else go(href);
      }}
    >
      {children}
    </a>
  );
}

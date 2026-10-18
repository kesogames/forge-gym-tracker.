"use client";
import Dexie from "dexie";
import { DEMO_DB_NAME, GymDB, setDb } from "@/lib/db/db";
import { importJSON } from "@/lib/db/repo";
import { SPA } from "@/lib/nav";

// Voorbeeldmodus: laadt 10 weken voorbeeldtrainingen in een aparte database.
// Datums worden verschoven zodat de laatste training 'recent' is (hele dagen,
// zodat weekdagen kloppen). Stoppen wist de voorbeelddatabase volledig.

const TS_KEYS = new Set(["started_at", "ended_at", "created_at", "updated_at", "completed_at", "achieved_at", "start", "end"]);

function shift(value: unknown, ms: number, key?: string): unknown {
  if (Array.isArray(value)) return value.map((v) => shift(v, ms));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v, ms, k)]));
  }
  if (typeof value === "string" && key) {
    if (TS_KEYS.has(key) && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(new Date(value).getTime() + ms).toISOString();
    if (key === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(new Date(`${value}T12:00:00`).getTime() + ms).toISOString().slice(0, 10);
  }
  return value;
}

export async function startDemo() {
  const res = await fetch(SPA ? "demo-backup.json" : "/demo-backup.json");
  if (!res.ok) throw new Error("Voorbeelddata kon niet geladen worden");
  const data = await res.json();
  const sessions = (data.tables.workout_sessions ?? []) as { started_at: string }[];
  const latest = sessions.reduce((m, s) => Math.max(m, new Date(s.started_at).getTime()), 0);
  const days = latest ? Math.floor((Date.now() - latest) / 86400_000) - 1 : 0;
  const shifted = shift(data, Math.max(0, days) * 86400_000);
  await Dexie.delete(DEMO_DB_NAME);
  setDb(new GymDB(DEMO_DB_NAME));
  await importJSON(JSON.stringify(shifted));
  localStorage.setItem("forge-demo", "1");
  try {
    sessionStorage.setItem("forge-resumed", "1");
  } catch {}
  window.location.reload();
}

export async function stopDemo() {
  try {
    localStorage.removeItem("forge-demo");
  } catch {}
  await Dexie.delete(DEMO_DB_NAME).catch(() => {});
  window.location.reload();
}

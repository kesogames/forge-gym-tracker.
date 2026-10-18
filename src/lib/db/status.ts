"use client";
import { useSyncExternalStore } from "react";

// Zichtbare opslagstatus. Lokale opslag (IndexedDB) is altijd de bron van waarheid;
// sync naar Supabase loopt erachteraan als een account gekoppeld is.

export type SaveState = "idle" | "saving" | "saved" | "error";
export type SyncState = "disabled" | "signed_out" | "syncing" | "synced" | "offline" | "error";

interface Status {
  save: SaveState;
  sync: SyncState;
  lastError: string | null;
  lastSavedAt: number | null;
}

let state: Status = { save: "idle", sync: "disabled", lastError: null, lastSavedAt: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setSave(save: SaveState, err?: string) {
  state = { ...state, save, lastError: err ?? (save === "error" ? state.lastError : null), lastSavedAt: save === "saved" ? Date.now() : state.lastSavedAt };
  emit();
}

export function setSync(sync: SyncState, err?: string) {
  state = { ...state, sync, lastError: err ?? state.lastError };
  emit();
}

export function getStatus(): Status {
  return state;
}

export function useStatus(): Status {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

type Listener = () => void;
const writeListeners = new Set<Listener>();
/** Wordt aangeroepen na elke lokale schrijfactie (gebruikt door de sync-engine). */
export function onLocalWrite(l: Listener) {
  writeListeners.add(l);
  return () => writeListeners.delete(l);
}
export function notifyLocalWrite() {
  for (const l of writeListeners) l();
}

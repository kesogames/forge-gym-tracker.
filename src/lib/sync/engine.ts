import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import { db, isDemoMode, SYNCED_TABLES, type SyncedTable } from "@/lib/db/db";
import { onLocalWrite, setSync } from "@/lib/db/status";

// Local-first sync met Supabase.
// - IndexedDB is altijd de bron voor de UI; de app werkt volledig offline.
// - Elke lokale wijziging staat in de outbox. Sync = eerst ophalen (pull), dan versturen (push).
// - Ophalen gebruikt server_updated_at als cursor. Rijen met nog niet verstuurde lokale
//   wijzigingen worden niet overschreven (lokale wijziging wint, daarna last-write-wins).
// - Verwijderen gebeurt op de server als soft delete (deleted_at).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const syncConfigured = Boolean(URL && ANON);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) client = createClient(URL!, ANON!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

// Ouders vóór kinderen, zodat foreign keys kloppen bij het versturen.
const PUSH_ORDER: SyncedTable[] = [
  "user_settings",
  "custom_exercises",
  "templates",
  "template_days",
  "template_exercises",
  "workout_sessions",
  "workout_exercises",
  "workout_sets",
  "exercise_prs",
  "muscle_group_goals",
  "exercise_notes",
  "user_achievements",
  "body_weight_entries",
];

const TIMESTAMP_FIELDS = ["started_at", "ended_at", "created_at", "updated_at", "completed_at", "achieved_at"];
const SERVER_ONLY = ["user_id", "server_updated_at", "deleted_at"];

function fromRemote(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (SERVER_ONLY.includes(k)) continue;
    out[k] = TIMESTAMP_FIELDS.includes(k) && typeof v === "string" ? new Date(v).toISOString() : v;
  }
  return out;
}

async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db().meta.get(key))?.value as T | undefined;
}
async function setMeta(key: string, value: unknown) {
  await db().meta.put({ key, value });
}

/** Zet alle lokale rijen in de outbox (bij koppelen van een account aan bestaande lokale data). */
export async function enqueueAll() {
  const d = db();
  await d.transaction("rw", [...SYNCED_TABLES.map((t) => d.table(t)), d.outbox], async () => {
    const at = new Date().toISOString();
    for (const t of SYNCED_TABLES) {
      const ids = (await d.table(t).toCollection().primaryKeys()) as string[];
      await d.outbox.bulkAdd(ids.map((row_id) => ({ table: t, row_id, op: "put" as const, at })));
    }
  });
}

async function pull(sb: SupabaseClient, userId: string): Promise<number> {
  let changed = 0;
  const pending = new Set((await db().outbox.toArray()).map((e) => `${e.table}:${e.row_id}`));
  for (const t of SYNCED_TABLES) {
    let cursor = (await getMeta<string>(`cursor:${t}`)) ?? "1970-01-01T00:00:00Z";
    for (;;) {
      const { data, error } = await sb.from(t).select("*").eq("user_id", userId).gt("server_updated_at", cursor).order("server_updated_at").limit(500);
      if (error) throw error;
      if (!data?.length) break;
      const d = db();
      await d.transaction("rw", d.table(t), async () => {
        for (const r of data as Record<string, unknown>[]) {
          const id = r.id as string;
          if (pending.has(`${t}:${id}`)) continue;
          if (r.deleted_at) {
            await d.table(t).delete(id);
          } else {
            const local = (await d.table(t).get(id)) as { updated_at?: string } | undefined;
            const remote = fromRemote(r);
            if (!local || !local.updated_at || local.updated_at <= (remote.updated_at as string)) await d.table(t).put(remote);
          }
          changed++;
        }
      });
      cursor = (data[data.length - 1] as { server_updated_at: string }).server_updated_at;
      await setMeta(`cursor:${t}`, cursor);
      if (data.length < 500) break;
    }
  }
  return changed;
}

async function push(sb: SupabaseClient, userId: string): Promise<number> {
  const entries = await db().outbox.orderBy("seq").toArray();
  if (!entries.length) return 0;
  const maxSeq = entries[entries.length - 1].seq!;
  // laatste operatie per rij telt
  const last = new Map<string, (typeof entries)[number]>();
  for (const e of entries) last.set(`${e.table}:${e.row_id}`, e);
  const ops = [...last.values()];

  for (const t of PUSH_ORDER) {
    const puts = ops.filter((o) => o.table === t && o.op === "put").map((o) => o.row_id);
    for (let i = 0; i < puts.length; i += 200) {
      const rows = (await db().table(t).bulkGet(puts.slice(i, i + 200))).filter(Boolean) as Record<string, unknown>[];
      if (!rows.length) continue;
      const payload = rows.map((r) => ({ ...r, user_id: userId, deleted_at: null }));
      const { error } = await sb.from(t).upsert(payload, { onConflict: "user_id,id" });
      if (error) throw error;
    }
  }
  for (const t of [...PUSH_ORDER].reverse()) {
    const dels = ops.filter((o) => o.table === t && o.op === "delete").map((o) => o.row_id);
    for (let i = 0; i < dels.length; i += 200) {
      const { error } = await sb.from(t).update({ deleted_at: new Date().toISOString() }).eq("user_id", userId).in("id", dels.slice(i, i + 200));
      if (error) throw error;
    }
  }
  await db().outbox.where("seq").belowOrEqual(maxSeq).delete();
  return ops.length;
}

let running: Promise<void> | null = null;
let again = false;

export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    const sb = supabase();
    if (!sb) return setSync("disabled");
    const { data } = await sb.auth.getSession();
    const session = data.session;
    if (!session) return setSync("signed_out");
    if (typeof navigator !== "undefined" && !navigator.onLine) return setSync("offline");
    setSync("syncing");
    try {
      await prepareForUser(session);
      await pull(sb, session.user.id);
      await push(sb, session.user.id);
      await setMeta("last_sync", new Date().toISOString());
      setSync("synced");
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
      setSync(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error", msg);
    }
  })();
  try {
    await running;
  } finally {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

/** Koppelt lokale data aan het ingelogde account. Andere gebruiker op hetzelfde apparaat → lokale data eerst wissen. */
async function prepareForUser(session: Session) {
  const owner = await getMeta<string>("sync_user");
  if (owner === session.user.id) return;
  if (owner && owner !== session.user.id) {
    const d = db();
    await d.transaction("rw", d.tables, async () => {
      for (const t of d.tables) await t.clear();
    });
  } else {
    await enqueueAll(); // bestaande lokale (anonieme) data meenemen naar het account
  }
  await setMeta("sync_user", session.user.id);
}

let started = false;
/** Start automatische sync: na lokale wijzigingen (debounced), bij online komen, bij focus en elke minuut. */
export function startAutoSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (isDemoMode()) return setSync("disabled"); // voorbeelddata nooit synchroniseren
  const sb = supabase();
  if (!sb) {
    setSync("disabled");
    return;
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  const soon = (ms = 1500) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), ms);
  };
  onLocalWrite(() => soon());
  window.addEventListener("online", () => soon(100));
  window.addEventListener("offline", () => setSync("offline"));
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && soon(100));
  setInterval(() => void syncNow(), 60_000);
  sb.auth.onAuthStateChange((_e, s) => (s ? soon(100) : setSync("signed_out")));
  soon(100);
}

export async function signOut(wipe: boolean) {
  const sb = supabase();
  if (!sb) return;
  await syncNow().catch(() => {});
  await sb.auth.signOut();
  if (wipe) {
    const d = db();
    await d.transaction("rw", d.tables, async () => {
      for (const t of d.tables) await t.clear();
    });
  }
  setSync("signed_out");
}

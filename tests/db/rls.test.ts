// Test het Supabase-schema en de Row Level Security tegen een echte Postgres.
// Vereist TEST_DATABASE_URL (bijv. postgres://postgres:postgres@localhost:5432/gym_rls_test).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const url = process.env.TEST_DATABASE_URL;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const root = path.resolve(__dirname, "../..");

describe.skipIf(!url)("Supabase schema + RLS", () => {
  const c = new Client({ connectionString: url });

  async function as<T>(user: string | null, fn: () => Promise<T>): Promise<T> {
    await c.query("begin");
    try {
      await c.query(`set local role ${user ? "authenticated" : "anon"}`);
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? ""]);
      const r = await fn();
      await c.query("commit");
      return r;
    } catch (e) {
      await c.query("rollback");
      throw e;
    }
  }

  beforeAll(async () => {
    await c.connect();
    await c.query("drop schema if exists public cascade; create schema public; grant usage on schema public to public;");
    await c.query(readFileSync(path.join(root, "tests/db/supabase-stub.sql"), "utf8"));
    await c.query(readFileSync(path.join(root, "supabase/migrations/20261018000000_init.sql"), "utf8"));
    await c.query(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
    await c.query("insert into auth.users (id) values ($1), ($2) on conflict do nothing", [A, B]);
  });
  afterAll(async () => {
    await c.end();
  });

  it("seed bevat spiergroepen en oefeningen, leesbaar voor anon", async () => {
    const r = await as(null, () => c.query("select count(*)::int as n from public.exercises"));
    expect(r.rows[0].n).toBeGreaterThan(100);
  });

  it("gebruiker A kan eigen training opslaan, B ziet die niet", async () => {
    await as(A, () =>
      c.query(`insert into public.workout_sessions (user_id, id, name, status, started_at, ended_at, total_duration_sec)
               values ($1, 's1', 'Push', 'completed', now() - interval '1 hour', now(), 3600)`, [A]),
    );
    const mine = await as(A, () => c.query("select id from public.workout_sessions"));
    expect(mine.rows.map((r) => r.id)).toEqual(["s1"]);
    const theirs = await as(B, () => c.query("select id from public.workout_sessions"));
    expect(theirs.rows).toHaveLength(0);
    const anon = await as(null, () => c.query("select id from public.workout_sessions").catch(() => ({ rows: [] })));
    expect(anon.rows).toHaveLength(0);
  });

  it("B kan geen rijen namens A schrijven of A's rijen wijzigen", async () => {
    await expect(
      as(B, () => c.query(`insert into public.workout_sessions (user_id, id, name, status, started_at) values ($1, 'x', 'hack', 'active', now())`, [A])),
    ).rejects.toThrow(/row-level security/);
    const upd = await as(B, () => c.query("update public.workout_sessions set name = 'hack' where id = 's1'"));
    expect(upd.rowCount).toBe(0);
    const del = await as(B, () => c.query("delete from public.workout_sessions where id = 's1'"));
    expect(del.rowCount).toBe(0);
  });

  it("user_id wordt standaard auth.uid() en server_updated_at wordt door de server gezet", async () => {
    await as(A, () => c.query(`insert into public.body_weight_entries (id, date, weight_kg, updated_at, server_updated_at) values ('bw1', '2026-10-18', 80.5, '2020-01-01', '2020-01-01')`));
    const r = await as(A, () => c.query("select user_id, server_updated_at from public.body_weight_entries where id = 'bw1'"));
    expect(r.rows[0].user_id).toBe(A);
    expect(new Date(r.rows[0].server_updated_at).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it("dezelfde id mag bij twee gebruikers bestaan (sleutel = user_id + id)", async () => {
    await as(A, () => c.query(`insert into public.user_achievements (id, key, achieved_at) values ('first-workout', 'first-workout', now())`));
    await as(B, () => c.query(`insert into public.user_achievements (id, key, achieved_at) values ('first-workout', 'first-workout', now())`));
    await expect(as(A, () => c.query(`insert into public.user_achievements (id, key, achieved_at) values ('first-workout', 'first-workout', now())`))).rejects.toThrow(/duplicate key/);
  });

  it("constraints: max één actieve training, sets met geldige waarden", async () => {
    await as(A, () => c.query(`insert into public.workout_sessions (id, name, status, started_at) values ('a1', 'Nu', 'active', now())`));
    await expect(as(A, () => c.query(`insert into public.workout_sessions (id, name, status, started_at) values ('a2', 'Nog een', 'active', now())`))).rejects.toThrow(/one_active_session_per_user/);
    await as(A, () => c.query(`insert into public.workout_exercises (id, session_id, exercise_id, exercise_name, primary_muscle, metric_type, metrics) values ('we1', 's1', 'bench-press', 'Bankdrukken', 'chest', 'weight_reps', '{weight,reps}')`));
    await expect(as(A, () => c.query(`insert into public.workout_sets (id, session_id, workout_exercise_id, weight_kg, reps) values ('bad', 's1', 'we1', -5, 10)`))).rejects.toThrow(/check constraint/);
    await expect(as(A, () => c.query(`insert into public.workout_sets (id, session_id, workout_exercise_id, completed) values ('bad2', 's1', 'we1', true)`))).rejects.toThrow(/check constraint/);
  });
});

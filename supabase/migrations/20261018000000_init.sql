-- Gym Tracker: initieel schema
-- Ontwerp:
-- * Elke gebruikerstabel heeft (user_id, id) als primaire sleutel; id is tekst zodat
--   client-gegenereerde UUID's en deterministische sleutels (PR's, badges) passen.
-- * updated_at = laatste wijziging op het apparaat (last-write-wins bij sync);
--   server_updated_at = wordt door de server gezet en dient als sync-cursor.
-- * deleted_at = soft delete, zodat verwijderingen naar andere apparaten syncen.
-- * Row Level Security: een gebruiker ziet en wijzigt uitsluitend eigen rijen.
-- * Uitgevoerde trainingen (workout_exercises) bevatten een momentopname van de
--   oefening, zodat latere wijzigingen aan schema's/oefeningen de historie niet raken.

create extension if not exists pgcrypto;

-- ───────────────────────── Referentiedata (publiek leesbaar)

create table if not exists public.muscle_groups (
  id text primary key,
  name text not null,
  region text not null check (region in ('upper', 'core', 'lower'))
);

create table if not exists public.exercises (
  id text primary key,
  name text not null,
  image text,
  primary_muscle text not null references public.muscle_groups (id),
  equipment text not null,
  metric_type text not null check (metric_type in ('weight_reps', 'bodyweight_reps', 'assisted', 'time', 'distance', 'custom')),
  metrics text[] not null,
  mechanic text not null check (mechanic in ('compound', 'isolation')),
  pattern text not null,
  instructions text not null default '',
  default_rest integer not null default 90 check (default_rest between 0 and 1800),
  unilateral boolean not null default false
);

create table if not exists public.exercise_muscles (
  exercise_id text not null references public.exercises (id) on delete cascade,
  muscle_id text not null references public.muscle_groups (id),
  role text not null check (role in ('primary', 'secondary')),
  primary key (exercise_id, muscle_id)
);

alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
create policy "muscle_groups leesbaar" on public.muscle_groups for select using (true);
create policy "exercises leesbaar" on public.exercises for select using (true);
create policy "exercise_muscles leesbaar" on public.exercise_muscles for select using (true);

-- ───────────────────────── Hulpfunctie: server-tijdstempel

create or replace function public.touch_server_updated_at() returns trigger
language plpgsql as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end $$;

-- ───────────────────────── Gebruikersdata

create table if not exists public.user_settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null default 'me',
  display_name text not null default '',
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  weekly_workout_goal integer not null default 3 check (weekly_workout_goal between 1 and 14),
  set_count_method text not null default 'primary' check (set_count_method in ('primary', 'weighted')),
  include_bodyweight_volume boolean not null default false,
  default_rest integer not null default 90,
  auto_start_rest boolean not null default true,
  rest_notifications boolean not null default true,
  rest_sound boolean not null default true,
  favorite_exercises text[] not null default '{}',
  onboarded boolean not null default false,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.custom_exercises (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (length(name) between 1 and 80),
  image text,
  primary_muscle text not null references public.muscle_groups (id),
  secondary_muscles text[] not null default '{}',
  equipment text not null,
  metric_type text not null check (metric_type in ('weight_reps', 'bodyweight_reps', 'assisted', 'time', 'distance', 'custom')),
  metrics text[] not null,
  mechanic text not null,
  pattern text not null,
  instructions text not null default '',
  default_rest integer not null default 90,
  unilateral boolean not null default false,
  is_custom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.templates (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (length(name) between 1 and 80),
  description text not null default '',
  favorite boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.template_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  template_id text not null,
  name text not null,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, template_id) references public.templates (user_id, id) on delete cascade deferrable initially deferred
);

create table if not exists public.template_exercises (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  template_id text not null,
  template_day_id text not null,
  exercise_id text not null,
  position integer not null default 0,
  sets integer not null check (sets between 1 and 20),
  rep_min integer check (rep_min >= 0),
  rep_max integer check (rep_max >= 0),
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 1800),
  target_weight numeric(7, 2) check (target_weight >= 0),
  superset_group text,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, template_day_id) references public.template_days (user_id, id) on delete cascade deferrable initially deferred
);

create table if not exists public.workout_sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  template_id text,
  template_day_id text,
  status text not null check (status in ('active', 'completed', 'aborted')),
  started_at timestamptz not null,
  ended_at timestamptz,
  pauses jsonb not null default '[]',
  rest_periods jsonb not null default '[]',
  rest_timer jsonb,
  total_duration_sec integer check (total_duration_sec >= 0),
  active_duration_sec integer check (active_duration_sec >= 0),
  rest_duration_sec integer check (rest_duration_sec >= 0),
  notes text not null default '', -- WorkoutNote: notitie bij de volledige training
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  check (ended_at is null or ended_at >= started_at),
  check (status = 'active' or ended_at is not null)
);

create table if not exists public.workout_exercises (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  session_id text not null,
  exercise_id text not null,
  position integer not null default 0,
  exercise_name text not null,
  exercise_image text,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  metric_type text not null,
  metrics text[] not null,
  unilateral boolean not null default false,
  superset_group text,
  rest_seconds integer not null default 90,
  target_sets integer,
  rep_min integer,
  rep_max integer,
  target_weight numeric(7, 2),
  notes text not null default '', -- notitie bij de oefening binnen deze training
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, session_id) references public.workout_sessions (user_id, id) on delete cascade deferrable initially deferred
);

create table if not exists public.workout_sets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  session_id text not null,
  workout_exercise_id text not null,
  position integer not null default 0,
  set_type text not null default 'normal' check (set_type in ('warmup', 'normal', 'drop', 'failure')),
  weight_kg numeric(7, 2) check (weight_kg >= 0),
  reps integer check (reps >= 0),
  duration_sec integer check (duration_sec >= 0),
  distance_m numeric(10, 2) check (distance_m >= 0),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  rir integer check (rir between 0 and 10),
  completed boolean not null default false,
  completed_at timestamptz,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, workout_exercise_id) references public.workout_exercises (user_id, id) on delete cascade deferrable initially deferred,
  check (completed = false or completed_at is not null)
);

create table if not exists public.exercise_prs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null, -- exercise_id:type:session_id (deterministisch, voorkomt dubbele records)
  exercise_id text not null,
  type text not null check (type in ('max_weight', 'e1rm', 'max_set_volume', 'max_reps', 'max_duration', 'max_distance')),
  value numeric(12, 2) not null,
  previous_value numeric(12, 2),
  session_id text not null,
  set_id text,
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.muscle_group_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  muscle text not null references public.muscle_groups (id),
  sets_per_week integer not null check (sets_per_week between 1 and 60),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.exercise_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  exercise_id text not null,
  text text not null default '',
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_achievements (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null, -- badge-sleutel: uniek per gebruiker, dus nooit dubbel beloond
  key text not null,
  achieved_at timestamptz not null,
  session_id text,
  xp integer not null default 0,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.body_weight_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 400),
  note text not null default '',
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- ───────────────────────── Indexen

create index if not exists workout_sessions_user_started on public.workout_sessions (user_id, started_at desc);
create index if not exists workout_sessions_user_status on public.workout_sessions (user_id, status);
create index if not exists workout_exercises_user_session on public.workout_exercises (user_id, session_id);
create index if not exists workout_exercises_user_exercise on public.workout_exercises (user_id, exercise_id);
create index if not exists workout_sets_user_we on public.workout_sets (user_id, workout_exercise_id);
create index if not exists workout_sets_user_session on public.workout_sets (user_id, session_id);
create index if not exists template_days_user_template on public.template_days (user_id, template_id);
create index if not exists template_exercises_user_day on public.template_exercises (user_id, template_day_id);
create index if not exists exercise_prs_user_exercise on public.exercise_prs (user_id, exercise_id);
create index if not exists body_weight_user_date on public.body_weight_entries (user_id, date);
create unique index if not exists one_active_session_per_user on public.workout_sessions (user_id) where status = 'active' and deleted_at is null;

-- ───────────────────────── Triggers + RLS voor alle gebruikerstabellen

do $$
declare t text;
begin
  foreach t in array array[
    'user_settings', 'custom_exercises', 'templates', 'template_days', 'template_exercises',
    'workout_sessions', 'workout_exercises', 'workout_sets', 'exercise_prs',
    'muscle_group_goals', 'exercise_notes', 'user_achievements', 'body_weight_entries'
  ] loop
    execute format('create index if not exists %I on public.%I (user_id, server_updated_at)', t || '_sync', t);
    execute format('drop trigger if exists touch_%I on public.%I', t, t);
    execute format('create trigger touch_%I before insert or update on public.%I for each row execute function public.touch_server_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists "eigen rijen lezen" on public.%I', t);
    execute format('drop policy if exists "eigen rijen toevoegen" on public.%I', t);
    execute format('drop policy if exists "eigen rijen wijzigen" on public.%I', t);
    execute format('drop policy if exists "eigen rijen verwijderen" on public.%I', t);
    execute format('create policy "eigen rijen lezen" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "eigen rijen toevoegen" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "eigen rijen wijzigen" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "eigen rijen verwijderen" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

grant select on public.muscle_groups, public.exercises, public.exercise_muscles to anon, authenticated;

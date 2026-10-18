-- Persoonlijke dashboard-indeling: volgorde en verborgen blokken
alter table public.user_settings add column if not exists dashboard_order text[] not null default '{}';
alter table public.user_settings add column if not exists dashboard_hidden text[] not null default '{}';

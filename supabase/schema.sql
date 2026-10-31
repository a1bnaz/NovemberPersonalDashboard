-- November Build Log schema.
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run: tables use IF NOT EXISTS and policies are dropped first.

-- ---------------------------------------------------------------------------
-- days: one row per date
-- ---------------------------------------------------------------------------
create table if not exists public.days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  built      boolean not null default false,
  minutes    integer not null default 0 check (minutes >= 0),
  posted     boolean not null default false,
  post_note  text not null default '',
  notes      text not null default '',
  tasks      jsonb not null default '[]'::jsonb,   -- [{ "text": string, "done": bool }]
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- settings: one row per user
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  targets         jsonb not null default '{}'::jsonb,          -- { followers: {start,floor,target,stretch}, visits: {...} }
  milestones      jsonb not null default '{}'::jsonb,          -- { core: {done, on}, ... }
  updates_shipped integer not null default 0 check (updates_shipped >= 0),
  learned         jsonb not null default '["", "", ""]'::jsonb, -- string[3]
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- metric_logs: one value per metric per day (re-logging overwrites)
-- ---------------------------------------------------------------------------
create table if not exists public.metric_logs (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metric  text not null check (metric in ('followers', 'visits')),
  date    date not null,
  value   integer not null check (value >= 0),
  unique (user_id, metric, date)
);

-- ---------------------------------------------------------------------------
-- notes: free-form ideas
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default '',
  body       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx on public.notes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists days_touch on public.days;
create trigger days_touch before update on public.days
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: each user can only see and change their own rows
-- ---------------------------------------------------------------------------
alter table public.days        enable row level security;
alter table public.settings    enable row level security;
alter table public.metric_logs enable row level security;
alter table public.notes       enable row level security;

drop policy if exists "own rows" on public.days;
create policy "own rows" on public.days
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own rows" on public.settings;
create policy "own rows" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own rows" on public.metric_logs;
create policy "own rows" on public.metric_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own rows" on public.notes;
create policy "own rows" on public.notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

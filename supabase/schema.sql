-- Build The Body — initial schema + RLS
-- Run in Supabase SQL editor (Dashboard → SQL → New query)

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  type text,
  duration_minutes int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  weight_lbs numeric,
  body_fat_pct numeric,
  chest_in numeric,
  waist_in numeric,
  hips_in numeric,
  created_at timestamptz default now()
);

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  bedtime time,
  wake_time time,
  duration_hours numeric,
  quality int check (quality between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

alter table public.workouts enable row level security;
alter table public.measurements enable row level security;
alter table public.sleep_logs enable row level security;

create policy "workouts_select_own"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "workouts_insert_own"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "workouts_update_own"
  on public.workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workouts_delete_own"
  on public.workouts for delete
  using (auth.uid() = user_id);

create policy "measurements_select_own"
  on public.measurements for select
  using (auth.uid() = user_id);

create policy "measurements_insert_own"
  on public.measurements for insert
  with check (auth.uid() = user_id);

create policy "measurements_update_own"
  on public.measurements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "measurements_delete_own"
  on public.measurements for delete
  using (auth.uid() = user_id);

create policy "sleep_select_own"
  on public.sleep_logs for select
  using (auth.uid() = user_id);

create policy "sleep_insert_own"
  on public.sleep_logs for insert
  with check (auth.uid() = user_id);

create policy "sleep_update_own"
  on public.sleep_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sleep_delete_own"
  on public.sleep_logs for delete
  using (auth.uid() = user_id);

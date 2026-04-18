-- Build The Body — redesign migration (profiles, weekly plan, food, PRs, weight logs, summaries)
-- Run in Supabase SQL editor after 001 / schema.sql

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  weight_lbs numeric,
  calorie_goal int not null default 2500,
  protein_goal_g int not null default 140,
  sleep_goal_hours numeric not null default 9,
  onboarding_completed boolean not null default false,
  current_streak int not null default 0,
  best_streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- weekly_workout_plan
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_workout_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  muscle_group text,
  day_type text not null default 'workout' check (day_type in ('workout', 'active_rest', 'full_rest')),
  exercises jsonb not null default '[]'::jsonb,
  unique (user_id, day_of_week)
);

create index if not exists weekly_workout_plan_user_idx on public.weekly_workout_plan (user_id);

alter table public.weekly_workout_plan enable row level security;

create policy "wwp_select_own" on public.weekly_workout_plan for select using (auth.uid() = user_id);
create policy "wwp_insert_own" on public.weekly_workout_plan for insert with check (auth.uid() = user_id);
create policy "wwp_update_own" on public.weekly_workout_plan for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wwp_delete_own" on public.weekly_workout_plan for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- workout_logs (one row per user per calendar day)
-- ---------------------------------------------------------------------------
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  completed boolean not null default false,
  rest_type text,
  note text,
  exercises_done jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists workout_logs_user_date_idx on public.workout_logs (user_id, date desc);

alter table public.workout_logs enable row level security;

create policy "wl_select_own" on public.workout_logs for select using (auth.uid() = user_id);
create policy "wl_insert_own" on public.workout_logs for insert with check (auth.uid() = user_id);
create policy "wl_update_own" on public.workout_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wl_delete_own" on public.workout_logs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- food_logs
-- ---------------------------------------------------------------------------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  name text not null,
  calories int not null,
  protein_g numeric not null,
  logged_at timestamptz not null default now()
);

create index if not exists food_logs_user_date_idx on public.food_logs (user_id, date desc);

alter table public.food_logs enable row level security;

create policy "fl_select_own" on public.food_logs for select using (auth.uid() = user_id);
create policy "fl_insert_own" on public.food_logs for insert with check (auth.uid() = user_id);
create policy "fl_update_own" on public.food_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fl_delete_own" on public.food_logs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- personal_records
-- ---------------------------------------------------------------------------
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  weight_lbs numeric,
  reps int,
  notes text,
  achieved_at date not null,
  created_at timestamptz not null default now()
);

create index if not exists pr_user_ex_idx on public.personal_records (user_id, exercise_name);

alter table public.personal_records enable row level security;

create policy "pr_select_own" on public.personal_records for select using (auth.uid() = user_id);
create policy "pr_insert_own" on public.personal_records for insert with check (auth.uid() = user_id);
create policy "pr_update_own" on public.personal_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pr_delete_own" on public.personal_records for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weight_logs
-- ---------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_lbs numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, date desc);

alter table public.weight_logs enable row level security;

create policy "wtl_select_own" on public.weight_logs for select using (auth.uid() = user_id);
create policy "wtl_insert_own" on public.weight_logs for insert with check (auth.uid() = user_id);
create policy "wtl_update_own" on public.weight_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wtl_delete_own" on public.weight_logs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weekly_summaries
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  shown_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_summaries enable row level security;

create policy "ws_select_own" on public.weekly_summaries for select using (auth.uid() = user_id);
create policy "ws_insert_own" on public.weekly_summaries for insert with check (auth.uid() = user_id);
create policy "ws_update_own" on public.weekly_summaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ws_delete_own" on public.weekly_summaries for delete using (auth.uid() = user_id);

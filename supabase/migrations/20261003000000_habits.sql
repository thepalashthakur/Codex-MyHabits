create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  updated_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  color text,
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid,
  name text not null check (length(trim(name)) between 1 and 120),
  description text,
  type text not null check (type in ('GOOD','BAD')),
  tracking_type text not null check (tracking_type in ('BOOLEAN','MEASURABLE')),
  goal_value numeric(12,3) check (goal_value > 0),
  unit text,
  schedule_type text not null check (schedule_type in ('DAILY','WEEKDAYS','WEEKLY_TARGET','MONTHLY_TARGET','INTERVAL')),
  schedule_config jsonb not null default '{}'::jsonb,
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  color text,
  icon text,
  position integer not null default 0,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (area_id, user_id) references public.areas(id, user_id) on delete set null (area_id),
  check (tracking_type = 'BOOLEAN' or (goal_value is not null and unit is not null and length(trim(unit)) > 0))
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null check (status in ('COMPLETED','FAILED','SKIPPED')),
  value numeric(12,3) check (value is null or value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade,
  unique (habit_id, date)
);

create table public.habit_notes (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  content text not null check (length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade
);

create table public.habit_reminders (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  time time not null,
  timezone text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade
);

create index habits_user_active_idx on public.habits(user_id, is_archived, position);
create index logs_user_date_idx on public.habit_logs(user_id, date);
create index logs_habit_date_idx on public.habit_logs(habit_id, date);
create index notes_habit_idx on public.habit_notes(habit_id, created_at desc);
create index areas_user_idx on public.areas(user_id, position);
create index reminders_user_idx on public.habit_reminders(user_id, habit_id);

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.habit_notes enable row level security;
alter table public.habit_reminders enable row level security;

create policy profiles_own on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy areas_own on public.areas for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy habits_own on public.habits for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy logs_own on public.habit_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy notes_own on public.habit_notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reminders_own on public.habit_reminders for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Add V2 planning without rewriting existing habits or logs.
alter table public.tracker_habits
  add column time_of_day text not null default 'ANYTIME' check (time_of_day in ('MORNING','AFTERNOON','EVENING','ANYTIME')),
  add column priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH')),
  add column difficulty text check (difficulty in ('EASY','MODERATE','HARD')),
  add column quick_increments numeric(12,3)[],
  add column minimum_goal_value numeric(12,3),
  add column stretch_goal_value numeric(12,3),
  add constraint tracker_habits_goal_tiers check (
    (minimum_goal_value is null or (minimum_goal_value > 0 and goal_value is not null and minimum_goal_value <= goal_value))
    and (stretch_goal_value is null or (stretch_goal_value > 0 and goal_value is not null and goal_value <= stretch_goal_value))
  ),
  add constraint tracker_habits_increments_positive check (
    quick_increments is null or (array_length(quick_increments, 1) between 1 and 5 and array_position(quick_increments, null) is null and 0 < all(quick_increments))
  );

alter table public.tracker_habit_logs add column reason text check (reason is null or length(reason) <= 120);

create extension if not exists btree_gist;
create table public.tracker_habit_pauses (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date,
  reason text check (reason is null or length(reason) <= 80),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.tracker_habits(id, user_id) on delete cascade,
  check (end_date is null or end_date >= start_date),
  exclude using gist (habit_id with =, daterange(start_date, coalesce(end_date, 'infinity'::date), '[]') with &&)
);
create index tracker_pauses_user_habit_idx on public.tracker_habit_pauses(user_id, habit_id, start_date);
alter table public.tracker_habit_pauses enable row level security;
create policy pauses_own on public.tracker_habit_pauses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.tracker_habit_pauses to authenticated;

create table public.tracker_habit_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_habit_id uuid not null,
  target_habit_id uuid not null,
  type text not null default 'AFTER' check (type = 'AFTER'),
  created_at timestamptz not null default now(),
  foreign key (source_habit_id, user_id) references public.tracker_habits(id, user_id) on delete cascade,
  foreign key (target_habit_id, user_id) references public.tracker_habits(id, user_id) on delete cascade,
  unique (source_habit_id, target_habit_id, type),
  check (source_habit_id <> target_habit_id)
);
create index tracker_relationships_user_target_idx on public.tracker_habit_relationships(user_id, target_habit_id);
alter table public.tracker_habit_relationships enable row level security;
create policy relationships_own on public.tracker_habit_relationships for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, delete on public.tracker_habit_relationships to authenticated;

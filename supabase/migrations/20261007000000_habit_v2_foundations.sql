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

-- New edits keep planning context as it stood on the effective date.
alter table public.tracker_habit_schedule_versions
  add column name text,
  add column area_id uuid,
  add column time_of_day text not null default 'ANYTIME',
  add column priority text not null default 'NORMAL',
  add column difficulty text,
  add column minimum_goal_value numeric(12,3),
  add column stretch_goal_value numeric(12,3);
update public.tracker_habit_schedule_versions v set
  name = h.name, area_id = h.area_id, time_of_day = h.time_of_day,
  priority = h.priority, difficulty = h.difficulty,
  minimum_goal_value = h.minimum_goal_value, stretch_goal_value = h.stretch_goal_value
from public.tracker_habits h where v.habit_id = h.id;

create or replace function public.tracker_record_habit_schedule_version() returns trigger
language plpgsql security definer set search_path = public as $$
declare local_today date;
begin
  if tg_op = 'UPDATE' then
    if row(new.name, new.area_id, new.type, new.tracking_type, new.goal_value, new.unit, new.schedule_type, new.schedule_config, new.start_date, new.end_date, new.is_archived, new.time_of_day, new.priority, new.difficulty, new.minimum_goal_value, new.stretch_goal_value)
      is not distinct from row(old.name, old.area_id, old.type, old.tracking_type, old.goal_value, old.unit, old.schedule_type, old.schedule_config, old.start_date, old.end_date, old.is_archived, old.time_of_day, old.priority, old.difficulty, old.minimum_goal_value, old.stretch_goal_value) then
      return new;
    end if;
  end if;
  select (now() at time zone coalesce((select timezone from public.tracker_profiles where user_id = new.user_id), 'UTC'))::date into local_today;
  insert into public.tracker_habit_schedule_versions(habit_id, user_id, effective_date, name, area_id, type, tracking_type, goal_value, unit, schedule_type, schedule_config, start_date, end_date, is_archived, time_of_day, priority, difficulty, minimum_goal_value, stretch_goal_value)
  values (new.id, new.user_id, case when tg_op = 'INSERT' then new.start_date else local_today end, new.name, new.area_id, new.type, new.tracking_type, new.goal_value, new.unit, new.schedule_type, new.schedule_config, new.start_date, new.end_date, new.is_archived, new.time_of_day, new.priority, new.difficulty, new.minimum_goal_value, new.stretch_goal_value)
  on conflict (habit_id, effective_date) do update set
    name=excluded.name, area_id=excluded.area_id, type=excluded.type,
    tracking_type=excluded.tracking_type, goal_value=excluded.goal_value, unit=excluded.unit,
    schedule_type=excluded.schedule_type, schedule_config=excluded.schedule_config,
    start_date=excluded.start_date, end_date=excluded.end_date, is_archived=excluded.is_archived,
    time_of_day=excluded.time_of_day, priority=excluded.priority, difficulty=excluded.difficulty,
    minimum_goal_value=excluded.minimum_goal_value, stretch_goal_value=excluded.stretch_goal_value;
  return new;
end $$;

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

create function public.tracker_prevent_relationship_cycle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Serialize graph edits for one user so concurrent inserts cannot form a cycle.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if exists (
    with recursive descendants(id) as (
      select new.target_habit_id
      union
      select r.target_habit_id from public.tracker_habit_relationships r
      join descendants d on r.source_habit_id = d.id
      where r.user_id = new.user_id
    )
    select 1 from descendants where id = new.source_habit_id
  ) then
    raise exception 'Habit relationship would create a cycle' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger tracker_relationship_cycle before insert on public.tracker_habit_relationships
for each row execute function public.tracker_prevent_relationship_cycle();

create function public.tracker_reorder_habits(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); group_name text; provided_count integer;
begin
  provided_count := cardinality(p_ids);
  if owner_id is null or provided_count < 1 or provided_count > 500 then
    raise exception 'Invalid habit order' using errcode = '22023';
  end if;
  select time_of_day into group_name from public.tracker_habits
    where id = p_ids[1] and user_id = owner_id and not is_archived;
  if group_name is null
     or (select count(distinct selected.id) from unnest(p_ids) as selected(id)) <> provided_count
     or (select count(*) from public.tracker_habits where user_id = owner_id and not is_archived and time_of_day = group_name) <> provided_count
     or (select count(*) from public.tracker_habits where user_id = owner_id and not is_archived and time_of_day = group_name and id = any(p_ids)) <> provided_count then
    raise exception 'Habit order must include exactly one active time-of-day group' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(owner_id::text || group_name));
  update public.tracker_habits h set position = ordered.ordinality::integer - 1, updated_at = now()
  from unnest(p_ids) with ordinality as ordered(id, ordinality)
  where h.id = ordered.id and h.user_id = owner_id;
end $$;
revoke all on function public.tracker_reorder_habits(uuid[]) from public;
grant execute on function public.tracker_reorder_habits(uuid[]) to authenticated;

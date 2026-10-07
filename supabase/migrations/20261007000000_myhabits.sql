-- MyHabits complete schema. Run this one file in Supabase SQL Editor.
-- It installs missing phases and preserves existing tracker data.
-- All phases run in one transaction; a failure rolls back this invocation.
begin;

-- Base habit tables
do $myhabits_install$
begin
  if to_regclass('public.tracker_profiles') is null then
    execute $myhabits_phase_1$
-- Dedicated tracker tables share auth.users with UseAuth without altering other apps' tables.
create table public.tracker_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  updated_at timestamptz not null default now()
);

create table public.tracker_areas (
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

create table public.tracker_habits (
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
  foreign key (area_id, user_id) references public.tracker_areas(id, user_id) on delete set null (area_id),
  check (tracking_type = 'BOOLEAN' or (goal_value is not null and unit is not null and length(trim(unit)) > 0))
);

create table public.tracker_habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null check (status in ('COMPLETED','FAILED','SKIPPED')),
  value numeric(12,3) check (value is null or value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.tracker_habits(id, user_id) on delete cascade,
  unique (habit_id, date)
);

create table public.tracker_habit_notes (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  content text not null check (length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.tracker_habits(id, user_id) on delete cascade
);

create table public.tracker_habit_reminders (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  time time not null,
  timezone text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.tracker_habits(id, user_id) on delete cascade
);

create index tracker_habits_user_active_idx on public.tracker_habits(user_id, is_archived, position);
create index tracker_logs_user_date_idx on public.tracker_habit_logs(user_id, date);
create index tracker_logs_habit_date_idx on public.tracker_habit_logs(habit_id, date);
create index tracker_notes_habit_idx on public.tracker_habit_notes(habit_id, created_at desc);
create index tracker_areas_user_idx on public.tracker_areas(user_id, position);
create index tracker_reminders_user_idx on public.tracker_habit_reminders(user_id, habit_id);

alter table public.tracker_profiles enable row level security;
alter table public.tracker_areas enable row level security;
alter table public.tracker_habits enable row level security;
alter table public.tracker_habit_logs enable row level security;
alter table public.tracker_habit_notes enable row level security;
alter table public.tracker_habit_reminders enable row level security;

create policy profiles_own on public.tracker_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy areas_own on public.tracker_areas for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy habits_own on public.tracker_habits for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy logs_own on public.tracker_habit_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy notes_own on public.tracker_habit_notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reminders_own on public.tracker_habit_reminders for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tracker_profiles, public.tracker_areas, public.tracker_habits, public.tracker_habit_logs, public.tracker_habit_notes, public.tracker_habit_reminders to authenticated;
$myhabits_phase_1$;
  end if;
end $myhabits_install$;

-- Dated habit schedule history
do $myhabits_install$
begin
  if to_regclass('public.tracker_habit_schedule_versions') is null then
    execute $myhabits_phase_2$
alter table public.tracker_habits add column archived_date date;

create table public.tracker_habit_schedule_versions (
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_date date not null,
  type text not null,
  tracking_type text not null,
  goal_value numeric(12,3),
  unit text,
  schedule_type text not null,
  schedule_config jsonb not null,
  start_date date not null,
  end_date date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (habit_id, effective_date),
  foreign key (habit_id, user_id) references public.tracker_habits(id, user_id) on delete cascade
);
create index tracker_schedule_versions_user_idx on public.tracker_habit_schedule_versions(user_id, habit_id, effective_date desc);
alter table public.tracker_habit_schedule_versions enable row level security;
create policy schedule_versions_own on public.tracker_habit_schedule_versions for select to authenticated using ((select auth.uid()) = user_id);

create function public.tracker_record_habit_schedule_version() returns trigger language plpgsql security definer set search_path = public as $$
declare local_today date;
begin
  if tg_op = 'UPDATE' then
    if row(new.type, new.tracking_type, new.goal_value, new.unit, new.schedule_type, new.schedule_config, new.start_date, new.end_date, new.is_archived)
      is not distinct from row(old.type, old.tracking_type, old.goal_value, old.unit, old.schedule_type, old.schedule_config, old.start_date, old.end_date, old.is_archived) then
      return new;
    end if;
  end if;
  select (now() at time zone coalesce((select timezone from public.tracker_profiles where user_id = new.user_id), 'UTC'))::date into local_today;
  insert into public.tracker_habit_schedule_versions(habit_id, user_id, effective_date, type, tracking_type, goal_value, unit, schedule_type, schedule_config, start_date, end_date, is_archived)
  values (new.id, new.user_id, case when tg_op = 'INSERT' then new.start_date else local_today end, new.type, new.tracking_type, new.goal_value, new.unit, new.schedule_type, new.schedule_config, new.start_date, new.end_date, new.is_archived)
  on conflict (habit_id, effective_date) do update set type=excluded.type, tracking_type=excluded.tracking_type, goal_value=excluded.goal_value, unit=excluded.unit, schedule_type=excluded.schedule_type, schedule_config=excluded.schedule_config, start_date=excluded.start_date, end_date=excluded.end_date, is_archived=excluded.is_archived;
  return new;
end $$;
create trigger tracker_habits_schedule_version after insert or update on public.tracker_habits for each row execute function public.tracker_record_habit_schedule_version();

insert into public.tracker_habit_schedule_versions(habit_id,user_id,effective_date,type,tracking_type,goal_value,unit,schedule_type,schedule_config,start_date,end_date,is_archived)
select id,user_id,start_date,type,tracking_type,goal_value,unit,schedule_type,schedule_config,start_date,end_date,is_archived from public.tracker_habits
on conflict do nothing;

grant select on public.tracker_habit_schedule_versions to authenticated;
$myhabits_phase_2$;
  end if;
end $myhabits_install$;

-- V2 habit planning and import
do $myhabits_install$
begin
  if to_regprocedure('public.tracker_import_v2(jsonb,text)') is null then
    execute $myhabits_phase_3$
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
  check (end_date is null or end_date >= start_date)
);
create index tracker_pauses_user_habit_idx on public.tracker_habit_pauses(user_id, habit_id, start_date);
create function public.tracker_habit_pause_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.habit_id::text));
  if exists (
    select 1 from public.tracker_habit_pauses pause
    where pause.habit_id = new.habit_id and pause.id <> new.id
      and daterange(pause.start_date,coalesce(pause.end_date,'infinity'::date),'[]')
        && daterange(new.start_date,coalesce(new.end_date,'infinity'::date),'[]')
  ) then
    raise exception 'Habit pause periods cannot overlap' using errcode = '23P01';
  end if;
  return new;
end $$;
create trigger tracker_habit_pause_guard before insert or update of habit_id,start_date,end_date
on public.tracker_habit_pauses for each row execute function public.tracker_habit_pause_guard();
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

create function public.tracker_import_v2(p_data jsonb, p_mode text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid := auth.uid(); item jsonb; old_id text; new_id uuid; mapped_id uuid;
  area_map jsonb := '{}'::jsonb; habit_map jsonb := '{}'::jsonb; versioned jsonb := '{}'::jsonb;
  existing_id uuid; inserted_habits integer := 0; skipped_habits integer := 0; inserted_areas integer := 0;
begin
  if owner_id is null or p_mode is null or p_mode not in ('skip', 'copy') or p_data->>'format' is distinct from 'myhabits-v2' or p_data->>'version' is distinct from '2'
     or jsonb_typeof(p_data->'areas') is distinct from 'array' or jsonb_typeof(p_data->'habits') is distinct from 'array'
     or jsonb_typeof(p_data->'logs') is distinct from 'array' or jsonb_typeof(p_data->'notes') is distinct from 'array'
     or jsonb_typeof(p_data->'reminders') is distinct from 'array' or jsonb_typeof(p_data->'pauses') is distinct from 'array'
     or jsonb_typeof(p_data->'relationships') is distinct from 'array' or jsonb_typeof(p_data->'versions') is distinct from 'array'
     or jsonb_array_length(p_data->'areas') > 1000 or jsonb_array_length(p_data->'habits') > 5000
     or jsonb_array_length(p_data->'logs') > 100000 or jsonb_array_length(p_data->'notes') > 50000
     or jsonb_array_length(p_data->'reminders') > 5000 or jsonb_array_length(p_data->'pauses') > 10000
     or jsonb_array_length(p_data->'relationships') > 10000 or jsonb_array_length(p_data->'versions') > 50000 then
    raise exception 'Invalid MyHabits import' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(owner_id::text));
  for item in select * from jsonb_array_elements(p_data->'areas') loop
    old_id := item->>'id';
    existing_id := null;
    select id into existing_id from public.tracker_areas where user_id = owner_id and lower(name) = lower(item->>'name') limit 1;
    if existing_id is not null and p_mode = 'skip' then
      area_map := jsonb_set(area_map, array[old_id], to_jsonb(existing_id::text));
      continue;
    end if;
    insert into public.tracker_areas(user_id,name,color,icon,position)
      values(owner_id,item->>'name',item->>'color',item->>'icon',coalesce((item->>'position')::integer,0)) returning id into new_id;
    area_map := jsonb_set(area_map, array[old_id], to_jsonb(new_id::text));
    inserted_areas := inserted_areas + 1;
  end loop;
  for item in select * from jsonb_array_elements(p_data->'habits') loop
    old_id := item->>'id';
    existing_id := null;
    select id into existing_id from public.tracker_habits where user_id = owner_id and lower(name) = lower(item->>'name') limit 1;
    if existing_id is not null and p_mode = 'skip' then
      skipped_habits := skipped_habits + 1;
      continue;
    end if;
    mapped_id := nullif(area_map->>(item->>'area_id'), '')::uuid;
    insert into public.tracker_habits(user_id,area_id,name,description,type,tracking_type,goal_value,unit,schedule_type,schedule_config,start_date,end_date,color,icon,position,is_archived,archived_at,archived_date,time_of_day,priority,difficulty,quick_increments,minimum_goal_value,stretch_goal_value)
      values(owner_id,mapped_id,item->>'name',item->>'description',item->>'type',item->>'tracking_type',nullif(item->>'goal_value','')::numeric,item->>'unit',item->>'schedule_type',item->'schedule_config',(item->>'start_date')::date,nullif(item->>'end_date','')::date,item->>'color',item->>'icon',coalesce((item->>'position')::integer,0),coalesce((item->>'is_archived')::boolean,false),case when coalesce((item->>'is_archived')::boolean,false) then now() else null end,nullif(item->>'archived_date','')::date,coalesce(item->>'time_of_day','ANYTIME'),coalesce(item->>'priority','NORMAL'),item->>'difficulty',case when jsonb_typeof(item->'quick_increments') = 'array' then array(select jsonb_array_elements_text(item->'quick_increments')::numeric) else null end,nullif(item->>'minimum_goal_value','')::numeric,nullif(item->>'stretch_goal_value','')::numeric)
      returning id into new_id;
    habit_map := jsonb_set(habit_map, array[old_id], to_jsonb(new_id::text));
    inserted_habits := inserted_habits + 1;
  end loop;
  for item in select * from jsonb_array_elements(p_data->'versions') order by value->>'effective_date' loop
    old_id := item->>'habit_id';
    mapped_id := nullif(habit_map->>old_id,'')::uuid;
    if mapped_id is null then continue; end if;
    if not versioned ? old_id then
      delete from public.tracker_habit_schedule_versions where habit_id = mapped_id and user_id = owner_id;
      versioned := jsonb_set(versioned, array[old_id], 'true'::jsonb);
    end if;
    insert into public.tracker_habit_schedule_versions(habit_id,user_id,effective_date,name,area_id,type,tracking_type,goal_value,unit,schedule_type,schedule_config,start_date,end_date,is_archived,time_of_day,priority,difficulty,minimum_goal_value,stretch_goal_value)
      values(mapped_id,owner_id,(item->>'effective_date')::date,item->>'name',nullif(area_map->>(item->>'area_id'),'')::uuid,item->>'type',item->>'tracking_type',nullif(item->>'goal_value','')::numeric,item->>'unit',item->>'schedule_type',item->'schedule_config',(item->>'start_date')::date,nullif(item->>'end_date','')::date,(item->>'is_archived')::boolean,coalesce(item->>'time_of_day','ANYTIME'),coalesce(item->>'priority','NORMAL'),item->>'difficulty',nullif(item->>'minimum_goal_value','')::numeric,nullif(item->>'stretch_goal_value','')::numeric);
  end loop;
  for item in select * from jsonb_array_elements(p_data->'logs') loop
    mapped_id := nullif(habit_map->>(item->>'habit_id'),'')::uuid;
    if mapped_id is null then continue; end if;
    insert into public.tracker_habit_logs(habit_id,user_id,date,status,value,reason)
      values(mapped_id,owner_id,(item->>'date')::date,item->>'status',nullif(item->>'value','')::numeric,item->>'reason');
  end loop;
  for item in select * from jsonb_array_elements(p_data->'notes') loop
    mapped_id := nullif(habit_map->>(item->>'habit_id'),'')::uuid;
    if mapped_id is null then continue; end if;
    insert into public.tracker_habit_notes(habit_id,user_id,date,content)
      values(mapped_id,owner_id,nullif(item->>'date','')::date,item->>'content');
  end loop;
  for item in select * from jsonb_array_elements(p_data->'reminders') loop
    mapped_id := nullif(habit_map->>(item->>'habit_id'),'')::uuid;
    if mapped_id is null then continue; end if;
    insert into public.tracker_habit_reminders(habit_id,user_id,time,timezone,enabled)
      values(mapped_id,owner_id,(item->>'time')::time,item->>'timezone',(item->>'enabled')::boolean);
  end loop;
  for item in select * from jsonb_array_elements(p_data->'pauses') loop
    mapped_id := nullif(habit_map->>(item->>'habit_id'),'')::uuid;
    if mapped_id is null then continue; end if;
    insert into public.tracker_habit_pauses(habit_id,user_id,start_date,end_date,reason,note)
      values(mapped_id,owner_id,(item->>'start_date')::date,nullif(item->>'end_date','')::date,item->>'reason',item->>'note');
  end loop;
  for item in select * from jsonb_array_elements(p_data->'relationships') loop
    mapped_id := nullif(habit_map->>(item->>'source_habit_id'),'')::uuid;
    new_id := nullif(habit_map->>(item->>'target_habit_id'),'')::uuid;
    if mapped_id is null or new_id is null then continue; end if;
    insert into public.tracker_habit_relationships(user_id,source_habit_id,target_habit_id,type)
      values(owner_id,mapped_id,new_id,'AFTER');
  end loop;
  return jsonb_build_object('areasCreated',inserted_areas,'habitsCreated',inserted_habits,'habitsSkipped',skipped_habits);
end $$;
revoke all on function public.tracker_import_v2(jsonb,text) from public;
grant execute on function public.tracker_import_v2(jsonb,text) to authenticated;
$myhabits_phase_3$;
  end if;
end $myhabits_install$;

-- Nested routines and execution history
do $myhabits_install$
begin
  if to_regprocedure('public.tracker_close_routine_occurrences()') is null then
    execute $myhabits_phase_4$
-- Routine definitions are distinct from dated, immutable execution snapshots.
do $$ begin
  if to_regclass('public.tracker_habit_pauses') is null then
    raise exception 'The V2 habit schema must be installed before routines';
  end if;
end $$;

create table if not exists public.tracker_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text,
  timezone text not null,
  rule jsonb not null,
  preferred_start_time time,
  planned_offset_days integer not null default 0 check (planned_offset_days between -365 and 365),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  is_paused boolean not null default false,
  paused_from date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (not is_paused or paused_from is not null)
);
create index if not exists tracker_routines_user_active_idx on public.tracker_routines(user_id, is_archived, start_date);

create table public.tracker_routine_pauses (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null,
  user_id uuid not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  foreign key (routine_id,user_id) references public.tracker_routines(id,user_id) on delete cascade,
  check (end_date is null or end_date >= start_date)
);
create index tracker_routine_pauses_user_idx on public.tracker_routine_pauses(user_id,routine_id,start_date);

-- Supabase can install btree_gist outside the SQL Editor's search_path. Guard
-- overlaps transactionally without depending on the UUID GiST operator class.
create function public.tracker_routine_pause_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.routine_id::text));
  if exists (
    select 1 from public.tracker_routine_pauses pause
    where pause.routine_id = new.routine_id and pause.id <> new.id
      and daterange(pause.start_date,coalesce(pause.end_date,'infinity'::date),'[]')
        && daterange(new.start_date,coalesce(new.end_date,'infinity'::date),'[]')
  ) then
    raise exception 'Routine pause periods cannot overlap' using errcode = '23P01';
  end if;
  return new;
end $$;
create trigger tracker_routine_pause_guard before insert or update of routine_id,start_date,end_date
on public.tracker_routine_pauses for each row execute function public.tracker_routine_pause_guard();

create table public.tracker_routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null,
  user_id uuid not null,
  parent_id uuid,
  position integer not null default 0,
  type text not null check (type in ('GROUP','TASK','HABIT_REF')),
  title text not null check (length(trim(title)) between 1 and 120),
  instructions text check (instructions is null or length(instructions) <= 2000),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  required boolean not null default true,
  frequency_rule jsonb,
  reference_provider text check (reference_provider is null or reference_provider = 'HABIT'),
  reference_id uuid,
  reference_key text check (reference_key is null or length(reference_key) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, routine_id, user_id),
  foreign key (routine_id, user_id) references public.tracker_routines(id, user_id) on delete cascade,
  foreign key (parent_id, routine_id, user_id) references public.tracker_routine_items(id, routine_id, user_id) on delete cascade deferrable initially deferred,
  foreign key (reference_id, user_id) references public.tracker_habits(id, user_id) on delete cascade,
  check ((type = 'HABIT_REF' and reference_provider = 'HABIT' and reference_id is not null and reference_key is not null and reference_key = reference_id::text)
    or (type <> 'HABIT_REF' and reference_provider is null and reference_id is null and reference_key is null)),
  check (parent_id is distinct from id)
);
create index tracker_routine_items_order_idx on public.tracker_routine_items(user_id, routine_id, parent_id, position);

create table public.tracker_routine_occurrences (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null,
  user_id uuid not null,
  scheduled_date date not null,
  planned_date date not null,
  planned_time time,
  timezone text not null,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED','IN_PROGRESS','COMPLETED','PARTIAL','SKIPPED','MISSED')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (routine_id, scheduled_date),
  unique (id, user_id),
  foreign key (routine_id, user_id) references public.tracker_routines(id, user_id) on delete cascade
);
create index tracker_routine_occurrences_user_date_idx on public.tracker_routine_occurrences(user_id, planned_date);

create table public.tracker_routine_item_occurrences (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null,
  user_id uuid not null,
  source_item_id uuid,
  parent_item_occurrence_id uuid,
  position integer not null,
  type text not null check (type in ('GROUP','TASK','HABIT_REF')),
  title text not null,
  instructions text,
  estimated_minutes integer,
  required boolean not null,
  reference_provider text,
  reference_id uuid,
  reference_key text,
  habit_tracking_type text,
  habit_goal_value numeric(12,3),
  status text not null default 'PENDING' check (status in ('PENDING','DONE','SKIPPED')),
  completed_at timestamptz,
  skipped_at timestamptz,
  habit_log_id uuid references public.tracker_habit_logs(id) on delete set null,
  previous_habit_value numeric(12,3),
  previous_habit_status text,
  previous_habit_reason text,
  applied_habit_value numeric(12,3),
  applied_habit_updated_at timestamptz,
  created_habit_log boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, occurrence_id, user_id),
  unique (occurrence_id, source_item_id),
  foreign key (occurrence_id, user_id) references public.tracker_routine_occurrences(id, user_id) on delete cascade,
  foreign key (source_item_id) references public.tracker_routine_items(id) on delete set null,
  foreign key (parent_item_occurrence_id, occurrence_id, user_id) references public.tracker_routine_item_occurrences(id, occurrence_id, user_id) on delete cascade deferrable initially deferred
);
create index tracker_routine_item_occurrences_order_idx on public.tracker_routine_item_occurrences(user_id, occurrence_id, parent_item_occurrence_id, position);
alter table public.tracker_habit_logs add column origin_routine_item_occurrence_id uuid references public.tracker_routine_item_occurrences(id) on delete set null;
create unique index tracker_logs_routine_origin_idx on public.tracker_habit_logs(origin_routine_item_occurrence_id) where origin_routine_item_occurrence_id is not null;

create function public.tracker_routine_item_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is not null then
    if not exists (select 1 from public.tracker_routine_items where id = new.parent_id and routine_id = new.routine_id and user_id = new.user_id and type = 'GROUP') then
      raise exception 'Parent must be a group in this routine' using errcode = '23514';
    end if;
    if exists (
      with recursive parents(id, parent_id) as (
        select id, parent_id from public.tracker_routine_items where id = new.parent_id
        union
        select p.id, p.parent_id from public.tracker_routine_items p join parents x on p.id = x.parent_id
      ) select 1 from parents where id = new.id
    ) then raise exception 'Routine items cannot contain a cycle' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger tracker_routine_item_guard before insert or update of parent_id, routine_id on public.tracker_routine_items
for each row execute function public.tracker_routine_item_guard();

alter table public.tracker_routines enable row level security;
alter table public.tracker_routine_pauses enable row level security;
alter table public.tracker_routine_items enable row level security;
alter table public.tracker_routine_occurrences enable row level security;
alter table public.tracker_routine_item_occurrences enable row level security;
create policy routines_own on public.tracker_routines for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routine_pauses_own on public.tracker_routine_pauses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routine_items_own on public.tracker_routine_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routine_occurrences_own on public.tracker_routine_occurrences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routine_item_occurrences_own on public.tracker_routine_item_occurrences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select on public.tracker_routines, public.tracker_routine_pauses, public.tracker_routine_items, public.tracker_routine_occurrences, public.tracker_routine_item_occurrences to authenticated;

-- The caller supplies a validated applicable tree in parent-first order. The unique
-- routine/date key and transaction make concurrent materialization idempotent.
create function public.tracker_routine_rule_matches(p_rule jsonb, p_date date, p_anchor date) returns boolean
language plpgsql immutable as $$
declare kind text := p_rule->>'type'; day_num integer := extract(day from p_date);
  month_end integer := extract(day from (date_trunc('month',p_date::timestamp) + interval '1 month - 1 day')::date);
begin
  if p_date < p_anchor then return false; end if;
  if kind = 'DAILY' then return true; end if;
  if kind = 'WEEKDAYS' then return coalesce(p_rule->'weekdays' @> to_jsonb(extract(dow from p_date)::integer),false); end if;
  if kind = 'INTERVAL_DAYS' then return (p_date - p_anchor) % greatest(1,(p_rule->>'interval')::integer) = 0; end if;
  if kind = 'INTERVAL_WEEKS' then return (p_date - p_anchor) % (greatest(1,(p_rule->>'interval')::integer) * 7) = 0; end if;
  if kind = 'MONTH_DATES' then
    return exists (select 1 from jsonb_array_elements_text(p_rule->'dates') as selected(value)
      where selected.value::integer = day_num or (p_rule->>'missing' = 'LAST_DAY' and selected.value::integer > month_end and day_num = month_end));
  end if;
  return false;
end $$;
revoke all on function public.tracker_routine_rule_matches(jsonb,date,date) from public;

create function public.tracker_materialize_routine(p_routine_id uuid, p_date date, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); r public.tracker_routines%rowtype; occurrence_id uuid; created boolean := false;
  item jsonb; item_id uuid; parent_occurrence_id uuid; item_map jsonb := '{}'::jsonb;
begin
  if owner_id is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'Invalid routine occurrence' using errcode = '22023';
  end if;
  select * into r from public.tracker_routines where id = p_routine_id and user_id = owner_id for share;
  if not found or r.is_archived or not public.tracker_routine_rule_matches(r.rule,p_date,r.start_date)
    or (r.end_date is not null and p_date > r.end_date)
    or (r.is_paused and p_date + r.planned_offset_days >= r.paused_from)
    or exists (select 1 from public.tracker_routine_pauses where routine_id = r.id and user_id = owner_id and start_date <= p_date + r.planned_offset_days and (end_date is null or end_date >= p_date + r.planned_offset_days)) then
    raise exception 'Routine is not scheduled for this date' using errcode = '22023';
  end if;
  insert into public.tracker_routine_occurrences(routine_id,user_id,scheduled_date,planned_date,planned_time,timezone)
    values(r.id,owner_id,p_date,p_date + r.planned_offset_days,r.preferred_start_time,r.timezone)
    on conflict (routine_id,scheduled_date) do nothing returning id into occurrence_id;
  created := occurrence_id is not null;
  if not created then
    select id into occurrence_id from public.tracker_routine_occurrences where routine_id = r.id and scheduled_date = p_date and user_id = owner_id;
    return occurrence_id;
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if not exists (select 1 from public.tracker_routine_items where id = (item->>'id')::uuid and routine_id = r.id and user_id = owner_id) then
      raise exception 'Routine item does not belong to routine' using errcode = '22023';
    end if;
    parent_occurrence_id := nullif(item_map->>(item->>'parent_id'),'')::uuid;
    if item->>'parent_id' is not null and parent_occurrence_id is null then
      raise exception 'Routine item parent is missing' using errcode = '22023';
    end if;
    insert into public.tracker_routine_item_occurrences(occurrence_id,user_id,source_item_id,parent_item_occurrence_id,position,type,title,instructions,estimated_minutes,required,reference_provider,reference_id,reference_key,habit_tracking_type,habit_goal_value)
      select occurrence_id,owner_id,i.id,parent_occurrence_id,i.position,i.type,i.title,i.instructions,i.estimated_minutes,i.required,i.reference_provider,i.reference_id,
        i.reference_key,
        case when v.habit_id is not null then v.tracking_type else h.tracking_type end,
        case when v.habit_id is not null then v.goal_value else h.goal_value end
      from public.tracker_routine_items i
      left join public.tracker_habits h on h.id = i.reference_id and h.user_id = owner_id
      left join lateral (select habit_id,tracking_type,goal_value from public.tracker_habit_schedule_versions where habit_id = h.id and user_id = owner_id and effective_date <= (p_date + r.planned_offset_days) order by effective_date desc limit 1) v on true
      where i.id = (item->>'id')::uuid and i.routine_id = r.id and i.user_id = owner_id
      returning id into item_id;
    item_map := jsonb_set(item_map,array[item->>'id'],to_jsonb(item_id::text));
  end loop;
  return occurrence_id;
end $$;
revoke all on function public.tracker_materialize_routine(uuid,date,jsonb) from public;
grant execute on function public.tracker_materialize_routine(uuid,date,jsonb) to authenticated;

-- Replaces the definition atomically. Started and historical occurrence snapshots remain.
create function public.tracker_save_routine(p_id uuid, p_routine jsonb, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); r public.tracker_routines%rowtype; item jsonb; local_today date;
begin
  if owner_id is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'Invalid routine' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(owner_id::text || p_id::text));
  select * into r from public.tracker_routines where id = p_id and user_id = owner_id for update;
  if found then
    update public.tracker_routines set name = p_routine->>'name', description = p_routine->>'description',
      timezone = p_routine->>'timezone', rule = p_routine->'rule', preferred_start_time = nullif(p_routine->>'preferred_start_time','')::time,
      start_date = (p_routine->>'start_date')::date, end_date = nullif(p_routine->>'end_date','')::date,
      is_paused = (p_routine->>'is_paused')::boolean, paused_from = nullif(p_routine->>'paused_from','')::date,
      is_archived = (p_routine->>'is_archived')::boolean, updated_at = now()
      where id = p_id and user_id = owner_id;
  else
    insert into public.tracker_routines(id,user_id,name,description,timezone,rule,preferred_start_time,start_date,end_date,is_paused,paused_from,is_archived)
      values(p_id,owner_id,p_routine->>'name',p_routine->>'description',p_routine->>'timezone',p_routine->'rule',nullif(p_routine->>'preferred_start_time','')::time,(p_routine->>'start_date')::date,nullif(p_routine->>'end_date','')::date,(p_routine->>'is_paused')::boolean,nullif(p_routine->>'paused_from','')::date,(p_routine->>'is_archived')::boolean);
  end if;
  local_today := (now() at time zone (p_routine->>'timezone'))::date;
  delete from public.tracker_routine_occurrences where routine_id = p_id and user_id = owner_id
    and planned_date >= local_today and planned_date = scheduled_date + (select planned_offset_days from public.tracker_routines where id = p_id) and started_at is null and status = 'SCHEDULED';
  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.tracker_routine_items(id,routine_id,user_id,parent_id,position,type,title,instructions,estimated_minutes,required,frequency_rule,reference_provider,reference_id,reference_key)
      values((item->>'id')::uuid,p_id,owner_id,nullif(item->>'parent_id','')::uuid,(item->>'position')::integer,item->>'type',item->>'title',item->>'instructions',nullif(item->>'estimated_minutes','')::integer,(item->>'required')::boolean,item->'frequency_rule',item->>'reference_provider',nullif(item->>'reference_id','')::uuid,item->>'reference_id')
      on conflict (id) do update set parent_id = excluded.parent_id, position = excluded.position,
        type = excluded.type, title = excluded.title, instructions = excluded.instructions,
        estimated_minutes = excluded.estimated_minutes, required = excluded.required,
        frequency_rule = excluded.frequency_rule, reference_provider = excluded.reference_provider,
        reference_id = excluded.reference_id, reference_key = excluded.reference_key, updated_at = now()
      where public.tracker_routine_items.routine_id = p_id and public.tracker_routine_items.user_id = owner_id;
    if not found then raise exception 'Routine item belongs to another routine' using errcode = '22023'; end if;
  end loop;
  delete from public.tracker_routine_items where routine_id = p_id and user_id = owner_id
    and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_items));
  return p_id;
end $$;
revoke all on function public.tracker_save_routine(uuid,jsonb,jsonb) from public;
grant execute on function public.tracker_save_routine(uuid,jsonb,jsonb) to authenticated;

create function public.tracker_routine_lifecycle(p_id uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); r public.tracker_routines%rowtype; local_today date;
begin
  select * into r from public.tracker_routines where id = p_id and user_id = owner_id for update;
  if not found then raise exception 'Routine not found' using errcode = '22023'; end if;
  local_today := (now() at time zone r.timezone)::date;
  if p_action = 'PAUSE' and not r.is_paused then
    insert into public.tracker_routine_pauses(routine_id,user_id,start_date) values(p_id,owner_id,local_today);
    update public.tracker_routines set is_paused = true, paused_from = local_today, updated_at = now() where id = p_id;
    delete from public.tracker_routine_occurrences where routine_id = p_id and user_id = owner_id and planned_date >= local_today and started_at is null and status = 'SCHEDULED';
  elsif p_action = 'RESUME' and r.is_paused then
    if r.paused_from = local_today then
      delete from public.tracker_routine_pauses where routine_id = p_id and user_id = owner_id and start_date = local_today and end_date is null;
    else
      update public.tracker_routine_pauses set end_date = local_today - 1 where routine_id = p_id and user_id = owner_id and end_date is null;
    end if;
    update public.tracker_routines set is_paused = false, paused_from = null, updated_at = now() where id = p_id;
  elsif p_action = 'ARCHIVE' then
    update public.tracker_routines set is_archived = true, updated_at = now() where id = p_id;
    delete from public.tracker_routine_occurrences where routine_id = p_id and user_id = owner_id and planned_date >= local_today and started_at is null and status = 'SCHEDULED';
  elsif p_action = 'RESTORE' then
    update public.tracker_routines set is_archived = false, updated_at = now() where id = p_id;
  elsif p_action not in ('PAUSE','RESUME','ARCHIVE','RESTORE') then
    raise exception 'Unknown routine action' using errcode = '22023';
  end if;
  return (select to_jsonb(x) from public.tracker_routines x where id = p_id);
end $$;
revoke all on function public.tracker_routine_lifecycle(uuid,text) from public;
grant execute on function public.tracker_routine_lifecycle(uuid,text) to authenticated;

create function public.tracker_routine_action(p_id uuid, p_action text, p_date date default null, p_scope text default 'THIS') returns jsonb
language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); occurrence public.tracker_routine_occurrences%rowtype; offset_days integer; required_count integer;
begin
  select * into occurrence from public.tracker_routine_occurrences where id = p_id and user_id = owner_id for update;
  if not found then raise exception 'Routine occurrence not found' using errcode = '22023'; end if;
  if p_action = 'START' then
    if occurrence.status = 'SKIPPED' then raise exception 'Undo skip before starting' using errcode = '22023'; end if;
    if occurrence.planned_date < (now() at time zone occurrence.timezone)::date then
      raise exception 'The routine window has closed' using errcode = '22023';
    end if;
    select count(*) into required_count from public.tracker_routine_item_occurrences where occurrence_id = p_id and user_id = owner_id and type <> 'GROUP' and required;
    update public.tracker_routine_occurrences set started_at = coalesce(started_at,now()),
      status = case when required_count = 0 then 'COMPLETED' else 'IN_PROGRESS' end,
      ended_at = case when required_count = 0 then now() else null end, updated_at = now()
      where id = p_id and started_at is null;
  elsif p_action = 'SKIP' then
    if occurrence.started_at is not null then raise exception 'Started occurrences cannot be skipped' using errcode = '22023'; end if;
    if occurrence.planned_date < (now() at time zone occurrence.timezone)::date then
      raise exception 'The routine window has closed' using errcode = '22023';
    end if;
    update public.tracker_routine_occurrences set status = 'SKIPPED', ended_at = now(), updated_at = now() where id = p_id;
  elsif p_action = 'UNDO_SKIP' then
    if occurrence.status <> 'SKIPPED' then raise exception 'Occurrence is not skipped' using errcode = '22023'; end if;
    update public.tracker_routine_occurrences set status = 'SCHEDULED', ended_at = null, updated_at = now() where id = p_id;
  elsif p_action = 'RESCHEDULE' then
    if p_date is null or p_scope not in ('THIS','FUTURE') or occurrence.started_at is not null or occurrence.status = 'SKIPPED' then
      raise exception 'Only an unstarted occurrence can be rescheduled' using errcode = '22023';
    end if;
    if exists (select 1 from public.tracker_routine_occurrences where routine_id = occurrence.routine_id and user_id = owner_id and planned_date = p_date and id <> p_id) then
      raise exception 'Another occurrence is already planned on this date' using errcode = '23505';
    end if;
    if p_scope = 'THIS' then
      update public.tracker_routine_occurrences set planned_date = p_date, status = 'SCHEDULED', updated_at = now() where id = p_id;
    else
      offset_days := p_date - occurrence.scheduled_date;
      if offset_days not between -365 and 365 then raise exception 'Future schedule shift is too large' using errcode = '22023'; end if;
      if exists (
        select 1 from public.tracker_routine_occurrences moving
        join public.tracker_routine_occurrences fixed on fixed.routine_id = moving.routine_id
          and fixed.user_id = owner_id and fixed.id <> moving.id and fixed.planned_date = moving.scheduled_date + offset_days
        where moving.routine_id = occurrence.routine_id and moving.user_id = owner_id
          and moving.scheduled_date >= occurrence.scheduled_date and moving.started_at is null and moving.status = 'SCHEDULED'
          and not (fixed.scheduled_date >= occurrence.scheduled_date and fixed.started_at is null and fixed.status = 'SCHEDULED')
      ) then raise exception 'Future occurrences would collide with an existing date' using errcode = '23505'; end if;
      update public.tracker_routines set planned_offset_days = offset_days, updated_at = now() where id = occurrence.routine_id and user_id = owner_id;
      update public.tracker_routine_occurrences set planned_date = scheduled_date + offset_days, updated_at = now()
        where routine_id = occurrence.routine_id and user_id = owner_id and scheduled_date >= occurrence.scheduled_date
          and started_at is null and status = 'SCHEDULED';
    end if;
  else
    raise exception 'Unknown routine action' using errcode = '22023';
  end if;
  return (select to_jsonb(o) from public.tracker_routine_occurrences o where o.id = p_id);
end $$;
revoke all on function public.tracker_routine_action(uuid,text,date,text) from public;
grant execute on function public.tracker_routine_action(uuid,text,date,text) to authenticated;

create function public.tracker_habit_allowed_for_routine(p_habit_id uuid, p_user_id uuid, p_date date) returns boolean
language plpgsql security definer set search_path = public as $$
declare h public.tracker_habits%rowtype; v public.tracker_habit_schedule_versions%rowtype;
  schedule_type text; schedule_config jsonb; habit_start date; habit_end date; archived boolean;
begin
  select * into h from public.tracker_habits where id = p_habit_id and user_id = p_user_id;
  if not found then return false; end if;
  select * into v from public.tracker_habit_schedule_versions where habit_id = p_habit_id and user_id = p_user_id and effective_date <= p_date order by effective_date desc limit 1;
  if found then
    schedule_type := v.schedule_type; schedule_config := v.schedule_config; habit_start := v.start_date; habit_end := v.end_date; archived := v.is_archived;
  else
    schedule_type := h.schedule_type; schedule_config := h.schedule_config; habit_start := h.start_date; habit_end := h.end_date; archived := h.is_archived;
  end if;
  if archived or p_date < habit_start or (habit_end is not null and p_date > habit_end)
    or exists (select 1 from public.tracker_habit_pauses pause where pause.habit_id = p_habit_id and pause.user_id = p_user_id and pause.start_date <= p_date and (pause.end_date is null or pause.end_date >= p_date)) then return false; end if;
  if schedule_type in ('DAILY','WEEKLY_TARGET','MONTHLY_TARGET') then return true; end if;
  if schedule_type = 'WEEKDAYS' then return coalesce(schedule_config->'weekdays' @> to_jsonb(extract(dow from p_date)::integer),false); end if;
  if schedule_type = 'INTERVAL' then return ((p_date - habit_start) % greatest(1,(schedule_config->>'interval')::integer)) = 0; end if;
  return false;
end $$;
revoke all on function public.tracker_habit_allowed_for_routine(uuid,uuid,date) from public;

create function public.tracker_set_routine_item(p_item_id uuid, p_status text, p_value numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); step public.tracker_routine_item_occurrences%rowtype;
  occurrence public.tracker_routine_occurrences%rowtype; habit public.tracker_habits%rowtype;
  current_log public.tracker_habit_logs%rowtype; target_value numeric; required_count integer; done_count integer;
begin
  select * into step from public.tracker_routine_item_occurrences where id = p_item_id and user_id = owner_id for update;
  if not found or step.type = 'GROUP' or p_status not in ('DONE','SKIPPED','PENDING') then
    raise exception 'Invalid routine step' using errcode = '22023';
  end if;
  select * into occurrence from public.tracker_routine_occurrences where id = step.occurrence_id and user_id = owner_id for update;
  if occurrence.status = 'SKIPPED' then raise exception 'Undo the routine skip first' using errcode = '22023'; end if;
  if p_status <> 'PENDING' and occurrence.planned_date < (now() at time zone occurrence.timezone)::date then
    raise exception 'The routine window has closed' using errcode = '22023';
  end if;
  if step.status = p_status then
    return jsonb_build_object('item',to_jsonb(step),'occurrence',to_jsonb(occurrence));
  end if;
  if step.status = 'DONE' and p_status = 'SKIPPED' then
    raise exception 'Undo completion before skipping a step' using errcode = '22023';
  end if;
  if p_status = 'DONE' and step.status <> 'DONE' and step.type = 'HABIT_REF' then
    if not public.tracker_habit_allowed_for_routine(step.reference_id,owner_id,occurrence.planned_date) then
      raise exception 'Habit is not scheduled for this occurrence date' using errcode = '22023';
    end if;
    select * into habit from public.tracker_habits where id = step.reference_id and user_id = owner_id;
    target_value := case when step.habit_tracking_type = 'MEASURABLE' then step.habit_goal_value else null end;
    perform pg_advisory_xact_lock(hashtext(habit.id::text || occurrence.planned_date::text));
    select * into current_log from public.tracker_habit_logs where habit_id = habit.id and user_id = owner_id and date = occurrence.planned_date for update;
    if not found then
      if target_value is not null and (p_value is null or p_value < target_value) then raise exception 'Enter a value that reaches the habit target' using errcode = '22023'; end if;
      insert into public.tracker_habit_logs(habit_id,user_id,date,status,value,origin_routine_item_occurrence_id)
        values(habit.id,owner_id,occurrence.planned_date,'COMPLETED',p_value,p_item_id) returning * into current_log;
      update public.tracker_routine_item_occurrences set created_habit_log = true, applied_habit_value = p_value, applied_habit_updated_at = current_log.updated_at where id = p_item_id;
    elsif current_log.status <> 'COMPLETED' or (target_value is not null and coalesce(current_log.value,0) < target_value) then
      if target_value is not null and (p_value is null or p_value < target_value) then raise exception 'Enter a value that reaches the habit target' using errcode = '22023'; end if;
      update public.tracker_routine_item_occurrences set previous_habit_status = current_log.status,
        previous_habit_value = current_log.value, previous_habit_reason = current_log.reason, applied_habit_value = p_value, applied_habit_updated_at = now() where id = p_item_id;
      update public.tracker_habit_logs set status = 'COMPLETED', value = p_value, reason = null, updated_at = now()
        where id = current_log.id;
    end if;
    update public.tracker_routine_item_occurrences set habit_log_id = current_log.id where id = p_item_id;
  elsif p_status = 'PENDING' and step.status = 'DONE' and step.habit_log_id is not null then
    if not exists (select 1 from public.tracker_routine_item_occurrences where habit_log_id = step.habit_log_id and id <> p_item_id and status = 'DONE') then
      if step.created_habit_log and exists (select 1 from public.tracker_habit_logs where id = step.habit_log_id and origin_routine_item_occurrence_id = p_item_id and status = 'COMPLETED' and value is not distinct from step.applied_habit_value and updated_at = step.applied_habit_updated_at) then
        delete from public.tracker_habit_logs where id = step.habit_log_id;
      elsif step.previous_habit_status is not null then
        update public.tracker_habit_logs set status = step.previous_habit_status, value = step.previous_habit_value,
          reason = step.previous_habit_reason, updated_at = now() where id = step.habit_log_id and user_id = owner_id and status = 'COMPLETED' and value is not distinct from step.applied_habit_value and updated_at = step.applied_habit_updated_at;
      elsif exists (select 1 from public.tracker_habit_logs where id = step.habit_log_id and origin_routine_item_occurrence_id is not null and status = 'COMPLETED' and updated_at = created_at) then
        delete from public.tracker_habit_logs where id = step.habit_log_id;
      end if;
      if step.created_habit_log then
        update public.tracker_habit_logs set origin_routine_item_occurrence_id = null where id = step.habit_log_id and origin_routine_item_occurrence_id = p_item_id;
      end if;
    end if;
  end if;
  update public.tracker_routine_item_occurrences set status = p_status,
    completed_at = case when p_status = 'DONE' then coalesce(completed_at,now()) else null end,
    skipped_at = case when p_status = 'SKIPPED' then now() else null end,
    habit_log_id = case when p_status = 'DONE' then habit_log_id else null end,
    created_habit_log = case when p_status = 'DONE' then created_habit_log else false end,
    previous_habit_status = case when p_status = 'DONE' then previous_habit_status else null end,
    previous_habit_value = case when p_status = 'DONE' then previous_habit_value else null end,
    previous_habit_reason = case when p_status = 'DONE' then previous_habit_reason else null end,
    applied_habit_value = case when p_status = 'DONE' then applied_habit_value else null end,
    applied_habit_updated_at = case when p_status = 'DONE' then applied_habit_updated_at else null end,
    updated_at = now() where id = p_item_id;
  if p_status <> 'PENDING' then
    update public.tracker_routine_occurrences set started_at = coalesce(started_at,now()) where id = occurrence.id;
  end if;
  select count(*), count(*) filter (where status = 'DONE') into required_count, done_count
    from public.tracker_routine_item_occurrences where occurrence_id = occurrence.id and user_id = owner_id and type <> 'GROUP' and required;
  update public.tracker_routine_occurrences set
    status = case when done_count = required_count and started_at is not null then 'COMPLETED'
      when planned_date < (now() at time zone timezone)::date then case when started_at is null then 'MISSED' else 'PARTIAL' end
      else 'IN_PROGRESS' end,
    ended_at = case when done_count = required_count and started_at is not null then coalesce(ended_at,now())
      when planned_date < (now() at time zone timezone)::date then coalesce(ended_at,now()) else null end,
    updated_at = now() where id = occurrence.id;
  return jsonb_build_object('item',(select to_jsonb(i) from public.tracker_routine_item_occurrences i where i.id = p_item_id),
    'occurrence',(select to_jsonb(o) from public.tracker_routine_occurrences o where o.id = occurrence.id));
end $$;
revoke all on function public.tracker_set_routine_item(uuid,text,numeric) from public;
grant execute on function public.tracker_set_routine_item(uuid,text,numeric) to authenticated;

create function public.tracker_edit_routine_item(p_item_id uuid, p_title text, p_instructions text, p_required boolean, p_scope text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); step public.tracker_routine_item_occurrences%rowtype;
  occurrence public.tracker_routine_occurrences%rowtype; required_count integer; done_count integer;
begin
  if p_scope not in ('THIS','FUTURE') or length(trim(p_title)) not between 1 and 120 or length(coalesce(p_instructions,'')) > 2000 or p_required is null then
    raise exception 'Invalid routine step edit' using errcode = '22023';
  end if;
  select * into step from public.tracker_routine_item_occurrences where id = p_item_id and user_id = owner_id for update;
  if not found then raise exception 'Routine step not found' using errcode = '22023'; end if;
  select * into occurrence from public.tracker_routine_occurrences where id = step.occurrence_id and user_id = owner_id for update;
  if p_scope = 'THIS' then
    update public.tracker_routine_item_occurrences set title = trim(p_title), instructions = p_instructions,
      required = p_required, updated_at = now() where id = p_item_id;
  else
    if step.source_item_id is null then raise exception 'This step no longer has a template item' using errcode = '22023'; end if;
    update public.tracker_routine_items set title = trim(p_title), instructions = p_instructions,
      required = p_required, updated_at = now() where id = step.source_item_id and user_id = owner_id;
    update public.tracker_routine_item_occurrences i set title = trim(p_title), instructions = p_instructions,
      required = p_required, updated_at = now()
      from public.tracker_routine_occurrences o where i.source_item_id = step.source_item_id and i.occurrence_id = o.id
        and i.user_id = owner_id and o.user_id = owner_id and o.routine_id = occurrence.routine_id
        and o.scheduled_date >= occurrence.scheduled_date and o.started_at is null and o.status = 'SCHEDULED';
  end if;
  select count(*), count(*) filter (where status = 'DONE') into required_count,done_count
    from public.tracker_routine_item_occurrences where occurrence_id = occurrence.id and user_id = owner_id and type <> 'GROUP' and required;
  if occurrence.started_at is not null and p_scope = 'THIS' then
    update public.tracker_routine_occurrences set status = case when done_count = required_count then 'COMPLETED' else 'IN_PROGRESS' end,
      ended_at = case when done_count = required_count then coalesce(ended_at,now()) else null end,
      updated_at = now() where id = occurrence.id and status <> 'SKIPPED';
  end if;
  return jsonb_build_object('item',(select to_jsonb(i) from public.tracker_routine_item_occurrences i where i.id = p_item_id),
    'appliedToCurrent',p_scope = 'THIS' or occurrence.started_at is null);
end $$;
revoke all on function public.tracker_edit_routine_item(uuid,text,text,boolean,text) from public;
grant execute on function public.tracker_edit_routine_item(uuid,text,text,boolean,text) to authenticated;

-- A habit check-in changed outside a routine cannot leave a stale completed step.
create function public.tracker_reconcile_routine_habit_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare step record; required_count integer; done_count integer; new_status text; new_value numeric;
begin
  if tg_op = 'UPDATE' then new_status := new.status; new_value := new.value; end if;
  for step in select id,occurrence_id,habit_tracking_type,habit_goal_value from public.tracker_routine_item_occurrences
    where habit_log_id = old.id and status = 'DONE'
      and (tg_op = 'DELETE' or new_status <> 'COMPLETED' or (habit_tracking_type = 'MEASURABLE' and coalesce(new_value,0) < habit_goal_value))
  loop
    update public.tracker_routine_item_occurrences set status = 'PENDING', completed_at = null,
      habit_log_id = null, created_habit_log = false, previous_habit_status = null,
      previous_habit_value = null, previous_habit_reason = null, applied_habit_value = null, applied_habit_updated_at = null, updated_at = now()
      where id = step.id;
    select count(*), count(*) filter (where status = 'DONE') into required_count,done_count
      from public.tracker_routine_item_occurrences where occurrence_id = step.occurrence_id and type <> 'GROUP' and required;
    if done_count < required_count then
      update public.tracker_routine_occurrences set status = 'IN_PROGRESS', ended_at = null, updated_at = now() where id = step.occurrence_id and started_at is not null;
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger tracker_routine_log_deleted before delete on public.tracker_habit_logs
for each row execute function public.tracker_reconcile_routine_habit_log();
create trigger tracker_routine_log_changed before update of status,value on public.tracker_habit_logs
for each row execute function public.tracker_reconcile_routine_habit_log();

-- Invoked by authenticated views; no cron or deployment scheduler is required.
create function public.tracker_close_routine_occurrences() returns integer
language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  update public.tracker_routine_occurrences set
    status = case when started_at is null then 'MISSED' else 'PARTIAL' end,
    ended_at = coalesce(ended_at,now()), updated_at = now()
    where user_id = auth.uid() and status in ('SCHEDULED','IN_PROGRESS')
      and planned_date < (now() at time zone timezone)::date;
  get diagnostics changed = row_count;
  return changed;
end $$;
revoke all on function public.tracker_close_routine_occurrences() from public;
grant execute on function public.tracker_close_routine_occurrences() to authenticated;
$myhabits_phase_4$;
  end if;
end $myhabits_install$;

do $myhabits_verify$
begin
  if to_regclass('public.tracker_habits') is null
    or to_regclass('public.tracker_habit_pauses') is null
    or to_regclass('public.tracker_routines') is null
    or to_regclass('public.tracker_routine_occurrences') is null
    or to_regprocedure('public.tracker_import_v2(jsonb,text)') is null
    or to_regprocedure('public.tracker_close_routine_occurrences()') is null then
    raise exception 'MyHabits schema is incomplete; no changes from this run were committed';
  end if;
end $myhabits_verify$;

commit;

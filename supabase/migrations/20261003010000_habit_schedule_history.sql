alter table public.habits add column archived_date date;

create table public.habit_schedule_versions (
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
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade
);
create index habit_schedule_versions_user_idx on public.habit_schedule_versions(user_id, habit_id, effective_date desc);
alter table public.habit_schedule_versions enable row level security;
create policy schedule_versions_own on public.habit_schedule_versions for select to authenticated using ((select auth.uid()) = user_id);

create function public.record_habit_schedule_version() returns trigger language plpgsql security definer set search_path = public as $$
declare local_today date;
begin
  if tg_op = 'UPDATE' then
    if row(new.type, new.tracking_type, new.goal_value, new.unit, new.schedule_type, new.schedule_config, new.start_date, new.end_date, new.is_archived)
      is not distinct from row(old.type, old.tracking_type, old.goal_value, old.unit, old.schedule_type, old.schedule_config, old.start_date, old.end_date, old.is_archived) then
      return new;
    end if;
  end if;
  select (now() at time zone coalesce((select timezone from public.profiles where user_id = new.user_id), 'UTC'))::date into local_today;
  insert into public.habit_schedule_versions(habit_id, user_id, effective_date, type, tracking_type, goal_value, unit, schedule_type, schedule_config, start_date, end_date, is_archived)
  values (new.id, new.user_id, case when tg_op = 'INSERT' then new.start_date else local_today end, new.type, new.tracking_type, new.goal_value, new.unit, new.schedule_type, new.schedule_config, new.start_date, new.end_date, new.is_archived)
  on conflict (habit_id, effective_date) do update set type=excluded.type, tracking_type=excluded.tracking_type, goal_value=excluded.goal_value, unit=excluded.unit, schedule_type=excluded.schedule_type, schedule_config=excluded.schedule_config, start_date=excluded.start_date, end_date=excluded.end_date, is_archived=excluded.is_archived;
  return new;
end $$;
create trigger habits_schedule_version after insert or update on public.habits for each row execute function public.record_habit_schedule_version();

insert into public.habit_schedule_versions(habit_id,user_id,effective_date,type,tracking_type,goal_value,unit,schedule_type,schedule_config,start_date,end_date,is_archived)
select id,user_id,start_date,type,tracking_type,goal_value,unit,schedule_type,schedule_config,start_date,end_date,is_archived from public.habits
on conflict do nothing;

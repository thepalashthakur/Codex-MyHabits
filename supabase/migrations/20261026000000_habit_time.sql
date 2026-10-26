-- Link MyHabits sessions to Timelogger entries in the shared Supabase project.
-- Apply after the MyHabits and Timelogger base schemas.
begin;

alter table public.timelogger_time_entries
  add column tracker_habit_id uuid;

alter table public.timelogger_time_entries
  add constraint timelogger_entry_tracker_habit
  foreign key (tracker_habit_id, user_id)
  references public.tracker_habits(id, user_id)
  on delete set null (tracker_habit_id);

create index timelogger_entries_habit_start_idx
  on public.timelogger_time_entries(user_id, tracker_habit_id, start_at desc)
  where tracker_habit_id is not null;

create function public.tracker_start_habit_timer(p_habit_id uuid)
returns public.timelogger_time_entries
language plpgsql security invoker set search_path = ''
as $$
declare
  habit_name text;
  result public.timelogger_time_entries;
  started_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  select name into habit_name from public.tracker_habits
    where id = p_habit_id and user_id = auth.uid() and not is_archived;
  if not found then raise exception 'Habit not found or archived'; end if;
  started_at := clock_timestamp();
  insert into public.timelogger_time_entries
    (user_id, tracker_habit_id, project, task, description, status, start_at, last_resumed_at)
  values (auth.uid(), p_habit_id, 'MyHabits', habit_name, '', 'running', started_at, started_at)
  returning * into result;
  return result;
exception when unique_violation then
  raise exception 'An active timer already exists';
end;
$$;

create function public.tracker_transition_habit_timer(p_habit_id uuid, p_action text)
returns public.timelogger_time_entries
language plpgsql security definer set search_path = ''
as $$
declare result public.timelogger_time_entries;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_action not in ('pause', 'resume', 'stop') then raise exception 'Invalid timer action'; end if;
  select * into result from public.timelogger_time_entries
    where user_id = auth.uid() and tracker_habit_id = p_habit_id
      and status in ('running', 'paused') for update;
  if not found then raise exception 'No active timer for this habit'; end if;
  if p_action = 'pause' then
    if result.status <> 'running' then raise exception 'Timer is not running'; end if;
    update public.timelogger_time_entries set
      elapsed_seconds = elapsed_seconds + greatest(0, floor(extract(epoch from clock_timestamp() - last_resumed_at))::bigint),
      last_resumed_at = null, status = 'paused'
    where id = result.id returning * into result;
  elsif p_action = 'resume' then
    if result.status <> 'paused' then raise exception 'Timer is not paused'; end if;
    update public.timelogger_time_entries set last_resumed_at = clock_timestamp(), status = 'running'
    where id = result.id returning * into result;
  else
    update public.timelogger_time_entries set
      elapsed_seconds = elapsed_seconds + case when status = 'running' then greatest(0, floor(extract(epoch from clock_timestamp() - last_resumed_at))::bigint) else 0 end,
      last_resumed_at = null, end_at = clock_timestamp(), status = 'stopped'
    where id = result.id returning * into result;
  end if;
  return result;
end;
$$;

create function public.tracker_habit_time_total(p_habit_id uuid)
returns bigint
language sql volatile security invoker set search_path = ''
as $$
  select coalesce(sum(
    elapsed_seconds + case when status = 'running' and last_resumed_at is not null
      then greatest(0, floor(extract(epoch from clock_timestamp() - last_resumed_at))::bigint)
      else 0 end
  ), 0)::bigint
  from public.timelogger_time_entries
  where user_id = auth.uid() and tracker_habit_id = p_habit_id;
$$;

revoke all on function public.tracker_start_habit_timer(uuid) from public, anon;
revoke all on function public.tracker_transition_habit_timer(uuid,text) from public, anon;
revoke all on function public.tracker_habit_time_total(uuid) from public, anon;
grant execute on function public.tracker_start_habit_timer(uuid) to authenticated;
grant execute on function public.tracker_transition_habit_timer(uuid,text) to authenticated;
grant execute on function public.tracker_habit_time_total(uuid) to authenticated;

commit;

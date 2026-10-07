import type { SupabaseClient } from "@supabase/supabase-js";
import { getScheduledHabits, shiftDate, type Habit, type HabitPause, type ScheduleVersion } from "./domain";
import { applicableItems, localRoutineDate, routineRunsOn, type ItemOccurrence, type RoutineDefinition, type RoutineItem, type RoutineOccurrence, type RoutinePause } from "./routines";

export function isMissingRoutineSchema(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST202"));
}

export async function routineDefinitions(client: SupabaseClient, userId: string) {
  const [routines, items, pauses] = await Promise.all([
    client.from("tracker_routines").select("*").eq("user_id", userId).order("created_at"),
    client.from("tracker_routine_items").select("*").eq("user_id", userId).order("position"),
    client.from("tracker_routine_pauses").select("*").eq("user_id", userId),
  ]);
  if (isMissingRoutineSchema(routines.error) || isMissingRoutineSchema(items.error) || isMissingRoutineSchema(pauses.error)) {
    return { available: false as const, routines: [] as RoutineDefinition[], items: [] as RoutineItem[], pauses: [] as RoutinePause[] };
  }
  if (routines.error || items.error || pauses.error) throw Error("Unable to load routines.");
  return { available: true as const, routines: routines.data as RoutineDefinition[], items: items.data as RoutineItem[], pauses: pauses.data as RoutinePause[] };
}

export function parentFirst<T extends { id: string; parent_id: string | null; position: number }>(items: T[]) {
  const byParent = new Map<string | null, T[]>();
  for (const item of items) byParent.set(item.parent_id, [...(byParent.get(item.parent_id) ?? []), item]);
  const ordered: T[] = [];
  const seen = new Set<string>();
  function visit(parentId: string | null) {
    for (const item of (byParent.get(parentId) ?? []).sort((a, b) => a.position - b.position)) {
      if (seen.has(item.id)) throw Error("Routine items cannot contain a cycle.");
      seen.add(item.id); ordered.push(item); visit(item.id);
    }
  }
  visit(null);
  if (ordered.length !== items.length) throw Error("Routine items contain an invalid parent.");
  return ordered;
}

export async function materializeRoutine(client: SupabaseClient, routine: RoutineDefinition, items: RoutineItem[], date: string, habits: Habit[], versions: ScheduleVersion[], habitPauses: HabitPause[], routinePauses: RoutinePause[] = []) {
  if (!routineRunsOn(routine, date, routinePauses)) return null;
  const plannedDate = shiftDate(date, routine.planned_offset_days);
  const scheduledHabits = new Set(getScheduledHabits(habits, plannedDate, versions, habitPauses).map(habit => habit.id));
  const applicable = applicableItems(items.filter(item => item.routine_id === routine.id), date, routine.start_date);
  const included = new Set(applicable.filter(item => item.type !== "HABIT_REF" || (item.reference_id && scheduledHabits.has(item.reference_id))).map(item => item.id));
  const snapshot = parentFirst(applicable.filter(item => included.has(item.id))).map(item => ({ id: item.id, parent_id: item.parent_id }));
  const { data, error } = await client.rpc("tracker_materialize_routine", { p_routine_id: routine.id, p_date: date, p_items: snapshot });
  if (error) throw Error("Unable to prepare routine occurrence.");
  return data as string;
}

export async function occurrenceWithItems(client: SupabaseClient, userId: string, id: string) {
  const { data: occurrence, error } = await client.from("tracker_routine_occurrences").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw Error("Unable to load routine occurrence.");
  if (!occurrence) return null;
  const { data: items, error: itemError } = await client.from("tracker_routine_item_occurrences").select("*").eq("occurrence_id", id).eq("user_id", userId).order("position");
  if (itemError) throw Error("Unable to load routine steps.");
  return { occurrence: occurrence as RoutineOccurrence, items: items as ItemOccurrence[] };
}

export async function routinesForToday(client: SupabaseClient, userId: string, routines: RoutineDefinition[], items: RoutineItem[], habits: Habit[], versions: ScheduleVersion[], habitPauses: HabitPause[], routinePauses: RoutinePause[], selectedDate?: string) {
  const dates = new Map(routines.map(routine => [routine.id, selectedDate ?? localRoutineDate(routine.timezone)]));
  const targetDates = [...new Set(dates.values())];
  const { data: existing, error } = await client.from("tracker_routine_occurrences").select("*").eq("user_id", userId).in("planned_date", targetDates);
  if (error) throw Error("Unable to load today’s routines.");
  const existingKeys = new Set((existing ?? []).map(occurrence => `${occurrence.routine_id}:${occurrence.scheduled_date}`));
  const due = routines.filter(routine => {
    const scheduledDate = shiftDate(dates.get(routine.id)!, -routine.planned_offset_days);
    return routineRunsOn(routine, scheduledDate, routinePauses) && !existingKeys.has(`${routine.id}:${scheduledDate}`);
  });
  await Promise.all(due.map(routine => materializeRoutine(client, routine, items, shiftDate(dates.get(routine.id)!, -routine.planned_offset_days), habits, versions, habitPauses, routinePauses)));
  const { data: occurrences, error: occurrenceError } = await client.from("tracker_routine_occurrences").select("*").eq("user_id", userId).in("planned_date", targetDates).order("planned_time");
  if (occurrenceError) throw Error("Unable to load today’s routines.");
  return (occurrences as RoutineOccurrence[]).filter(occurrence => occurrence.planned_date === dates.get(occurrence.routine_id));
}

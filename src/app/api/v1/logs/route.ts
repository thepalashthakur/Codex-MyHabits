import { logInput } from "@/lib/validation";
import { ApiError, jsonBody, result, withApi } from "@/lib/api";
import { habitOnDate, type Habit, type HabitPause, type ScheduleVersion } from "@/lib/domain";
import { LogRuleError, prepareLog } from "@/lib/logging";
export async function GET(request: Request) { return withApi(request, async ({ client, user }) => {
  const url = new URL(request.url); const from = url.searchParams.get("from"), to = url.searchParams.get("to");
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to || (Date.parse(to) - Date.parse(from)) > 366 * 86400000) throw new ApiError(400, "Choose a valid range up to one year.");
  const { data, error } = await client.from("tracker_habit_logs").select("*").eq("user_id", user.id).gte("date", from).lte("date", to).order("date", { ascending: false });
  return { logs: result(data, error) };
}); }
export async function PUT(request: Request) { return withApi(request, async ({ client, user }) => {
  const input = logInput.parse(await jsonBody(request));
  const { data, error } = await client.from("tracker_habits").select("*").eq("id", input.habit_id).eq("user_id", user.id).single();
  if (error || !data) throw new ApiError(404, "Habit not found.");
  const habit = data as Habit;
  const { data: revisions, error: revisionError } = await client.from("tracker_habit_schedule_versions").select("*").eq("habit_id", habit.id).eq("user_id", user.id).lte("effective_date", input.date).order("effective_date", { ascending: false }).limit(1);
  if (revisionError) throw revisionError;
  const datedHabit = habitOnDate(habit, (revisions ?? []) as ScheduleVersion[], input.date);
  const pausesResult = await client.from("tracker_habit_pauses").select("*").eq("habit_id", habit.id).eq("user_id", user.id).lte("start_date", input.date).or(`end_date.is.null,end_date.gte.${input.date}`);
  if (pausesResult.error && !["PGRST205", "42P01"].includes(pausesResult.error.code)) throw pausesResult.error;
  let prepared;
  try { prepared = prepareLog(datedHabit, input.date, input.status, input.value, (pausesResult.data ?? []) as HabitPause[], input.reason); } catch (e) { if (e instanceof LogRuleError) throw new ApiError(400, e.message); throw e; }
  if (input.status === null) {
    const deleted = await client.from("tracker_habit_logs").delete().eq("habit_id", habit.id).eq("user_id", user.id).eq("date", input.date);
    result(null, deleted.error); return { log: null };
  }
  const { data: saved, error: saveError } = await client.from("tracker_habit_logs").upsert({ habit_id: habit.id, user_id: user.id, date: input.date, ...prepared, updated_at: new Date().toISOString() }, { onConflict: "habit_id,date" }).select().single();
  return { log: result(saved, saveError) };
}); }

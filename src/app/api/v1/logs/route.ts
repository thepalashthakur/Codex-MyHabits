import { logInput } from "@/lib/validation";
import { ApiError, jsonBody, result, withApi } from "@/lib/api";
import { isHabitScheduledForDate, type Habit } from "@/lib/domain";
export async function GET(request: Request) { return withApi(request, async ({ client, user }) => {
  const url = new URL(request.url); const from = url.searchParams.get("from"), to = url.searchParams.get("to");
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to || (Date.parse(to) - Date.parse(from)) > 366 * 86400000) throw new ApiError(400, "Choose a valid range up to one year.");
  const { data, error } = await client.from("habit_logs").select("*").eq("user_id", user.id).gte("date", from).lte("date", to).order("date", { ascending: false });
  return { logs: result(data, error) };
}); }
export async function PUT(request: Request) { return withApi(request, async ({ client, user }) => {
  const input = logInput.parse(await jsonBody(request));
  const { data, error } = await client.from("habits").select("*").eq("id", input.habit_id).eq("user_id", user.id).single();
  if (error || !data) throw new ApiError(404, "Habit not found.");
  const habit = data as Habit;
  if (!isHabitScheduledForDate(habit, input.date)) throw new ApiError(400, "Habit is not scheduled for this date.");
  if (input.status === null) {
    const deleted = await client.from("habit_logs").delete().eq("habit_id", habit.id).eq("user_id", user.id).eq("date", input.date);
    result(null, deleted.error); return { log: null };
  }
  if (habit.tracking_type === "MEASURABLE" && input.status === "COMPLETED" && input.value == null) throw new ApiError(400, "A value is required.");
  const { data: saved, error: saveError } = await client.from("habit_logs").upsert({ habit_id: habit.id, user_id: user.id, date: input.date, status: input.status, value: input.status === "COMPLETED" ? (input.value ?? null) : null, updated_at: new Date().toISOString() }, { onConflict: "habit_id,date" }).select().single();
  return { log: result(saved, saveError) };
}); }

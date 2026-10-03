import { noteInput } from "@/lib/validation";
import { ApiError, jsonBody, result, withApi } from "@/lib/api";
export async function GET(request: Request) { return withApi(request, async ({ client, user }) => {
  const habitId = new URL(request.url).searchParams.get("habit_id"); if (!habitId) throw new ApiError(400, "habit_id is required.");
  const { data, error } = await client.from("tracker_habit_notes").select("*").eq("user_id", user.id).eq("habit_id", habitId).order("created_at", { ascending: false }).limit(100);
  return { notes: result(data, error) };
}); }
export async function POST(request: Request) { return withApi(request, async ({ client, user }) => {
  const input = noteInput.parse(await jsonBody(request));
  const { data: habit } = await client.from("tracker_habits").select("id").eq("id", input.habit_id).eq("user_id", user.id).maybeSingle();
  if (!habit) throw new ApiError(404, "Habit not found.");
  const { data, error } = await client.from("tracker_habit_notes").insert({ ...input, user_id: user.id }).select().single();
  return { note: result(data, error) };
}); }

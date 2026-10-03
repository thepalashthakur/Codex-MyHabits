import { habitInput } from "@/lib/validation";
import { jsonBody, result, withApi, ApiError } from "@/lib/api";
export async function GET(request: Request) { return withApi(request, async ({ client, user }) => {
  const url = new URL(request.url); const archived = url.searchParams.get("archived") === "true";
  const { data, error } = await client.from("tracker_habits").select("*").eq("user_id", user.id).eq("is_archived", archived).order("position").order("created_at");
  return { habits: result(data, error) };
}); }
export async function POST(request: Request) { return withApi(request, async ({ client, user }) => {
  const input = habitInput.parse(await jsonBody(request));
  if (input.area_id) { const { data } = await client.from("tracker_areas").select("id").eq("id", input.area_id).eq("user_id", user.id).maybeSingle(); if (!data) throw new ApiError(404, "Area not found."); }
  const { data, error } = await client.from("tracker_habits").insert({ ...input, user_id: user.id }).select().single();
  return { habit: result(data, error) };
}); }

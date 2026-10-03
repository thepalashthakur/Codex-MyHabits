import { profileInput } from "@/lib/validation";
import { ApiError, jsonBody, result, withApi } from "@/lib/api";
export async function GET(request: Request) { return withApi(request, async ({ client, user }) => {
  const { data, error } = await client.from("tracker_profiles").select("*").eq("user_id", user.id).maybeSingle(); return { profile: result(data, error) ?? { user_id: user.id, timezone: "UTC", theme: "system" }, configured: Boolean(data) };
}); }
export async function PATCH(request: Request) { return withApi(request, async ({ client, user }) => {
  const input = profileInput.parse(await jsonBody(request));
  if (input.timezone) { try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }); } catch { throw new ApiError(400, "Invalid timezone."); } }
  const { data, error } = await client.from("tracker_profiles").upsert({ ...input, user_id: user.id, updated_at: new Date().toISOString() }).select().single(); return { profile: result(data, error) };
}); }

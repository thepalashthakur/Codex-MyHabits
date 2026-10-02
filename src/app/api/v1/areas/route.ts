import { areaInput } from "@/lib/validation";
import { jsonBody, result, withApi } from "@/lib/api";
export async function GET(request: Request) { return withApi(request, async ({ client, user }) => {
  const { data, error } = await client.from("areas").select("*").eq("user_id", user.id).order("position");
  return { areas: result(data, error) };
}); }
export async function POST(request: Request) { return withApi(request, async ({ client, user }) => {
  const input = areaInput.parse(await jsonBody(request));
  const { data, error } = await client.from("areas").insert({ ...input, user_id: user.id }).select().single();
  return { area: result(data, error) };
}); }

import { habitInput } from "@/lib/validation";
import { jsonBody, owned, result, withApi, ApiError } from "@/lib/api";
type Params = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "habits", id);
  const { data, error } = await context.client.from("habits").select("*").eq("id", id).eq("user_id", context.user.id).single();
  return { habit: result(data, error) };
}); }
export async function PATCH(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "habits", id);
  const raw = await jsonBody(request);
  const input = (typeof raw === "object" && raw !== null && ("is_archived" in raw)) ? { is_archived: Boolean((raw as {is_archived: unknown}).is_archived), archived_at: (raw as {is_archived: unknown}).is_archived ? new Date().toISOString() : null } : habitInput.parse(raw);
  if ("area_id" in input && input.area_id) { const { data } = await context.client.from("areas").select("id").eq("id", input.area_id).eq("user_id", context.user.id).maybeSingle(); if (!data) throw new ApiError(404, "Area not found."); }
  const { data, error } = await context.client.from("habits").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.user.id).select().single();
  return { habit: result(data, error) };
}); }
export async function DELETE(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "habits", id);
  const { error } = await context.client.from("habits").delete().eq("id", id).eq("user_id", context.user.id);
  result(null, error); return { ok: true };
}); }

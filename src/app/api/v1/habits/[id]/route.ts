import { habitInput } from "@/lib/validation";
import { jsonBody, owned, result, withApi, ApiError } from "@/lib/api";
import { localDate } from "@/lib/domain";
import { z } from "zod";
type Params = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_habits", id);
  const { data, error } = await context.client.from("tracker_habits").select("*").eq("id", id).eq("user_id", context.user.id).single();
  return { habit: result(data, error) };
}); }
export async function PATCH(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_habits", id);
  const raw = await jsonBody(request);
  let input;
  if (typeof raw === "object" && raw !== null && ("is_archived" in raw)) {
    const archived = z.object({ is_archived: z.boolean() }).strict().parse(raw).is_archived;
    const { data: profile } = await context.client.from("tracker_profiles").select("timezone").eq("user_id", context.user.id).maybeSingle();
    input = { is_archived: archived, archived_at: archived ? new Date().toISOString() : null, archived_date: archived ? localDate(profile?.timezone ?? "UTC") : null };
  } else input = habitInput.parse(raw);
  if ("area_id" in input && input.area_id) { const { data } = await context.client.from("tracker_areas").select("id").eq("id", input.area_id).eq("user_id", context.user.id).maybeSingle(); if (!data) throw new ApiError(404, "Area not found."); }
  const { data, error } = await context.client.from("tracker_habits").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.user.id).select().single();
  return { habit: result(data, error) };
}); }
export async function DELETE(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_habits", id);
  const { error } = await context.client.from("tracker_habits").delete().eq("id", id).eq("user_id", context.user.id);
  result(null, error); return { ok: true };
}); }

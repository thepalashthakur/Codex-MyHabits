import { areaInput } from "@/lib/validation";
import { jsonBody, owned, result, withApi } from "@/lib/api";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; const input = areaInput.partial().parse(await jsonBody(request));
  await owned(context, "tracker_areas", id);
  const { data, error } = await context.client.from("tracker_areas").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.user.id).select().single();
  return { area: result(data, error) };
}); }
export async function DELETE(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_areas", id);
  const { error } = await context.client.from("tracker_areas").delete().eq("id", id).eq("user_id", context.user.id);
  result(null, error); return { ok: true };
}); }

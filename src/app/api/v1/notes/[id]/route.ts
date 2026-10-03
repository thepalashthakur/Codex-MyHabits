import { jsonBody, owned, result, withApi } from "@/lib/api";
import { z } from "zod";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_habit_notes", id);
  const input = z.object({ content: z.string().trim().min(1).max(4000) }).strict().parse(await jsonBody(request));
  const { data, error } = await context.client.from("tracker_habit_notes").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.user.id).select().single();
  return { note: result(data, error) };
}); }
export async function DELETE(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_habit_notes", id);
  const { error } = await context.client.from("tracker_habit_notes").delete().eq("id", id).eq("user_id", context.user.id);
  result(null, error); return { ok: true };
}); }

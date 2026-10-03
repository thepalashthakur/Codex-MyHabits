import { jsonBody, owned, result, withApi } from "@/lib/api";
import { z } from "zod";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_habit_reminders", id);
  const input = z.object({ time: z.iso.time().optional(), timezone: z.string().min(1).max(80).optional(), enabled: z.boolean().optional() }).strict().parse(await jsonBody(request));
  if (input.timezone) new Intl.DateTimeFormat("en", { timeZone: input.timezone });
  const { data, error } = await context.client.from("tracker_habit_reminders").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.user.id).select().single(); return { reminder: result(data, error) };
}); }
export async function DELETE(request: Request, { params }: Params) { return withApi(request, async context => {
  const id = (await params).id; await owned(context, "tracker_habit_reminders", id);
  const { error } = await context.client.from("tracker_habit_reminders").delete().eq("id", id).eq("user_id", context.user.id); result(null, error); return { ok: true };
}); }

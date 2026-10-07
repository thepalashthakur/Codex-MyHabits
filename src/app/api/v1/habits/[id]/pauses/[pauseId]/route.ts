import { z } from "zod";
import { ApiError, jsonBody, withApi } from "@/lib/api";

type Params = { params: Promise<{ id: string; pauseId: string }> };
const patchInput = z.object({ end_date: z.iso.date() }).strict();

export async function PATCH(request: Request, { params }: Params) {
  return withApi(request, async context => {
    const { id, pauseId } = await params;
    const input = patchInput.parse(await jsonBody(request));
    const { data: current, error: lookupError } = await context.client.from("tracker_habit_pauses").select("id,start_date,end_date").eq("id", z.uuid().parse(pauseId)).eq("habit_id", z.uuid().parse(id)).eq("user_id", context.user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!current) throw new ApiError(404, "Pause not found.");
    if (input.end_date < current.start_date) throw new ApiError(400, "Pause end must follow start.");
    const { data, error } = await context.client.from("tracker_habit_pauses").update({ end_date: input.end_date, updated_at: new Date().toISOString() }).eq("id", current.id).eq("user_id", context.user.id).select().single();
    if (error?.code === "23P01") throw new ApiError(409, "This pause overlaps another pause.");
    if (error) throw error;
    return { pause: data };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return withApi(request, async context => {
    const { id, pauseId } = await params;
    const { data, error } = await context.client.from("tracker_habit_pauses").delete().eq("id", z.uuid().parse(pauseId)).eq("habit_id", z.uuid().parse(id)).eq("user_id", context.user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "Pause not found.");
    return { ok: true };
  });
}

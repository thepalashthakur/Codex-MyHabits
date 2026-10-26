import { z } from "zod";
import { ApiError, jsonBody, owned, withApi } from "@/lib/api";
import { habitTimerSnapshot } from "@/lib/habit-time";

type Params = { params: Promise<{ id: string }> };
const actionInput = z.object({ action: z.enum(["start", "pause", "resume", "stop"]) }).strict();

export async function GET(request: Request, { params }: Params) {
  return withApi(request, async context => {
    const id = (await params).id;
    await owned(context, "tracker_habits", id);
    return habitTimerSnapshot(context.client, context.user.id, id);
  });
}

export async function POST(request: Request, { params }: Params) {
  return withApi(request, async context => {
    const id = (await params).id;
    await owned(context, "tracker_habits", id);
    const { action } = actionInput.parse(await jsonBody(request));
    const { data: access, error: accessError } = await context.client.rpc("has_app_access", { app_key: "timelogger" });
    if (accessError || access !== true) throw new ApiError(403, "Timelogger access is unavailable.");
    const { error } = action === "start"
      ? await context.client.rpc("tracker_start_habit_timer", { p_habit_id: id })
      : await context.client.rpc("tracker_transition_habit_timer", { p_habit_id: id, p_action: action });
    if (error) {
      if (/active timer already exists|no active timer|timer is not|archived/i.test(error.message)) {
        throw new ApiError(409, error.message);
      }
      throw new Error(error.message);
    }
    return habitTimerSnapshot(context.client, context.user.id, id);
  });
}

import { z } from "zod";
import { ApiError, jsonBody, owned, withApi } from "@/lib/api";
import { pauseInput } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return withApi(request, async context => {
    const id = z.uuid().parse((await params).id);
    await owned(context, "tracker_habits", id);
    const { data, error } = await context.client.from("tracker_habit_pauses").select("*").eq("habit_id", id).eq("user_id", context.user.id).order("start_date", { ascending: false });
    if (error) throw error;
    return { pauses: data };
  });
}

export async function POST(request: Request, { params }: Params) {
  return withApi(request, async context => {
    const id = z.uuid().parse((await params).id);
    await owned(context, "tracker_habits", id);
    const input = pauseInput.parse(await jsonBody(request));
    const { data, error } = await context.client.from("tracker_habit_pauses").insert({ ...input, habit_id: id, user_id: context.user.id }).select().single();
    if (error?.code === "23P01") throw new ApiError(409, "This pause overlaps another pause.");
    if (error) throw error;
    return { pause: data };
  });
}

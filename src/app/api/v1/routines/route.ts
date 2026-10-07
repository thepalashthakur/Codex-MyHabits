import { ApiError, jsonBody, withApi } from "@/lib/api";
import { isMissingRoutineSchema, parentFirst, routineDefinitions } from "@/lib/routine-data";
import { routineInput } from "@/lib/routine-validation";

export async function GET(request: Request) {
  return withApi(request, async ({ client, user }) => routineDefinitions(client, user.id));
}

export async function POST(request: Request) {
  return withApi(request, async ({ client }) => {
    const input = routineInput.parse(await jsonBody(request, 262144));
    const id = crypto.randomUUID();
    const { data, error } = await client.rpc("tracker_save_routine", { p_id: id, p_routine: input.routine, p_items: parentFirst(input.items) });
    if (isMissingRoutineSchema(error)) throw new ApiError(503, "Routines are temporarily unavailable. Please try again later.");
    if (error?.code === "23503") throw new ApiError(400, "Choose habits from your account for habit steps.");
    if (error?.code === "23514" || error?.code === "22023") throw new ApiError(400, "Check the routine schedule and item nesting.");
    if (error) throw error;
    return { routineId: data as string };
  });
}

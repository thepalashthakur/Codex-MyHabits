import { z } from "zod";
import { ApiError, jsonBody, withApi } from "@/lib/api";
import { occurrenceWithItems } from "@/lib/routine-data";

type Params = { params: Promise<{ id: string }> };
const actionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START") }).strict(),
  z.object({ action: z.literal("SKIP") }).strict(),
  z.object({ action: z.literal("UNDO_SKIP") }).strict(),
  z.object({ action: z.literal("RESCHEDULE"), date: z.iso.date(), scope: z.enum(["THIS", "FUTURE"]) }).strict(),
]);

export async function GET(request: Request, { params }: Params) {
  return withApi(request, async ({ client, user }) => {
    const id = z.uuid().parse((await params).id);
    const result = await occurrenceWithItems(client, user.id, id);
    if (!result) throw new ApiError(404, "Occurrence not found.");
    return result;
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return withApi(request, async ({ client, user }) => {
    const id = z.uuid().parse((await params).id);
    if (!await occurrenceWithItems(client, user.id, id)) throw new ApiError(404, "Occurrence not found.");
    const input = actionInput.parse(await jsonBody(request));
    const { data, error } = await client.rpc("tracker_routine_action", { p_id: id, p_action: input.action, p_date: input.action === "RESCHEDULE" ? input.date : null, p_scope: input.action === "RESCHEDULE" ? input.scope : "THIS" });
    if (error?.code === "22023") throw new ApiError(400, "This occurrence cannot be changed in that way.");
    if (error?.code === "23505") throw new ApiError(409, "Another occurrence is already planned on that date.");
    if (error) throw error;
    return { occurrence: data };
  });
}

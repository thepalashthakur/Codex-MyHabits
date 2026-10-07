import { z } from "zod";
import { ApiError, jsonBody, withApi } from "@/lib/api";

const orderInput = z.object({ ids: z.array(z.uuid()).min(1).max(500) }).strict().refine(value => new Set(value.ids).size === value.ids.length, "Order contains duplicate habits.");

export async function PUT(request: Request) {
  return withApi(request, async ({ client }) => {
    const input = orderInput.parse(await jsonBody(request));
    const { error } = await client.rpc("tracker_reorder_habits", { p_ids: input.ids });
    if (error?.code === "22023") throw new ApiError(400, "Reorder one complete time-of-day group at a time.");
    if (error) throw error;
    return { ok: true };
  });
}

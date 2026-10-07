import { z } from "zod";
import { ApiError, jsonBody, withApi } from "@/lib/api";

type Params = { params: Promise<{ id: string; itemId: string }> };
const inputSchema = z.object({ status: z.enum(["DONE", "SKIPPED", "PENDING"]), value: z.number().nonnegative().max(1e9).nullable().optional() }).strict();
const editSchema = z.object({ action: z.literal("EDIT"), title: z.string().trim().min(1).max(120), instructions: z.string().max(2000).nullable(), required: z.boolean(), scope: z.enum(["THIS", "FUTURE"]) }).strict();

export async function PATCH(request: Request, { params }: Params) {
  return withApi(request, async ({ client, user }) => {
    const { id: rawId, itemId: rawItemId } = await params;
    const id = z.uuid().parse(rawId), itemId = z.uuid().parse(rawItemId);
    const { data: item, error: lookupError } = await client.from("tracker_routine_item_occurrences").select("id").eq("id", itemId).eq("occurrence_id", id).eq("user_id", user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!item) throw new ApiError(404, "Routine step not found.");
    const raw = await jsonBody(request);
    const edit = editSchema.safeParse(raw);
    if (edit.success) {
      const { data, error } = await client.rpc("tracker_edit_routine_item", { p_item_id: itemId, p_title: edit.data.title, p_instructions: edit.data.instructions, p_required: edit.data.required, p_scope: edit.data.scope });
      if (error?.code === "22023") throw new ApiError(400, "This step cannot be edited with that scope.");
      if (error) throw error;
      return data;
    }
    const input = inputSchema.parse(raw);
    const { data, error } = await client.rpc("tracker_set_routine_item", { p_item_id: itemId, p_status: input.status, p_value: input.value ?? null });
    if (error?.code === "22023") throw new ApiError(400, "This step cannot be changed. Check its habit schedule and target.");
    if (error) throw error;
    return data;
  });
}

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, jsonBody, withApi } from "@/lib/api";
import { parentFirst } from "@/lib/routine-data";
import { routineInput } from "@/lib/routine-validation";
import type { RoutineDefinition } from "@/lib/routines";

type Params = { params: Promise<{ id: string }> };
async function ownedRoutine(client: SupabaseClient, userId: string, id: string) {
  const { data, error } = await client.from("tracker_routines").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "Routine not found.");
  return data as RoutineDefinition;
}

export async function GET(request: Request, { params }: Params) {
  return withApi(request, async ({ client, user }) => {
    const id = z.uuid().parse((await params).id);
    const routine = await ownedRoutine(client, user.id, id);
    const { data, error } = await client.from("tracker_routine_items").select("*").eq("routine_id", id).eq("user_id", user.id).order("position");
    if (error) throw error;
    return { routine, items: data };
  });
}

const actionInput = z.object({ action: z.enum(["PAUSE", "RESUME", "ARCHIVE", "RESTORE"]) }).strict();
export async function PATCH(request: Request, { params }: Params) {
  return withApi(request, async ({ client, user }) => {
    const id = z.uuid().parse((await params).id);
    await ownedRoutine(client, user.id, id);
    const raw = await jsonBody(request, 262144);
    const action = actionInput.safeParse(raw);
    if (action.success) {
      const { data, error } = await client.rpc("tracker_routine_lifecycle", { p_id: id, p_action: action.data.action });
      if (error) throw error;
      return { routine: data };
    }
    const input = routineInput.parse(raw);
    const { data, error } = await client.rpc("tracker_save_routine", { p_id: id, p_routine: input.routine, p_items: parentFirst(input.items) });
    if (error?.code === "23503") throw new ApiError(400, "Choose habits from your account for habit steps.");
    if (error?.code === "23514" || error?.code === "22023") throw new ApiError(400, "Check the routine schedule and item nesting.");
    if (error) throw error;
    return { routineId: data as string };
  });
}

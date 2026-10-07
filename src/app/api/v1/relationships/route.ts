import { jsonBody, ApiError, withApi } from "@/lib/api";
import { relationshipInput } from "@/lib/validation";

export async function GET(request: Request) {
  return withApi(request, async ({ client, user }) => {
    const { data, error } = await client.from("tracker_habit_relationships").select("*").eq("user_id", user.id);
    if (error) throw error;
    return { relationships: data };
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ client, user }) => {
    const input = relationshipInput.parse(await jsonBody(request));
    const { data: habits, error: lookupError } = await client.from("tracker_habits").select("id,is_archived").eq("user_id", user.id).in("id", [input.source_habit_id, input.target_habit_id]);
    if (lookupError) throw lookupError;
    if (habits?.length !== 2 || habits.some(habit => habit.is_archived)) throw new ApiError(404, "Choose two active habits from your account.");
    const { data, error } = await client.from("tracker_habit_relationships").insert({ ...input, user_id: user.id }).select().single();
    if (error?.code === "23514") throw new ApiError(409, "This relationship would create a loop.");
    if (error?.code === "23505") throw new ApiError(409, "These habits are already linked.");
    if (error) throw error;
    return { relationship: data };
  });
}

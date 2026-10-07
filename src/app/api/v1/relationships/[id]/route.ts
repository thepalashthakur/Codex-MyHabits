import { z } from "zod";
import { ApiError, withApi } from "@/lib/api";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApi(request, async ({ client, user }) => {
    const { data, error } = await client.from("tracker_habit_relationships").delete().eq("id", z.uuid().parse((await params).id)).eq("user_id", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "Relationship not found.");
    return { ok: true };
  });
}

import { z } from "zod";
import { ApiError, jsonBody, withApi } from "@/lib/api";
import { type Habit, type HabitPause, type ScheduleVersion } from "@/lib/domain";
import { materializeRoutine, routineDefinitions } from "@/lib/routine-data";
import { routineRunsOn } from "@/lib/routines";

type Params = { params: Promise<{ id: string }> };
const inputSchema = z.object({ date: z.iso.date() }).strict();
export async function POST(request: Request, { params }: Params) {
  return withApi(request, async ({ client, user }) => {
    const id = z.uuid().parse((await params).id);
    const input = inputSchema.parse(await jsonBody(request));
    const definitions = await routineDefinitions(client, user.id);
    const routine = definitions.routines.find(value => value.id === id);
    if (!routine) throw new ApiError(404, "Routine not found.");
    if (!routineRunsOn(routine, input.date, definitions.pauses)) throw new ApiError(400, "Routine is not scheduled on this date.");
    const [habits, versions, pauses] = await Promise.all([
      client.from("tracker_habits").select("*").eq("user_id", user.id),
      client.from("tracker_habit_schedule_versions").select("*").eq("user_id", user.id),
      client.from("tracker_habit_pauses").select("*").eq("user_id", user.id),
    ]);
    if (habits.error || versions.error || pauses.error) throw Error("Unable to prepare routine.");
    const occurrenceId = await materializeRoutine(client, routine, definitions.items, input.date, habits.data as Habit[], versions.data as ScheduleVersion[], pauses.data as HabitPause[], definitions.pauses);
    return { occurrenceId };
  });
}

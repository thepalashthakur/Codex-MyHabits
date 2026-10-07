import { userDatabase } from "@/lib/auth";
import { localDate, type Area, type Habit, type HabitLog, type HabitPause, type ScheduleVersion } from "@/lib/domain";
export async function appData() {
  const { client, user } = await userDatabase();
  const [habitsResult, areasResult, profileResult, versionsResult, pausesResult] = await Promise.all([
    client.from("tracker_habits").select("*").eq("user_id", user.id).order("position").order("created_at"),
    client.from("tracker_areas").select("*").eq("user_id", user.id).order("position"),
    client.from("tracker_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    client.from("tracker_habit_schedule_versions").select("*").eq("user_id", user.id),
    client.from("tracker_habit_pauses").select("*").eq("user_id", user.id),
  ]);
  if (habitsResult.error || areasResult.error || profileResult.error || versionsResult.error) throw Error("Unable to load your habits.");
  if (pausesResult.error && !["PGRST205", "42P01"].includes(pausesResult.error.code)) throw Error("Unable to load habit pauses.");
  const timezone = profileResult.data?.timezone ?? "UTC";
  return { client, user, habits: habitsResult.data as Habit[], areas: areasResult.data as Area[], versions: versionsResult.data as ScheduleVersion[], pauses: (pausesResult.data ?? []) as HabitPause[], profile: profileResult.data as { timezone: string; theme: string } | null, timezone, today: localDate(timezone) };
}
export async function logsBetween(userId: string, client: Awaited<ReturnType<typeof userDatabase>>["client"], from: string, to: string, habitId?: string) {
  const logs: HabitLog[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client.from("tracker_habit_logs").select("*").eq("user_id", userId).gte("date", from).lte("date", to);
    if (habitId) query = query.eq("habit_id", habitId);
    const { data, error } = await query.order("date").order("id").range(offset, offset + 999);
    if (error) throw Error("Unable to load habit history.");
    logs.push(...(data as HabitLog[]));
    if (!data || data.length < 1000) break;
  }
  return logs;
}

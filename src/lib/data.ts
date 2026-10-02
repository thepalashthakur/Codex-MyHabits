import { userDatabase } from "@/lib/auth";
import { localDate, type Area, type Habit, type HabitLog } from "@/lib/domain";
export async function appData() {
  const { client, user } = await userDatabase();
  const [habitsResult, areasResult, profileResult] = await Promise.all([
    client.from("habits").select("*").eq("user_id", user.id).order("position").order("created_at"),
    client.from("areas").select("*").eq("user_id", user.id).order("position"),
    client.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (habitsResult.error || areasResult.error || profileResult.error) throw Error("Unable to load your habits.");
  const timezone = profileResult.data?.timezone ?? "UTC";
  return { client, user, habits: habitsResult.data as Habit[], areas: areasResult.data as Area[], profile: profileResult.data as { timezone: string; theme: string } | null, timezone, today: localDate(timezone) };
}
export async function logsBetween(userId: string, client: Awaited<ReturnType<typeof userDatabase>>["client"], from: string, to: string) {
  const { data, error } = await client.from("habit_logs").select("*").eq("user_id", userId).gte("date", from).lte("date", to);
  if (error) throw Error("Unable to load habit history.");
  return data as HabitLog[];
}

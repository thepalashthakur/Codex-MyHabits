import type { SupabaseClient } from "@supabase/supabase-js";

export type HabitTimeEntry = {
  id: string;
  tracker_habit_id: string | null;
  status: "running" | "paused" | "stopped";
  start_at: string;
  end_at: string | null;
  last_resumed_at: string | null;
  elapsed_seconds: number;
};

export type HabitTimerSnapshot = {
  available: boolean;
  active: HabitTimeEntry | null;
  anotherTimerActive: boolean;
  totalSeconds: number;
  recent: HabitTimeEntry[];
};

const entryFields = "id,tracker_habit_id,status,start_at,end_at,last_resumed_at,elapsed_seconds";

export async function habitTimerSnapshot(client: SupabaseClient, userId: string, habitId: string): Promise<HabitTimerSnapshot> {
  const { data: access, error: accessError } = await client.rpc("has_app_access", { app_key: "timelogger" });
  if (accessError || access !== true) return { available: false, active: null, anotherTimerActive: false, totalSeconds: 0, recent: [] };
  const [activeResult, recentResult, totalResult] = await Promise.all([
    client.from("timelogger_time_entries").select(entryFields).eq("user_id", userId)
      .in("status", ["running", "paused"]).maybeSingle(),
    client.from("timelogger_time_entries").select(entryFields).eq("user_id", userId)
      .eq("tracker_habit_id", habitId).order("start_at", { ascending: false }).limit(10),
    client.rpc("tracker_habit_time_total", { p_habit_id: habitId }),
  ]);
  if (activeResult.error || recentResult.error || totalResult.error) {
    throw new Error("Unable to load habit time. Apply the habit time database migration.");
  }
  const globalActive = activeResult.data as HabitTimeEntry | null;
  return {
    available: true,
    active: globalActive?.tracker_habit_id === habitId ? globalActive : null,
    anotherTimerActive: Boolean(globalActive && globalActive.tracker_habit_id !== habitId),
    totalSeconds: Number(totalResult.data ?? 0),
    recent: (recentResult.data ?? []) as HabitTimeEntry[],
  };
}

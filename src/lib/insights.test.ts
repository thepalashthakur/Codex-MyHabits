import { describe, expect, it } from "vitest";
import type { Area, Habit, HabitLog, HabitPause } from "./domain";
import { getAreaPerformance, getHabitRankings, getOverallConsistency, getPeriodComparison, getWeekdayPerformance, type InsightData } from "./insights";

const area: Area = { id: "a", user_id: "u", name: "Health", color: null, icon: null, position: 0 };
const habit: Habit = { id: "h", user_id: "u", area_id: "a", name: "Walk", description: null, type: "GOOD", tracking_type: "BOOLEAN", goal_value: null, unit: null, schedule_type: "DAILY", schedule_config: {}, start_date: "2026-10-01", end_date: null, color: null, icon: null, position: 0, is_archived: false, archived_at: null };
const log = (date: string): HabitLog => ({ id: date, habit_id: "h", user_id: "u", date, status: "COMPLETED", value: null });
const pause: HabitPause = { id: "p", habit_id: "h", user_id: "u", start_date: "2026-10-03", end_date: "2026-10-04", reason: null, note: null };

describe("insights", () => {
  const data: InsightData = { habits: [habit], logs: [log("2026-10-01"), log("2026-10-02"), log("2026-10-05")], versions: [], pauses: [pause], areas: [area] };
  it("excludes paused days from consistency, weekdays and areas", () => {
    expect(getOverallConsistency(data, "2026-10-01", "2026-10-05")).toMatchObject({ completed: 3, opportunities: 3, rate: 1 });
    expect(getWeekdayPerformance(data, "2026-10-01", "2026-10-05").reduce((sum, row) => sum + row.opportunities, 0)).toBe(3);
    expect(getAreaPerformance(data, "2026-10-01", "2026-10-05")[0]).toMatchObject({ completed: 3, opportunities: 3, habitCount: 1, rate: 1 });
  });
  it("compares equivalent periods and waits for enough data before ranking", () => {
    expect(getPeriodComparison(data, "2026-10-03", "2026-10-05")).toMatchObject({ previousFrom: "2026-09-30", previousTo: "2026-10-02" });
    expect(getHabitRankings(data, "2026-10-01", "2026-10-05").strongest).toHaveLength(0);
  });
});

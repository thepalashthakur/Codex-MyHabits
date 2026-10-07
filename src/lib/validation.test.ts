import { describe, expect, it } from "vitest";
import { habitInput, pauseInput, relationshipInput } from "./validation";

const measured = { name: "Walk", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 8000, unit: "steps", schedule_type: "DAILY", schedule_config: {}, start_date: "2026-10-01" };

describe("V2 planning validation", () => {
  it("accepts ordered goal tiers and distinct positive increments", () => {
    expect(habitInput.safeParse({ ...measured, minimum_goal_value: 5000, stretch_goal_value: 10000, quick_increments: [500, 1000] }).success).toBe(true);
    expect(habitInput.safeParse({ ...measured, minimum_goal_value: 9000 }).success).toBe(false);
    expect(habitInput.safeParse({ ...measured, stretch_goal_value: 7000 }).success).toBe(false);
    expect(habitInput.safeParse({ ...measured, quick_increments: [500, 500] }).success).toBe(false);
    expect(habitInput.safeParse({ ...measured, quick_increments: [-1] }).success).toBe(false);
  });
  it("rejects invalid pause ranges and self relationships", () => {
    expect(pauseInput.safeParse({ start_date: "2026-10-07", end_date: "2026-10-06" }).success).toBe(false);
    expect(pauseInput.safeParse({ start_date: "2026-10-07", end_date: null }).success).toBe(true);
    const id = "11111111-1111-4111-8111-111111111111";
    expect(relationshipInput.safeParse({ source_habit_id: id, target_habit_id: id, type: "AFTER" }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { prepareLog } from "./logging";
import type { Habit } from "./domain";
const habit: Habit = { id: "h", user_id: "u", area_id: null, name: "Water", description: null, type: "GOOD", tracking_type: "MEASURABLE", goal_value: 3, unit: "L", schedule_type: "DAILY", schedule_config: {}, start_date: "2026-10-01", end_date: null, color: null, icon: null, position: 0, is_archived: false, archived_at: null };
describe("log rules", () => {
  it("accepts measured progress and strips values from failures", () => { expect(prepareLog(habit,"2026-10-03","COMPLETED",3)).toEqual({ status:"COMPLETED", value:3 }); expect(prepareLog(habit,"2026-10-03","FAILED",3)).toEqual({ status:"FAILED", value:null }); });
  it("requires measured values", () => expect(() => prepareLog(habit,"2026-10-03","COMPLETED")).toThrow("value"));
  it("supports skip and undo", () => { expect(prepareLog(habit,"2026-10-03","SKIPPED")).toEqual({ status:"SKIPPED", value:null }); expect(prepareLog(habit,"2026-10-03",null)).toBeNull(); });
  it("rejects unscheduled and archived dates", () => { expect(() => prepareLog(habit,"2026-09-30","COMPLETED",3)).toThrow("not scheduled"); expect(() => prepareLog({ ...habit, is_archived:true },"2026-10-03","COMPLETED",3)).toThrow("not scheduled"); });
});

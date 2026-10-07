import { describe, expect, it } from "vitest";
import { csvText, importSchema } from "./portability";

const habitId = "11111111-1111-4111-8111-111111111111";
const areaId = "22222222-2222-4222-8222-222222222222";
const packageData = {
  format: "myhabits-v2", version: 2, exportedAt: "2026-10-07T00:00:00.000Z",
  areas: [{ id: areaId, name: "Health", position: 0 }],
  habits: [{ id: habitId, area_id: areaId, name: "Walk", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 8000, unit: "steps", schedule_type: "DAILY", schedule_config: {}, start_date: "2026-10-01", quick_increments: [500, 1000] }],
  logs: [{ habit_id: habitId, date: "2026-10-02", status: "COMPLETED", value: 6420 }],
  notes: [], reminders: [], pauses: [], relationships: [], versions: [],
};

describe("portable data", () => {
  it("accepts an exported v2 package with partial measurable progress", () => {
    expect(importSchema.safeParse(packageData).success).toBe(true);
  });
  it("rejects missing references, duplicate logs and overlapping pauses", () => {
    expect(importSchema.safeParse({ ...packageData, logs: [...packageData.logs, ...packageData.logs] }).success).toBe(false);
    expect(importSchema.safeParse({ ...packageData, habits: [{ ...packageData.habits[0], area_id: "33333333-3333-4333-8333-333333333333" }] }).success).toBe(false);
    const pauses = [{ habit_id: habitId, start_date: "2026-10-01", end_date: "2026-10-03" }, { habit_id: habitId, start_date: "2026-10-03", end_date: null }];
    expect(importSchema.safeParse({ ...packageData, pauses }).success).toBe(false);
  });
  it("escapes CSV cells and neutralizes spreadsheet formulas", () => {
    expect(csvText([{ name: '=HYPERLINK("x")', note: 'a,b' }], ["name", "note"])).toContain("'=" );
    expect(csvText([{ name: "A" }], ["name"])).toContain('"A"');
  });
});

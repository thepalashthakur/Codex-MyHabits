import { z } from "zod";
export const dateSchema = z.iso.date();
const text = (max: number) => z.string().trim().min(1).max(max);
export const areaInput = z.object({ name: text(80), color: z.string().max(30).nullable().optional(), icon: z.string().max(40).nullable().optional(), position: z.number().int().min(0).optional() }).strict();
const schedule = z.discriminatedUnion("schedule_type", [
  z.object({ schedule_type: z.literal("DAILY"), schedule_config: z.object({}).strict() }),
  z.object({ schedule_type: z.literal("WEEKDAYS"), schedule_config: z.object({ weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7) }).strict() }),
  z.object({ schedule_type: z.literal("WEEKLY_TARGET"), schedule_config: z.object({ target: z.number().int().min(1).max(7) }).strict() }),
  z.object({ schedule_type: z.literal("MONTHLY_TARGET"), schedule_config: z.object({ target: z.number().int().min(1).max(31) }).strict() }),
  z.object({ schedule_type: z.literal("INTERVAL"), schedule_config: z.object({ interval: z.number().int().min(1).max(365) }).strict() }),
]);
export const habitInput = z.object({ name: text(120), description: z.string().max(2000).nullable().optional(), area_id: z.uuid().nullable().optional(), type: z.enum(["GOOD", "BAD"]), tracking_type: z.enum(["BOOLEAN", "MEASURABLE"]), goal_value: z.number().positive().max(1e9).nullable().optional(), unit: z.string().trim().max(40).nullable().optional(), start_date: dateSchema, end_date: dateSchema.nullable().optional(), color: z.string().max(30).nullable().optional(), icon: z.string().max(40).nullable().optional(), position: z.number().int().min(0).optional() }).and(schedule).refine(v => v.tracking_type === "BOOLEAN" || (v.goal_value != null && Boolean(v.unit)), "Measured habits need a goal and unit").refine(v => !v.end_date || v.end_date >= v.start_date, "End date must follow start date");
export const logInput = z.object({ habit_id: z.uuid(), date: dateSchema, status: z.enum(["COMPLETED", "FAILED", "SKIPPED"]).nullable(), value: z.number().min(0).max(1e9).nullable().optional() }).strict();
export const noteInput = z.object({ habit_id: z.uuid(), date: dateSchema.nullable().optional(), content: text(4000) }).strict();
export const reminderInput = z.object({ habit_id: z.uuid(), time: z.iso.time(), timezone: text(80), enabled: z.boolean().default(true) }).strict();
export const profileInput = z.object({ timezone: text(80).optional(), theme: z.enum(["light", "dark", "system"]).optional() }).strict();

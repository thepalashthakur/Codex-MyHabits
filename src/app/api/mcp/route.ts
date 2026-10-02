import { apiDatabase } from "@/lib/auth";
import { areaInput, habitInput, logInput } from "@/lib/validation";
import { isHabitScheduledForDate, type Habit } from "@/lib/domain";
import { z } from "zod";
export const dynamic = "force-dynamic";
const tools = [
  { name: "list_habits", description: "List your active or archived habits", inputSchema: { type: "object", properties: { archived: { type: "boolean" } } } },
  { name: "create_area", description: "Create a habit area", inputSchema: { type: "object", properties: { name: { type: "string" }, color: { type: "string" } }, required: ["name"] } },
  { name: "create_habit", description: "Create a habit", inputSchema: { type: "object", properties: { name: { type: "string" }, type: { enum: ["GOOD", "BAD"] }, tracking_type: { enum: ["BOOLEAN", "MEASURABLE"] }, goal_value: { type: "number" }, unit: { type: "string" }, schedule_type: { enum: ["DAILY", "WEEKDAYS", "WEEKLY_TARGET", "MONTHLY_TARGET", "INTERVAL"] }, schedule_config: { type: "object" }, start_date: { type: "string" }, area_id: { type: "string" } }, required: ["name", "type", "tracking_type", "schedule_type", "schedule_config", "start_date"] } },
  { name: "update_habit", description: "Update a habit or archive it", inputSchema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, is_archived: { type: "boolean" } }, required: ["id"] } },
  { name: "log_habit", description: "Complete, fail, skip, or undo a habit for a local date", inputSchema: { type: "object", properties: { habit_id: { type: "string" }, date: { type: "string" }, status: { enum: ["COMPLETED", "FAILED", "SKIPPED", null] }, value: { type: "number" } }, required: ["habit_id", "date", "status"] } },
];
const rpc = z.object({ jsonrpc: z.literal("2.0"), id: z.union([z.string(), z.number()]).optional(), method: z.string(), params: z.unknown().optional() });
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return Response.json({ error: "Bearer token required" }, { status: 401 });
  const context = await apiDatabase(request);
  if (!context) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let message: z.infer<typeof rpc>;
  try { message = rpc.parse(await request.json()); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400 }); }
  const reply = (value: unknown) => Response.json({ jsonrpc: "2.0", id: message.id ?? null, result: value }, { headers: { "Cache-Control": "private, no-store" } });
  if (message.method === "initialize") return reply({ protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "myhabits", version: "0.1.0" } });
  if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
  if (message.method === "tools/list") return reply({ tools });
  if (message.method !== "tools/call") return Response.json({ jsonrpc: "2.0", id: message.id ?? null, error: { code: -32601, message: "Method not found" } });
  try {
    const params = z.object({ name: z.string(), arguments: z.unknown().optional() }).parse(message.params);
    const arg = params.arguments ?? {};
    const { client, user } = context;
    let output: unknown;
    if (params.name === "list_habits") {
      const input = z.object({ archived: z.boolean().optional() }).parse(arg);
      const { data, error } = await client.from("habits").select("*").eq("user_id", user.id).eq("is_archived", input.archived ?? false).order("position"); if (error) throw error; output = data;
    } else if (params.name === "create_area") {
      const input = areaInput.parse(arg); const { data, error } = await client.from("areas").insert({ ...input, user_id: user.id }).select().single(); if (error) throw error; output = data;
    } else if (params.name === "create_habit") {
      const input = habitInput.parse(arg);
      if (input.area_id) { const { data } = await client.from("areas").select("id").eq("id", input.area_id).eq("user_id", user.id).maybeSingle(); if (!data) throw Error("Area not found"); }
      const { data, error } = await client.from("habits").insert({ ...input, user_id: user.id }).select().single(); if (error) throw error; output = data;
    } else if (params.name === "update_habit") {
      const input = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(120).optional(), is_archived: z.boolean().optional() }).strict().parse(arg);
      const { data: existing } = await client.from("habits").select("id").eq("id", input.id).eq("user_id", user.id).maybeSingle(); if (!existing) throw Error("Habit not found");
      const { data, error } = await client.from("habits").update({ name: input.name, is_archived: input.is_archived, archived_at: input.is_archived === undefined ? undefined : input.is_archived ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", input.id).eq("user_id", user.id).select().single(); if (error) throw error; output = data;
    } else if (params.name === "log_habit") {
      const input = logInput.parse(arg);
      const { data } = await client.from("habits").select("*").eq("id", input.habit_id).eq("user_id", user.id).maybeSingle(); if (!data) throw Error("Habit not found");
      const habit = data as Habit; if (!isHabitScheduledForDate(habit, input.date)) throw Error("Habit is not scheduled for that date");
      if (input.status === null) { const { error } = await client.from("habit_logs").delete().eq("habit_id", input.habit_id).eq("user_id", user.id).eq("date", input.date); if (error) throw error; output = { undone: true }; }
      else { if (habit.tracking_type === "MEASURABLE" && input.status === "COMPLETED" && input.value == null) throw Error("Value required"); const { data: saved, error } = await client.from("habit_logs").upsert({ habit_id: habit.id, user_id: user.id, date: input.date, status: input.status, value: input.status === "COMPLETED" ? (input.value ?? null) : null, updated_at: new Date().toISOString() }, { onConflict: "habit_id,date" }).select().single(); if (error) throw error; output = saved; }
    } else throw Error("Unknown tool");
    return reply({ content: [{ type: "text", text: JSON.stringify(output) }] });
  } catch (error) {
    return reply({ isError: true, content: [{ type: "text", text: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error && ["Area not found", "Habit not found", "Habit is not scheduled for that date", "Value required", "Unknown tool"].includes(error.message) ? error.message : "Tool request failed" }] });
  }
}

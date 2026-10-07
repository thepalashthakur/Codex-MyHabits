import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ZodError } from "zod";
import { apiDatabase } from "@/lib/auth";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export type Context = { user: User; client: SupabaseClient };
export async function withApi(request: Request, handler: (context: Context) => Promise<unknown>) {
  try {
    const context = await apiDatabase(request);
    if (!context) throw new ApiError(401, "Sign in required.");
    if (request.method !== "GET" && !request.headers.get("authorization")) {
      if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApiError(403, "Origin not allowed.");
    }
    const value = await handler(context);
    if (value instanceof Response) return value;
    return Response.json(value, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
export async function jsonBody(request: Request, maxBytes = 32768) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "Send JSON.");
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new ApiError(413, "Request too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Send JSON.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new ApiError(413, "Request too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; } catch { throw new ApiError(400, "Invalid JSON."); }
}
export async function owned(context: Context, table: "tracker_habits" | "tracker_areas" | "tracker_habit_notes" | "tracker_habit_reminders", id: string) {
  const { data, error } = await context.client.from(table).select("id").eq("id", id).eq("user_id", context.user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "Not found.");
}
export function result<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

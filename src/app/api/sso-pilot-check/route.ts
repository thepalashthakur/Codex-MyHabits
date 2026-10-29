import { browserSsoSession, ssoConfig, validateAccess } from "@/lib/sso";

// Temporary, read-only pilot probe. Remove after recording the live result.
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "feat/sso-pilot") {
    return new Response(null, { status: 404 });
  }
  const session = await browserSsoSession();
  const config = ssoConfig();
  if (!session || !config) return new Response(null, { status: 401 });
  await validateAccess(session.accessToken, session.subject);
  const headers = { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${session.accessToken}` };
  const base = `${config.provider}/rest/v1`;
  const [habits, timeloggerAccess, timeloggerGuard, independentTimeEntries] = await Promise.all([
    fetch(`${base}/tracker_habits?select=id,name&limit=10`, { headers, cache: "no-store", signal: AbortSignal.timeout(10000) }),
    fetch(`${base}/rpc/has_app_access`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ app_key: "timelogger" }), cache: "no-store", signal: AbortSignal.timeout(10000) }),
    fetch(`${base}/rpc/require_timelogger_access`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}", cache: "no-store", signal: AbortSignal.timeout(10000) }),
    fetch(`${base}/timelogger_time_entries?select=id&tracker_habit_id=is.null&limit=10`, { headers, cache: "no-store", signal: AbortSignal.timeout(10000) }),
  ]);
  const habitRows = habits.ok ? await habits.json() as { name: string }[] : null;
  const timeRows = independentTimeEntries.ok ? await independentTimeEntries.json() as unknown[] : null;
  const result = {
    habitsStatus: habits.status,
    hasSmokeHabit: habitRows?.some(row => row.name === "SSO new-user smoke 2026-10-27") ?? false,
    timeloggerAccessStatus: timeloggerAccess.status,
    timeloggerAccess: timeloggerAccess.ok ? await timeloggerAccess.json() : null,
    timeloggerGuardStatus: timeloggerGuard.status,
    timeloggerGuardCode: timeloggerGuard.ok ? null : (await timeloggerGuard.json() as { code?: string }).code,
    independentTimeEntriesStatus: independentTimeEntries.status,
    independentTimeEntriesVisible: timeRows?.length ?? null,
  };
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

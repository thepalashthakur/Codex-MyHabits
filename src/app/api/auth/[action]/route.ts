import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieClient, isConfigured } from "@/lib/supabase";
import { hasMyHabitsAccess, isUseAuthConfigured, requestUseAuth } from "@/lib/useauth";
import { cookieOptions, sessionCookie } from "@/lib/sso";
export const dynamic = "force-dynamic";
const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });
const emailOnly = credentials.pick({ email: true });
type Context = { params: Promise<{ action: string }> };
export async function POST(request: Request, { params }: Context) {
  const action = (await params).action;
  if (!["sign-in", "sign-up", "sign-out", "resend-confirmation"].includes(action)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isConfigured() || (action !== "sign-out" && !isUseAuthConfigured())) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  let body: unknown;
  try { if (Number(request.headers.get("content-length") ?? 0) > 16384) throw Error(); body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (action === "sign-out") { const client = await cookieClient(); await client.auth.signOut({ scope: "local" }); const response = NextResponse.json({ ok: true }); response.cookies.set(sessionCookie, "", cookieOptions(0)); return response; }
  if (action === "resend-confirmation") {
    const parsed = emailOnly.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    try {
      const result = await requestUseAuth("resend-confirmation", parsed.data);
      if (result.status === 429) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
      if (result.status < 200 || result.status >= 300) return NextResponse.json({ error: "Unable to resend confirmation right now." }, { status: 502 });
      return NextResponse.json({ message: result.data.message ?? "If this address needs confirmation, a new link will arrive shortly." });
    } catch { return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 }); }
  }
  const client = await cookieClient();
  const parsed = credentials.safeParse(body);
  if (!parsed.success || (action === "sign-up" && parsed.data.password.length < 8)) return NextResponse.json({ error: "Enter a valid email and password (at least 8 characters to sign up)." }, { status: 400 });
  const { email, password } = parsed.data;
  try {
    const result = await requestUseAuth(action === "sign-up" ? "sign-up" : "sign-in", { email, password });
    if (result.status < 200 || result.status >= 300) {
      const message = result.status === 429 ? "Too many attempts. Please try again later." : action === "sign-in" ? "Check your credentials and confirm your email." : "Unable to create account.";
      return NextResponse.json({ error: message }, { status: result.status === 429 ? 429 : action === "sign-in" ? 401 : 400 });
    }
    const session = result.data.session;
    if (!session) {
      if (action === "sign-up" && result.data.confirmation_required) return NextResponse.json({ ok: true, confirmationRequired: true }, { status: 201 });
      return NextResponse.json({ error: "Invalid authentication response." }, { status: 502 });
    }
    if (typeof session.access_token !== "string" || typeof session.refresh_token !== "string" || !result.data.user?.id) return NextResponse.json({ error: "Invalid authentication response." }, { status: 502 });
    const local = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (local.error || !local.data.user || local.data.user.id !== result.data.user.id) {
      await client.auth.signOut({ scope: "local" });
      return NextResponse.json({ error: "UseAuth and MyHabits are not connected to the same Supabase project." }, { status: 503 });
    }
    if (!await hasMyHabitsAccess(client)) {
      await client.auth.signOut({ scope: "local" });
      return NextResponse.json({ error: "Access to MyHabits is not enabled for this account." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, confirmationRequired: false });
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 });
  }
}

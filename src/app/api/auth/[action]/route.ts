import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieClient, isConfigured } from "@/lib/supabase";
export const dynamic = "force-dynamic";
const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });
type Context = { params: Promise<{ action: string }> };
export async function POST(request: Request, { params }: Context) {
  const action = (await params).action;
  if (!["sign-in", "sign-up", "sign-out"].includes(action)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isConfigured()) return NextResponse.json({ error: "Connect Supabase to enable sign-in." }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  let body: unknown;
  try { if (Number(request.headers.get("content-length") ?? 0) > 16384) throw Error(); body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const client = await cookieClient();
  if (action === "sign-out") { await client.auth.signOut({ scope: "local" }); return NextResponse.json({ ok: true }); }
  const parsed = credentials.safeParse(body);
  if (!parsed.success || (action === "sign-up" && parsed.data.password.length < 8)) return NextResponse.json({ error: "Enter a valid email and password (at least 8 characters to sign up)." }, { status: 400 });
  const { email, password } = parsed.data;
  const result = action === "sign-up" ? await client.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.APP_URL ?? new URL(request.url).origin}/auth/confirm` } }) : await client.auth.signInWithPassword({ email, password });
  if (result.error) return NextResponse.json({ error: action === "sign-in" ? "Check your credentials and confirm your email." : "Unable to create account." }, { status: 400 });
  return NextResponse.json({ ok: true, confirmationRequired: !result.data.session });
}

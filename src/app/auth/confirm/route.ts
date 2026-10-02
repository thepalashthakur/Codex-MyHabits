import { NextResponse } from "next/server";
import { cookieClient } from "@/lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url); const hash = url.searchParams.get("token_hash"); const type = url.searchParams.get("type");
  if (hash && (type === "email" || type === "signup")) {
    const client = await cookieClient(); const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error) return NextResponse.redirect(new URL("/today", url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=confirmation", url.origin));
}

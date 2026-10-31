import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, parseSession, refreshSession, seal, sessionCookie, ssoConfig } from "@/lib/sso";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const sso = parseSession(request.cookies.get(sessionCookie)?.value, true);
  if (sso) {
    if (sso.expiresAt <= Date.now() + 120000) {
      try {
        const updated = await refreshSession(sso);
        const config = ssoConfig()!;
        const value = seal(updated, config.key);
        request.cookies.set(sessionCookie, value);
        response = NextResponse.next({ request });
        response.cookies.set(sessionCookie, value, cookieOptions(60 * 60 * 24 * 7));
        response.headers.set("Cache-Control", "private, no-store");
      } catch { /* Leave the cookie for a later retry; expired tokens fail closed in auth.ts. */ }
    }
    return response;
  }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const client = createServerClient(url, key, { cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" }, cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      response.headers.set("Cache-Control", "private, no-store");
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  await client.auth.getClaims();
  return response;
}
export const config = { matcher: ["/today/:path*", "/habits/:path*", "/areas/:path*", "/history/:path*", "/analytics/:path*", "/insights/:path*", "/routines/:path*", "/routine-occurrences/:path*", "/settings/:path*", "/api/:path*"] };

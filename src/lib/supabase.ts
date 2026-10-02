import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return { url, key };
}
export function isConfigured() { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && !process.env.SUPABASE_URL.includes("your-project")); }
export async function cookieClient() {
  const store = await cookies(); const { url, key } = config();
  return createServerClient(url, key, { cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" }, cookies: {
    getAll: () => store.getAll(),
    setAll(values) { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Proxy refreshes read-only server component cookies. */ } },
  } });
}
export function bearerClient(token: string) {
  const { url, key } = config();
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}

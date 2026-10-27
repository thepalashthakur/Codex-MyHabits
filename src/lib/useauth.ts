import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UseAuthSession = {
  access_token: string;
  refresh_token: string;
};

export type UseAuthResponse = {
  error?: { code?: string; message?: string };
  message?: string;
  user?: { id: string };
  session?: UseAuthSession | null;
  confirmation_required?: boolean;
};

export function getUseAuthOrigin() {
  const raw = process.env.USEAUTH_URL;
  if (!raw) throw new Error("USEAUTH_URL is missing");
  const url = new URL(raw);
  if (
    (url.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && url.origin.startsWith("http://localhost:"))) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    raw !== url.origin
  ) throw new Error("USEAUTH_URL must be an HTTPS origin");
  return url.origin;
}

export function isUseAuthConfigured() {
  try { getUseAuthOrigin(); return true; } catch { return false; }
}

export async function hasMyHabitsAccess(client: SupabaseClient) {
  const { data, error } = await client.rpc("has_app_access", { app_key: "myhabits" });
  if (error) throw new Error("Unable to check MyHabits access. Please retry.");
  return data === true;
}

export async function requestUseAuth(action: "sign-in" | "sign-up", body: { email: string; password: string }): Promise<{ status: number; data: UseAuthResponse }>;
export async function requestUseAuth(action: "resend-confirmation", body: { email: string }): Promise<{ status: number; data: UseAuthResponse }>;
export async function requestUseAuth(action: "sign-in" | "sign-up" | "resend-confirmation", body: { email: string; password?: string }) {
  const response = await fetch(`${getUseAuthOrigin()}/api/v1/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json() as UseAuthResponse;
  if (!data || typeof data !== "object") throw new Error("Invalid UseAuth response");
  return { status: response.status, data };
}

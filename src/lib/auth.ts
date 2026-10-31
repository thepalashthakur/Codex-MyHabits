import "server-only";
import { redirect } from "next/navigation";
import { AuthRetryableFetchError, type SupabaseClient, type User } from "@supabase/supabase-js";
import { bearerClient, cookieClient, isConfigured } from "@/lib/supabase";
import { hasMyHabitsAccess } from "@/lib/useauth";
import { browserSsoSession } from "@/lib/sso";

export async function getCurrentUser(): Promise<User | null> {
  if (!isConfigured()) return null;
  const sso = await browserSsoSession();
  const client = sso ? bearerClient(sso.accessToken) : await cookieClient();
  const { data, error } = await client.auth.getUser(sso?.accessToken);
  if (error instanceof AuthRetryableFetchError) throw new Error("Authentication is temporarily unavailable. Please retry.");
  return error || !data.user || !await hasMyHabitsAccess(client) ? null : data.user;
}
export async function requireUser() { const user = await getCurrentUser(); if (!user) redirect("/sign-in"); return user; }
export async function getCurrentUserId() { return (await requireUser()).id; }
export async function userDatabase() {
  if (!isConfigured()) redirect("/sign-in");
  const sso = await browserSsoSession();
  const client = sso ? bearerClient(sso.accessToken) : await cookieClient();
  const { data, error } = await client.auth.getUser(sso?.accessToken);
  if (error instanceof AuthRetryableFetchError) throw new Error("Authentication is temporarily unavailable. Please retry.");
  if (error || !data.user || !await hasMyHabitsAccess(client)) redirect("/sign-in");
  return { user: data.user, client };
}
export async function apiDatabase(request: Request): Promise<{ user: User; client: SupabaseClient } | null> {
  if (!isConfigured()) return null;
  const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  const sso = token ? null : await browserSsoSession();
  const effectiveToken = token ?? sso?.accessToken;
  const client = effectiveToken ? bearerClient(effectiveToken) : await cookieClient();
  const { data, error } = await client.auth.getUser(effectiveToken);
  if (error instanceof AuthRetryableFetchError) throw new Error("Authentication is temporarily unavailable. Please retry.");
  return error || !data.user || !await hasMyHabitsAccess(client) ? null : { user: data.user, client };
}

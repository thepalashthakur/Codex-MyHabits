import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { bearerClient, cookieClient } from "@/lib/supabase";

export async function getCurrentUser(): Promise<User | null> {
  const client = await cookieClient();
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
export async function requireUser() { const user = await getCurrentUser(); if (!user) redirect("/sign-in"); return user; }
export async function getCurrentUserId() { return (await requireUser()).id; }
export async function userDatabase() {
  const client = await cookieClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/sign-in");
  return { user: data.user, client };
}
export async function apiDatabase(request: Request): Promise<{ user: User; client: SupabaseClient } | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  const client = token ? bearerClient(token) : await cookieClient();
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : { user: data.user, client };
}

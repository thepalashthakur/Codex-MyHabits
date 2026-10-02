"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false); const [confirmation, setConfirmation] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try { const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) }); const body = await response.json(); if (!response.ok) throw Error(body.error); if (body.confirmationRequired) setConfirmation(true); else { router.replace("/today"); router.refresh(); } } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); } finally { setPending(false); }
  }
  return <div className="auth-wrap"><div className="auth-card"><p className="eyebrow">MYHABITS</p><div className="card"><h1>{mode === "sign-in" ? "Welcome back" : "Start tracking"}</h1><p className="subtle">{confirmation ? "Check your inbox to confirm your account." : "A calm place to build consistency."}</p>{!confirmation && <form className="form" onSubmit={submit}><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={mode === "sign-up" ? 8 : 1} required/></div>{error && <p role="alert" className="form-error">{error}</p>}<button className="button primary" disabled={pending}>{pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</button></form>}<footer>{mode === "sign-in" ? "New here?" : "Already have an account?"} <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"}>{mode === "sign-in" ? "Create account" : "Sign in"}</Link></footer></div></div></div>;
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
export function AuthForm({ mode, configured }: { mode: "sign-in" | "sign-up"; configured: boolean }) {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false); const [confirmation, setConfirmation] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try { const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) }); const body = await response.json(); if (!response.ok) throw Error(body.error); if (body.confirmationRequired) setConfirmation(true); else { router.replace("/today"); router.refresh(); } } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); } finally { setPending(false); }
  }
  return <div className="auth-wrap"><div className="auth-card"><p className="eyebrow">MYHABITS</p><Paper className="card" elevation={0}><h1>{mode === "sign-in" ? "Welcome back" : "Start tracking"}</h1><p className="subtle">{confirmation ? "Check your inbox to confirm your account." : "A calm place to build consistency."}</p>{!configured && <p className="form-error" role="status">Connect Supabase using the variables in .env.example to enable accounts.</p>}{!confirmation && <form className="form" onSubmit={submit}><TextField label="Email" name="email" type="email" autoComplete="email" required fullWidth /><TextField label="Password" name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} slotProps={{ htmlInput: { minLength: mode === "sign-up" ? 8 : 1 } }} required fullWidth />{error && <p role="alert" className="form-error">{error}</p>}<Button variant="contained" type="submit" disabled={pending || !configured} fullWidth>{pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</Button></form>}<footer>{mode === "sign-in" ? "New here?" : "Already have an account?"} <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"}>{mode === "sign-in" ? "Create account" : "Sign in"}</Link></footer></Paper></div></div>;
}

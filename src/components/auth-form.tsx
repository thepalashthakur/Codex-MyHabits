"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";

export function AuthForm({ mode, configured, recoveryUrl, ssoEnabled = false, ssoFailed = false }: { mode: "sign-in" | "sign-up"; configured: boolean; recoveryUrl?: string; ssoEnabled?: boolean; ssoFailed?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(ssoFailed ? "Shared sign-in could not be completed. Try again or use your password." : "");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      if (body.confirmationRequired) setConfirmation(true);
      else { router.replace("/today"); router.refresh(); }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally { setPending(false); }
  }

  async function resendConfirmation() {
    if (!email.trim()) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setNotice(body.message ?? "If this address needs confirmation, a new link will arrive shortly.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not resend confirmation.");
    } finally { setPending(false); }
  }

  return <div className="auth-wrap"><div className="auth-card"><p className="eyebrow">MYHABITS</p><Paper className="card" elevation={0}>
    <h1>{confirmation ? "Check your email" : mode === "sign-in" ? "Welcome back" : "Start tracking"}</h1>
    <p className="subtle">{confirmation ? "UseAuth sends the confirmation email for your shared account. Open its link, then return here and sign in with the same email and password." : "A calm place to build consistency."}</p>
    {!configured && <p className="form-error" role="status">Connect Supabase and UseAuth using the variables in .env.example to enable accounts.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {mode === "sign-in" && ssoEnabled && !confirmation && <p><a href="/auth/sso/start">Continue with shared account</a></p>}
    {!confirmation && <form className="form" onSubmit={submit}>
      <TextField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth />
      <TextField label="Password" name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} slotProps={{ htmlInput: { minLength: mode === "sign-up" ? 8 : 1 } }} required fullWidth />
      <Button variant="contained" type="submit" disabled={pending || !configured} fullWidth>{pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</Button>
    </form>}
    {confirmation && <p className="subtle">Check spam if the email does not arrive.</p>}
    {(confirmation || mode === "sign-in") && <Button type="button" onClick={() => void resendConfirmation()} disabled={pending || !configured || !email.trim()} fullWidth>Resend confirmation email</Button>}
    {mode === "sign-in" && !confirmation && <p className="subtle">Just registered? Confirm the email sent by UseAuth before signing in.</p>}
    <footer>{confirmation ? <Link href="/sign-in">Back to sign in</Link> : <>{mode === "sign-in" ? "New here?" : "Already have an account?"} <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"}>{mode === "sign-in" ? "Create account" : "Sign in"}</Link>{mode === "sign-in" && recoveryUrl && <> · <a href={recoveryUrl}>Forgot password?</a></>}</>}</footer>
  </Paper></div></div>;
}

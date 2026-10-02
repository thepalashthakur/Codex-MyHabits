"use client";
import { useRouter } from "next/navigation";
export function SignOut() { const router = useRouter(); async function signOut() { await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); router.replace("/sign-in"); router.refresh(); } return <button className="button" onClick={signOut}>Sign out</button>; }

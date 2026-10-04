"use client";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
export function SignOut() { const router = useRouter(); async function signOut() { await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); router.replace("/sign-in"); router.refresh(); } return <Button variant="outlined" onClick={signOut}>Sign out</Button>; }

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
export function SettingsForm({ timezone, theme }: { timezone: string; theme: string }) { const router = useRouter(); const [zone, setZone] = useState(timezone); const [appearance, setAppearance] = useState(theme); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function save(event: React.SubmitEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setMessage(""); const response = await fetch("/api/v1/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone: zone, theme: appearance }) }); const body = await response.json(); setPending(false); if (!response.ok) { setMessage(body.error); return; } localStorage.setItem("myhabits-theme", appearance); document.documentElement.dataset.theme = appearance === "system" ? "" : appearance; setMessage("Settings saved."); router.refresh(); }
  return <Paper component="form" variant="outlined" onSubmit={save} sx={{ maxWidth: 680, p: { xs: 2, sm: 3 } }}><Stack spacing={2.5}>
    <TextField label="Timezone" id="timezone" value={zone} onChange={e=>setZone(e.target.value)} required helperText="Use an IANA timezone such as Asia/Kolkata. Habit dates follow this timezone."/>
    <TextField select label="Appearance" id="theme" value={appearance} onChange={e=>setAppearance(e.target.value)}><MenuItem value="system">System</MenuItem><MenuItem value="light">Light</MenuItem><MenuItem value="dark">Dark</MenuItem></TextField>
    <Button variant="contained" type="submit" disabled={pending} sx={{ alignSelf: "flex-start" }}>{pending ? "Saving…" : "Save settings"}</Button>
    {message && <Alert severity={message === "Settings saved." ? "success" : "error"} role="status">{message}</Alert>}
  </Stack></Paper>;
}

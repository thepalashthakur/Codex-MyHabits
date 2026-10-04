"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
type Reminder = { id: string; time: string; timezone: string; enabled: boolean };
export function Reminders({ habitId, timezone, initial }: { habitId: string; timezone: string; initial: Reminder[] }) { const [items, setItems] = useState(initial); const [error, setError] = useState("");
  async function add(event: React.SubmitEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const time = String(new FormData(form).get("time")); const response = await fetch("/api/v1/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habit_id: habitId, time: `${time}:00`, timezone, enabled: true }) }); const body = await response.json(); if (response.ok) { setItems([...items, body.reminder]); form.reset(); } else setError(body.error); }
  async function remove(id: string) { const response = await fetch(`/api/v1/reminders/${id}`, { method: "DELETE" }); if (response.ok) setItems(items.filter(i => i.id !== id)); else setError("Could not delete reminder."); }
  return <Stack spacing={2}>
    <Typography color="text.secondary" variant="body2">Times are saved for future delivery. Notifications are not sent yet.</Typography>
    {items.map(item => <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }} key={item.id}><Typography>{item.time.slice(0,5)} · {item.timezone}</Typography><Button size="small" color="error" onClick={() => remove(item.id)}>Remove</Button></Stack>)}
    {items.length === 0 && <Typography color="text.secondary" variant="body2">No reminder times saved yet.</Typography>}
    <Stack component="form" direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { sm: "center" } }} spacing={1.5} onSubmit={add}>
      <TextField label="Add time" id="reminder-time" name="time" type="time" required slotProps={{ inputLabel: { shrink: true } }}/>
      <Button variant="outlined" type="submit">Save time</Button>
    </Stack>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
  </Stack>;
}

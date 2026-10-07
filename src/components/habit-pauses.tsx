"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { shiftDate, type HabitPause } from "@/lib/domain";

const reasons = ["", "Vacation", "Sick", "Recovery", "Unavailable", "Busy period", "Custom"];

export function HabitPauses({ habitId, today, pauses }: { habitId: string; today: string; pauses: HabitPause[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = pauses.find(pause => pause.start_date <= today && (!pause.end_date || pause.end_date >= today));

  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/habits/${habitId}/pauses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start_date: form.get("start_date"), end_date: form.get("end_date") || null, reason: form.get("reason") || null, note: form.get("note") || null }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not pause habit."); }
    finally { setBusy(false); }
  }

  async function resume(pause: HabitPause) {
    setBusy(true); setError("");
    const startedToday = pause.start_date >= today;
    try {
      const response = await fetch(`/api/v1/habits/${habitId}/pauses/${pause.id}`, { method: startedToday ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: startedToday ? undefined : JSON.stringify({ end_date: shiftDate(today, -1) }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not resume habit."); }
    finally { setBusy(false); }
  }

  return <><div className="actions"><Button variant="outlined" disabled={busy || Boolean(active)} onClick={() => setOpen(true)}>Pause habit</Button>{active && <Button variant="contained" disabled={busy} onClick={() => void resume(active)}>Resume habit</Button>}</div>
    {active && <p className="subtle">Paused since {active.start_date}{active.reason ? ` · ${active.reason}` : ""}. Paused days do not count as missed.</p>}
    {pauses.length > 0 && <details><summary>Pause history ({pauses.length})</summary><div className="list">{pauses.map(pause => <p className="subtle" key={pause.id}>{pause.start_date} – {pause.end_date || "ongoing"}{pause.reason ? ` · ${pause.reason}` : ""}</p>)}</div></details>}
    {error && <Alert severity="error" role="alert" sx={{ mt: 1 }}>{error}</Alert>}
    <Dialog open={open} onClose={() => !busy && setOpen(false)} aria-labelledby="pause-title"><form onSubmit={save}><DialogTitle id="pause-title">Pause habit</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><p className="subtle">Paused dates are excluded from your schedule and streak calculations.</p><TextField label="Start date" name="start_date" type="date" required defaultValue={today} slotProps={{ inputLabel: { shrink: true } }}/><TextField label="End date (optional)" name="end_date" type="date" slotProps={{ inputLabel: { shrink: true } }}/><TextField select label="Reason (optional)" name="reason" defaultValue="">{reasons.map(reason => <MenuItem key={reason} value={reason}>{reason || "No reason"}</MenuItem>)}</TextField><TextField label="Note (optional)" name="note" multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }}/></Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving…" : "Pause"}</Button></DialogActions></form></Dialog>
  </>;
}

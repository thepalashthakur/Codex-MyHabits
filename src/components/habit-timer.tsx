"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import type { HabitTimeEntry, HabitTimerSnapshot } from "@/lib/habit-time";

function secondsFor(entry: HabitTimeEntry, now: number) {
  const running = entry.status === "running" && entry.last_resumed_at
    ? Math.max(0, Math.floor((now - Date.parse(entry.last_resumed_at)) / 1000)) : 0;
  return Number(entry.elapsed_seconds) + running;
}

function duration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 3600)}:${String(Math.floor(total % 3600 / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function HabitTimer({ habitId, archived, initial }: { habitId: string; archived: boolean; initial: HabitTimerSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [syncedAt, setSyncedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = `/api/v1/habits/${habitId}/timer`;
  const refresh = useCallback(async () => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return;
    setSnapshot(await response.json() as HabitTimerSnapshot);
    const time = Date.now(); setNow(time); setSyncedAt(time);
  }, [url]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const sync = window.setInterval(() => void refresh(), 15000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(tick); window.clearInterval(sync); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  async function act(action: "start" | "pause" | "resume" | "stop") {
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update timer.");
      setSnapshot(body as HabitTimerSnapshot);
      const time = Date.now(); setNow(time); setSyncedAt(time);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update timer."); }
    finally { setBusy(false); }
  }

  const { active, anotherTimerActive, recent } = snapshot;
  if (!snapshot.available) return <div className="card"><Alert severity="warning">Timelogger access is unavailable for this account.</Alert></div>;
  const current = active ? secondsFor(active, now) : 0;
  const total = snapshot.totalSeconds + (active?.status === "running"
    ? Math.max(0, Math.floor((now - syncedAt) / 1000)) : 0);
  const stopped = recent.filter(entry => entry.status === "stopped");
  return <div className="card habit-timer">
    <div className="habit-timer-summary"><div><span className="muted">Current session</span><strong className="habit-timer-clock" aria-live="off">{duration(current)}</strong></div><div><span className="muted">All time</span><strong>{duration(total)}</strong></div></div>
    <div className="actions">
      {!active && !archived && <Button variant="contained" disabled={busy || anotherTimerActive} onClick={() => void act("start")}>Start timer</Button>}
      {active?.status === "running" && <Button variant="outlined" disabled={busy} onClick={() => void act("pause")}>Pause</Button>}
      {active?.status === "paused" && <Button variant="contained" disabled={busy} onClick={() => void act("resume")}>Resume</Button>}
      {active && <Button variant="outlined" disabled={busy} onClick={() => void act("stop")}>Stop</Button>}
      {active && <span className="muted">{active.status === "running" ? "Timer running" : "Timer paused"}</span>}
    </div>
    {anotherTimerActive && <p className="muted">Another timer is active in Timelogger. Stop it before starting this habit.</p>}
    {archived && !active && <p className="muted">Restore this habit to track more time.</p>}
    {error && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{error}</Alert>}
    <h3>Recent sessions</h3>
    {stopped.length ? <div className="list">{stopped.map(entry => <div className="row" key={entry.id}><span>{new Date(entry.start_at).toLocaleString()}</span><span className="pill">{duration(Number(entry.elapsed_seconds))}</span></div>)}</div> : <p className="muted">No completed sessions yet.</p>}
  </div>;
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Habit, HabitLog } from "@/lib/domain";
import { logAchievesGoal } from "@/lib/domain";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
export function CheckIn({ habit, date, initial }: { habit: Habit; date: string; initial?: HabitLog }) {
  const router = useRouter(); const [log, setLog] = useState<HabitLog | undefined>(initial); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [entry, setEntry] = useState(String(initial?.value ?? 0));
  async function save(status: HabitLog["status"] | null, value?: number) {
    const previous = log; setError(""); setPending(true);
    setLog(status ? { id: previous?.id ?? "optimistic", habit_id: habit.id, user_id: habit.user_id, date, status, value: value ?? null } : undefined);
    try { const response = await fetch("/api/v1/logs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habit_id: habit.id, date, status, value: value ?? null }) }); const body = await response.json(); if (!response.ok) throw Error(body.error); setLog(body.log ?? undefined); router.refresh(); } catch (e) { setLog(previous); setError(e instanceof Error ? e.message : "Could not save."); } finally { setPending(false); }
  }
  const achieved = logAchievesGoal(habit, log); const value = Number(log?.value ?? 0);
  return <div className="actions" aria-label={`Check in ${habit.name}`}>
    {habit.tracking_type === "MEASURABLE" && <><span className="muted">{value} / {habit.goal_value} {habit.unit}</span><Button variant="outlined" size="small" disabled={pending} aria-label={`Decrease ${habit.name}`} onClick={() => { const next = Math.max(0, value - 1); setEntry(String(next)); save(next ? "COMPLETED" : null, next); }}>−</Button><Button variant="outlined" size="small" disabled={pending} aria-label={`Increase ${habit.name}`} onClick={() => { const next = value + 1; setEntry(String(next)); save("COMPLETED", next); }}>+</Button><TextField aria-label={`Set ${habit.name} value`} type="number" size="small" slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": `Set ${habit.name} value` } }} value={entry} onChange={e => setEntry(e.target.value)} sx={{ width: 76 }}/><Button variant="outlined" size="small" disabled={pending} onClick={() => save(Number(entry) ? "COMPLETED" : null, Number(entry))}>Set</Button></>}
    {habit.tracking_type === "BOOLEAN" && <Button variant={achieved ? "contained" : "outlined"} size="small" disabled={pending} onClick={() => save("COMPLETED")}>{achieved ? "Completed" : "Complete"}</Button>}
    <Button variant="outlined" size="small" disabled={pending} onClick={() => save("FAILED")}>Fail</Button><Button variant="outlined" size="small" disabled={pending} onClick={() => save("SKIPPED")}>Skip</Button>{log && <Button variant="text" size="small" disabled={pending} onClick={() => save(null)}>Undo</Button>}{error && <span role="alert" className="form-error">{error}</span>}
  </div>;
}

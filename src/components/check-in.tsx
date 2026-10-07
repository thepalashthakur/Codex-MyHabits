"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Habit, HabitLog } from "@/lib/domain";
import { logAchievesGoal } from "@/lib/domain";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
export function CheckIn({ habit, date, initial }: { habit: Habit; date: string; initial?: HabitLog }) {
  const router = useRouter(); const [log, setLog] = useState<HabitLog | undefined>(initial); const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [error, setError] = useState(""); const [entry, setEntry] = useState(String(initial?.value ?? 0));
  async function save(status: HabitLog["status"] | null, value?: number) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const previous = log; setError(""); setPending(true);
    setLog(status ? { id: previous?.id ?? "optimistic", habit_id: habit.id, user_id: habit.user_id, date, status, value: value ?? null } : undefined);
    try { const response = await fetch("/api/v1/logs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habit_id: habit.id, date, status, value: value ?? null }) }); const body = await response.json(); if (!response.ok) throw Error(body.error); setLog(body.log ?? undefined); setEntry(String(body.log?.value ?? 0)); router.refresh(); } catch (e) { setLog(previous); setEntry(String(previous?.value ?? 0)); setError(e instanceof Error ? e.message : "Could not save."); } finally { pendingRef.current = false; setPending(false); }
  }
  const achieved = logAchievesGoal(habit, log); const value = Number(log?.value ?? 0); const increments = habit.quick_increments?.length ? habit.quick_increments : [1];
  const adjust = (amount: number) => { const next = Math.max(0, Math.round((value + amount) * 1000) / 1000); setEntry(String(next)); void save(next ? "COMPLETED" : null, next); };
  return <div className="actions" aria-label={`Check in ${habit.name}`}>
    {habit.tracking_type === "MEASURABLE" && <><span className="muted">{value} / {habit.goal_value} {habit.unit}</span><Button variant="outlined" size="small" disabled={pending || !value} aria-label={`Decrease ${habit.name} by ${increments[0]} ${habit.unit}`} onClick={() => adjust(-increments[0])}>−</Button>{increments.map(amount => <Button variant="outlined" size="small" key={amount} disabled={pending} aria-label={`Increase ${habit.name} by ${amount} ${habit.unit}`} onClick={() => adjust(amount)}>+{amount}</Button>)}<TextField aria-label={`Set ${habit.name} value`} type="number" size="small" slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": `Set ${habit.name} value` } }} value={entry} onChange={e => setEntry(e.target.value)} sx={{ width: 76 }}/><Button variant="outlined" size="small" disabled={pending || !Number.isFinite(Number(entry)) || Number(entry) < 0} onClick={() => void save(Number(entry) ? "COMPLETED" : null, Number(entry))}>Set</Button></>}
    {habit.tracking_type === "BOOLEAN" && <Button variant={achieved ? "contained" : "outlined"} size="small" disabled={pending} onClick={() => save("COMPLETED")}>{achieved ? "Completed" : "Complete"}</Button>}
    <Button variant="outlined" size="small" disabled={pending} onClick={() => save("FAILED")}>Fail</Button><Button variant="outlined" size="small" disabled={pending} onClick={() => save("SKIPPED")}>Skip</Button>{log && <Button variant="text" size="small" disabled={pending} onClick={() => save(null)}>Undo</Button>}{error && <span role="alert" className="form-error">{error}</span>}
  </div>;
}

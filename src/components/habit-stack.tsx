"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

type Relationship = { id: string; source_habit_id: string; target_habit_id: string };
type Option = { id: string; name: string };

export function HabitStack({ habitId, habits, relationships }: { habitId: string; habits: Option[]; relationships: Relationship[] }) {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const incoming = relationships.filter(link => link.target_habit_id === habitId);
  const names = new Map(habits.map(habit => [habit.id, habit.name]));

  async function mutate(method: "POST" | "DELETE", id?: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(method === "POST" ? "/api/v1/relationships" : `/api/v1/relationships/${id}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify({ source_habit_id: source, target_habit_id: habitId, type: "AFTER" }) : undefined });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setSource(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update routine."); }
    finally { setBusy(false); }
  }

  return <Stack spacing={2}><p className="subtle">Start this habit after another habit when that fits your routine.</p>{incoming.map(link => <div className="row" key={link.id}><span>After {names.get(link.source_habit_id) ?? "another habit"}</span><Button size="small" disabled={busy} onClick={() => void mutate("DELETE", link.id)}>Remove</Button></div>)}<Stack direction={{ xs: "column", sm: "row" }} spacing={1}><TextField select label="After habit" value={source} onChange={event => setSource(event.target.value)} sx={{ minWidth: 220 }}><MenuItem value="">Choose a habit</MenuItem>{habits.filter(habit => habit.id !== habitId && !incoming.some(link => link.source_habit_id === habit.id)).map(habit => <MenuItem key={habit.id} value={habit.id}>{habit.name}</MenuItem>)}</TextField><Button variant="outlined" disabled={!source || busy} onClick={() => void mutate("POST")}>Add relationship</Button></Stack>{error && <Alert severity="error" role="alert">{error}</Alert>}</Stack>;
}

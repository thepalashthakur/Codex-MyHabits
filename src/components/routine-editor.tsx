"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { parentFirst } from "@/lib/routine-data";
import { routineInput, type RoutineInput } from "@/lib/routine-validation";
import { RoutineRuleFields } from "./routine-rule-fields";

type EditorItem = RoutineInput["items"][number];
type EditorRoutine = RoutineInput["routine"];
const daily = { type: "DAILY" } as const;
const labels = { GROUP: "Group", TASK: "Task", HABIT_REF: "Habit" } as const;

export function RoutineEditor({ id, initial, habits, today, timezone }: { id?: string; initial?: RoutineInput; habits: { id: string; name: string }[]; today: string; timezone: string }) {
  const router = useRouter();
  const [routine, setRoutine] = useState<EditorRoutine>(initial?.routine ?? { name: "", description: null, timezone, rule: { type: "WEEKDAYS", weekdays: [1, 2, 3, 4, 5] }, preferred_start_time: "07:00:00", start_date: today, end_date: null, is_paused: false, paused_from: null, is_archived: false });
  const [items, setItems] = useState<EditorItem[]>(initial?.items ?? []);
  const [addParent, setAddParent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const groups = items.filter(item => item.type === "GROUP");
  const ordered = (() => { try { return parentFirst(items); } catch { return items; } })();

  function updateItem(itemId: string, patch: Partial<EditorItem>) {
    setItems(current => current.map(item => item.id === itemId ? { ...item, ...patch } : item));
  }
  function add(type: EditorItem["type"]) {
    const habit = habits[0];
    const parent_id = addParent || null;
    const position = Math.max(-1, ...items.filter(item => item.parent_id === parent_id).map(item => item.position)) + 1;
    const item: EditorItem = { id: crypto.randomUUID(), parent_id, position, type, title: type === "HABIT_REF" ? habit?.name ?? "" : "", instructions: null, estimated_minutes: null, required: true, frequency_rule: null, reference_provider: type === "HABIT_REF" ? "HABIT" : null, reference_id: type === "HABIT_REF" ? habit?.id ?? null : null };
    setItems(current => [...current, item]);
  }
  function remove(itemId: string) {
    const removed = new Set([itemId]);
    let changed = true;
    while (changed) { changed = false; for (const item of items) if (item.parent_id && removed.has(item.parent_id) && !removed.has(item.id)) { removed.add(item.id); changed = true; } }
    setItems(current => current.filter(item => !removed.has(item.id)));
    if (removed.has(addParent)) setAddParent("");
  }
  function move(itemId: string, direction: -1 | 1) {
    const item = items.find(value => value.id === itemId);
    if (!item) return;
    const siblings = items.filter(value => value.parent_id === item.parent_id).sort((a, b) => a.position - b.position);
    const index = siblings.findIndex(value => value.id === itemId);
    if (!siblings[index + direction]) return;
    [siblings[index], siblings[index + direction]] = [siblings[index + direction], siblings[index]];
    const positions = new Map(siblings.map((value, siblingIndex) => [value.id, siblingIndex]));
    setItems(current => current.map(value => positions.has(value.id) ? { ...value, position: positions.get(value.id)! } : value));
  }
  function descendantOf(candidate: string, itemId: string): boolean {
    let current = items.find(item => item.id === candidate);
    while (current?.parent_id) { if (current.parent_id === itemId) return true; current = items.find(item => item.id === current?.parent_id); }
    return false;
  }
  function depth(item: EditorItem) {
    let count = 0, current = item;
    while (current.parent_id) { const parent = items.find(value => value.id === current.parent_id); if (!parent) break; count++; current = parent; }
    return count;
  }
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = routineInput.safeParse({ routine, items });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the routine."); return; }
    if (!items.some(item => item.type !== "GROUP")) { setError("Add at least one task or habit step."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(id ? `/api/v1/routines/${id}` : "/api/v1/routines", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? "Could not save routine.");
      router.push(`/routines/${body.routineId}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save routine."); }
    finally { setBusy(false); }
  }

  return <Box component="form" onSubmit={save} sx={{ maxWidth: 880 }}><Stack spacing={3}>
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2}><Typography variant="h6">Routine details</Typography><TextField label="Name" required value={routine.name} onChange={event => setRoutine({ ...routine, name: event.target.value })}/><TextField label="Description (optional)" multiline minRows={2} value={routine.description ?? ""} onChange={event => setRoutine({ ...routine, description: event.target.value || null })}/><TextField label="Timezone" value={routine.timezone} onChange={event => setRoutine({ ...routine, timezone: event.target.value })} helperText="Scheduling and day-end status use this timezone."/></Stack></Card>
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2}><Typography variant="h6">Schedule</Typography><RoutineRuleFields value={routine.rule} onChange={rule => setRoutine({ ...routine, rule })}/><Stack direction={{ xs: "column", sm: "row" }} spacing={2}><TextField label="Start date" type="date" required value={routine.start_date} onChange={event => setRoutine({ ...routine, start_date: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth/><TextField label="End date (optional)" type="date" value={routine.end_date ?? ""} onChange={event => setRoutine({ ...routine, end_date: event.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} fullWidth/><TextField label="Preferred start (optional)" type="time" value={routine.preferred_start_time?.slice(0, 5) ?? ""} onChange={event => setRoutine({ ...routine, preferred_start_time: event.target.value ? `${event.target.value}:00` : null })} slotProps={{ inputLabel: { shrink: true } }} fullWidth/></Stack><Typography variant="body2" color="text.secondary">You can start any applicable occurrence before its preferred time. An unstarted occurrence is missed after its local day ends; a started unfinished one becomes partial.</Typography></Stack></Card>
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2}><div><Typography variant="h6">Steps</Typography><Typography variant="body2" color="text.secondary">Groups organize steps and do not count as extra progress. A custom frequency filters the routine schedule.</Typography></div><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><TextField select size="small" label="Add inside" value={addParent} onChange={event => setAddParent(event.target.value)} sx={{ minWidth: 190 }}><MenuItem value="">Routine root</MenuItem>{groups.map(group => <MenuItem key={group.id} value={group.id}>{group.title || "Untitled group"}</MenuItem>)}</TextField><Button variant="outlined" onClick={() => add("GROUP")}>Add group</Button><Button variant="outlined" onClick={() => add("TASK")}>Add task</Button><Button variant="outlined" disabled={!habits.length} onClick={() => add("HABIT_REF")}>Link habit</Button></Stack>
      {!items.length && <Alert severity="info">Add a task, group, or existing habit to begin.</Alert>}
      {ordered.map(item => <Card key={item.id} variant="outlined" sx={{ p: 2, ml: { xs: 0, sm: Math.min(depth(item), 4) * 3 }, bgcolor: "background.default" }}><Stack spacing={1.5}><Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}><Typography variant="subtitle2">{labels[item.type]}</Typography><Stack direction="row" spacing={0.5}><Button size="small" aria-label={`Move ${item.title || labels[item.type]} up`} onClick={() => move(item.id, -1)}>↑</Button><Button size="small" aria-label={`Move ${item.title || labels[item.type]} down`} onClick={() => move(item.id, 1)}>↓</Button><Button size="small" color="error" onClick={() => remove(item.id)}>Remove</Button></Stack></Stack><TextField label="Title" required value={item.title} onChange={event => updateItem(item.id, { title: event.target.value })}/>{item.type === "HABIT_REF" && <TextField select label="Existing habit" value={item.reference_id ?? ""} onChange={event => { const habit = habits.find(value => value.id === event.target.value); updateItem(item.id, { reference_id: event.target.value, title: habit?.name ?? item.title }); }}>{habits.map(habit => <MenuItem key={habit.id} value={habit.id}>{habit.name}</MenuItem>)}</TextField>}<TextField label="Instructions (optional)" multiline minRows={2} value={item.instructions ?? ""} onChange={event => updateItem(item.id, { instructions: event.target.value || null })}/><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><TextField select label="Parent group" size="small" value={item.parent_id ?? ""} onChange={event => { const parent_id = event.target.value || null; updateItem(item.id, { parent_id, position: Math.max(-1, ...items.filter(value => value.parent_id === parent_id).map(value => value.position)) + 1 }); }} sx={{ minWidth: 180 }}><MenuItem value="">Routine root</MenuItem>{groups.filter(group => group.id !== item.id && !descendantOf(group.id, item.id)).map(group => <MenuItem key={group.id} value={group.id}>{group.title || "Untitled group"}</MenuItem>)}</TextField>{item.type !== "GROUP" && <TextField label="Estimated minutes" type="number" size="small" value={item.estimated_minutes ?? ""} onChange={event => updateItem(item.id, { estimated_minutes: event.target.value ? Number(event.target.value) : null })} slotProps={{ htmlInput: { min: 1, max: 1440 } }} sx={{ maxWidth: 180 }}/>}{item.type !== "GROUP" && <FormControlLabel control={<Checkbox checked={item.required} onChange={event => updateItem(item.id, { required: event.target.checked })}/>} label="Required"/>}</Stack><FormControlLabel control={<Checkbox checked={Boolean(item.frequency_rule)} onChange={event => updateItem(item.id, { frequency_rule: event.target.checked ? daily : null })}/>} label="Custom frequency"/>{item.frequency_rule && <RoutineRuleFields value={item.frequency_rule} onChange={frequency_rule => updateItem(item.id, { frequency_rule })} label="Step frequency"/>}</Stack></Card>)}
    </Stack></Card>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving…" : id ? "Save future routine" : "Create routine"}</Button><Button variant="text" href={id ? `/routines/${id}` : "/routines"}>Cancel</Button></Stack>
  </Stack></Box>;
}

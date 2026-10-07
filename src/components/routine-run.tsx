"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { effectiveStatus, localRoutineDate, progress, type ItemOccurrence, type RoutineOccurrence } from "@/lib/routines";

export function RoutineRun({ initialOccurrence, initialItems, routineName }: { initialOccurrence: RoutineOccurrence; initialItems: ItemOccurrence[]; routineName: string }) {
  const router = useRouter();
  const [occurrence, setOccurrence] = useState(initialOccurrence);
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<"checklist" | "guided">("checklist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState(occurrence.planned_date);
  const [scope, setScope] = useState<"THIS" | "FUTURE">("THIS");
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<ItemOccurrence | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editRequired, setEditRequired] = useState(true);
  const [editScope, setEditScope] = useState<"THIS" | "FUTURE">("THIS");
  const today = localRoutineDate(occurrence.timezone);
  const status = effectiveStatus(occurrence, items, today);
  const windowClosed = occurrence.planned_date < today;
  const summary = progress(items);
  const children = (parentId: string | null) => items.filter(item => item.parent_item_occurrence_id === parentId).sort((a, b) => a.position - b.position);
  const leaves = items.filter(item => item.type !== "GROUP");
  const next = leaves.find(item => item.status === "PENDING");
  const descendantLeaves = (groupId: string): ItemOccurrence[] => {
    const result: ItemOccurrence[] = [];
    const visit = (id: string) => { for (const child of children(id)) { if (child.type === "GROUP") visit(child.id); else result.push(child); } };
    visit(groupId); return result;
  };

  async function action(value: "START" | "SKIP" | "UNDO_SKIP" | "RESCHEDULE") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/routine-occurrences/${occurrence.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value === "RESCHEDULE" ? { action: value, date: newDate, scope } : { action: value }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? "Could not update occurrence.");
      setOccurrence(body.occurrence);
      setRescheduleOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update occurrence."); }
    finally { setBusy(false); }
  }
  async function updateItem(item: ItemOccurrence, value: "DONE" | "SKIPPED" | "PENDING") {
    setBusy(true); setError("");
    const measured = item.type === "HABIT_REF" && item.habit_tracking_type === "MEASURABLE";
    const amount = measured ? Number(values[item.id] ?? item.habit_goal_value ?? 0) : null;
    try {
      const response = await fetch(`/api/v1/routine-occurrences/${occurrence.id}/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value, value: value === "DONE" ? amount : null }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? "Could not update step.");
      setItems(current => current.map(entry => entry.id === item.id ? body.item : entry));
      setOccurrence(body.occurrence); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update step."); }
    finally { setBusy(false); }
  }
  function openEdit(item: ItemOccurrence) {
    setNotice(""); setEditing(item); setEditTitle(item.title); setEditInstructions(item.instructions ?? ""); setEditRequired(item.required); setEditScope("THIS");
  }
  async function saveEdit() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/routine-occurrences/${occurrence.id}/items/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "EDIT", title: editTitle, instructions: editInstructions || null, required: editRequired, scope: editScope }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? "Could not edit step.");
      setItems(current => current.map(item => item.id === editing.id ? body.item : item));
      if (!body.appliedToCurrent) setNotice("The template and future unstarted occurrences were updated. This started occurrence kept its saved step.");
      setEditing(null); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not edit step."); }
    finally { setBusy(false); }
  }
  function stepCard(item: ItemOccurrence) {
    if (item.type === "GROUP") {
      const count = progress(descendantLeaves(item.id));
      return <Card key={item.id} variant="outlined" sx={{ p: 2, mb: 1.5 }}><Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}><Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{item.title}</Typography><Button size="small" onClick={() => openEdit(item)}>Edit</Button></Stack><Typography variant="caption" color="text.secondary">{count.done} of {count.total} required steps done{count.skipped ? ` · ${count.skipped} skipped` : ""}</Typography><Stack spacing={1} sx={{ mt: 1.5 }}>{children(item.id).map(stepCard)}</Stack></Card>;
    }
    return <Card key={item.id} variant="outlined" sx={{ p: 2, bgcolor: item.status === "DONE" ? "action.selected" : "background.paper" }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between" }}><Box><Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography variant="subtitle1">{item.title}</Typography><Chip size="small" label={item.status.toLowerCase()}/>{!item.required && <Chip size="small" variant="outlined" label="Optional"/>}</Stack>{item.instructions && <Typography variant="body2" color="text.secondary">{item.instructions}</Typography>}{item.estimated_minutes && <Typography variant="caption" color="text.secondary">About {item.estimated_minutes} min</Typography>}{item.type === "HABIT_REF" && <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">Existing habit{item.habit_goal_value ? ` · target ${item.habit_goal_value}` : ""}</Typography>}</Box><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>{item.type === "HABIT_REF" && item.habit_tracking_type === "MEASURABLE" && item.status !== "DONE" && <TextField size="small" type="number" label="Value" value={values[item.id] ?? String(item.habit_goal_value ?? "")} onChange={event => setValues(current => ({ ...current, [item.id]: event.target.value }))} slotProps={{ htmlInput: { min: item.habit_goal_value ?? 0, step: "any" } }} sx={{ width: 110 }}/>} {item.status === "PENDING" ? <><Button variant="contained" size="small" disabled={busy || status === "SKIPPED" || windowClosed} onClick={() => void updateItem(item, "DONE")}>Done</Button><Button variant="text" size="small" disabled={busy || status === "SKIPPED" || windowClosed} onClick={() => void updateItem(item, "SKIPPED")}>Skip step</Button></> : <Button variant="outlined" size="small" disabled={busy} onClick={() => void updateItem(item, "PENDING")}>Undo {item.status.toLowerCase()}</Button>}<Button size="small" onClick={() => openEdit(item)}>Edit</Button>{item.type === "HABIT_REF" && item.reference_id && <Button component={Link} href={`/habits/${item.reference_id}`} size="small">Habit</Button>}</Stack></Stack></Card>;
  }
  return <Stack spacing={2.5}><Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={1.5}><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}><div><Typography variant="h5">{routineName}</Typography><Typography color="text.secondary" variant="body2">Planned for {occurrence.planned_date}{occurrence.planned_time ? ` around ${occurrence.planned_time.slice(0, 5)}` : ""} · {occurrence.timezone}</Typography></div><Chip label={status.toLowerCase().replaceAll("_", " ")} color={status === "COMPLETED" ? "success" : "default"}/></Stack><Typography role="status" sx={{ fontWeight: 600 }}>{summary.done} of {summary.total} required steps done{summary.skipped ? ` · ${summary.skipped} skipped` : ""}</Typography><Box component="progress" value={summary.done} max={summary.total || 1} aria-label={`${summary.done} of ${summary.total} required steps done`} sx={{ width: "100%" }}/><Typography variant="body2" color="text.secondary">The preferred time is guidance. If no step starts before this routine’s local day ends, it becomes missed. Started routines with unfinished required steps become partial.</Typography><Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{status === "SCHEDULED" && <Button variant="contained" disabled={busy} onClick={() => void action("START")}>Start routine</Button>}{status === "SKIPPED" ? <Button variant="outlined" disabled={busy} onClick={() => void action("UNDO_SKIP")}>Undo routine skip</Button> : !occurrence.started_at && <Button variant="text" disabled={busy} onClick={() => void action("SKIP")}>Skip routine</Button>}{!occurrence.started_at && status !== "SKIPPED" && <Button variant="outlined" disabled={busy} onClick={() => setRescheduleOpen(true)}>Reschedule</Button>}</Stack></Stack></Card>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {notice && <Alert severity="info" role="status">{notice}</Alert>}
    {windowClosed && <Alert severity="info">This routine’s local day has ended. Its execution window is closed; you can still undo a recorded step.</Alert>}
    <Tabs value={view} onChange={(_, value: "checklist" | "guided") => setView(value)} aria-label="Routine view"><Tab label="Checklist" value="checklist"/><Tab label="Guided" value="guided"/></Tabs>
    {view === "checklist" ? <Stack spacing={1}>{children(null).map(stepCard)}</Stack> : next ? <div><Typography variant="subtitle2" sx={{ mb: 1 }}>Next step · {leaves.filter(item => item.status !== "PENDING").length + 1} of {leaves.length}</Typography>{stepCard(next)}<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Switch to Checklist to work on any step out of order.</Typography></div> : <Alert severity={summary.complete ? "success" : "info"}>{summary.complete ? "All required steps are done." : "No pending steps remain. Skipped required steps still need completion to finish this routine."}</Alert>}
    <Dialog open={rescheduleOpen} onClose={() => !busy && setRescheduleOpen(false)} aria-labelledby="reschedule-title"><DialogTitle id="reschedule-title">Reschedule routine</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="New date" type="date" value={newDate} onChange={event => setNewDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }}/><TextField select label="Apply to" value={scope} onChange={event => setScope(event.target.value as "THIS" | "FUTURE")}><MenuItem value="THIS">This occurrence</MenuItem><MenuItem value="FUTURE">This and future occurrences</MenuItem></TextField><Typography variant="body2" color="text.secondary">Moving future occurrences shifts planned dates but keeps the recurrence anchor unchanged. Started occurrences keep their progress and dates.</Typography>{error && <Alert severity="error" role="alert">{error}</Alert>}</Stack></DialogContent><DialogActions><Button onClick={() => setRescheduleOpen(false)}>Cancel</Button><Button variant="contained" disabled={busy || !newDate} onClick={() => void action("RESCHEDULE")}>Reschedule</Button></DialogActions></Dialog>
    <Dialog open={Boolean(editing)} onClose={() => !busy && setEditing(null)} aria-labelledby="edit-step-title"><DialogTitle id="edit-step-title">Edit step</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1, minWidth: { sm: 360 } }}><TextField label="Title" required value={editTitle} onChange={event => setEditTitle(event.target.value)}/><TextField label="Instructions" multiline minRows={2} value={editInstructions} onChange={event => setEditInstructions(event.target.value)}/>{editing?.type !== "GROUP" && <FormControlLabel control={<Checkbox checked={editRequired} onChange={event => setEditRequired(event.target.checked)}/>} label="Required"/>}<TextField select label="Apply to" value={editScope} onChange={event => setEditScope(event.target.value as "THIS" | "FUTURE")}><MenuItem value="THIS">This occurrence</MenuItem><MenuItem value="FUTURE">This and future occurrences</MenuItem></TextField><Typography variant="body2" color="text.secondary">Future edits update the template and unstarted occurrences. Started checklists keep their existing steps and progress.</Typography>{error && <Alert severity="error" role="alert">{error}</Alert>}</Stack></DialogContent><DialogActions><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="contained" disabled={busy || !editTitle.trim()} onClick={() => void saveEdit()}>Save step</Button></DialogActions></Dialog>
  </Stack>;
}

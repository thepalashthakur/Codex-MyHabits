"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Area } from "@/lib/domain";

export function AreasManager({ initial, counts }: { initial: Area[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [areas, setAreas] = useState(initial);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Area | null>(null);
  const [editName, setEditName] = useState("");
  const [deleting, setDeleting] = useState<Area | null>(null);
  async function add(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const name = String(new FormData(form).get("name"));
    const response = await fetch("/api/v1/areas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, position: areas.length }) });
    const body = await response.json();
    if (response.ok) { setAreas([...areas, body.area]); form.reset(); router.refresh(); } else setError(body.error);
  }
  async function rename(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing || !editName.trim()) return;
    const response = await fetch(`/api/v1/areas/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim() }) });
    const body = await response.json();
    if (response.ok) { setAreas(areas.map(a => a.id === editing.id ? body.area : a)); setEditing(null); router.refresh(); } else setError(body.error);
  }
  async function remove() {
    if (!deleting) return;
    const response = await fetch(`/api/v1/areas/${deleting.id}`, { method: "DELETE" });
    if (response.ok) { setAreas(areas.filter(a => a.id !== deleting.id)); setDeleting(null); router.refresh(); } else setError("Unable to delete area.");
  }
  async function move(area: Area, delta: number) {
    const index = areas.findIndex(a => a.id === area.id), next = index + delta;
    if (next < 0 || next >= areas.length) return;
    const reordered = [...areas]; [reordered[index], reordered[next]] = [reordered[next], reordered[index]]; setAreas(reordered);
    const result = await Promise.all(reordered.map((a, position) => fetch(`/api/v1/areas/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position }) })));
    if (result.some(r => !r.ok)) setError("Could not save order."); router.refresh();
  }
  return <Stack spacing={3}>
    <Stack component="form" direction={{ xs: "column", sm: "row" }} spacing={1.5} onSubmit={add} sx={{ alignItems: { sm: "flex-end" } }}><TextField label="New area" name="name" placeholder="e.g. Health" slotProps={{ htmlInput: { maxLength: 80 } }} required sx={{ minWidth: { sm: 260 } }}/><Button variant="contained" type="submit">Add area</Button></Stack>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    <Typography variant="h2">Your areas</Typography>
    {areas.length ? <Stack spacing={1.5}>{areas.map((area, index) => <Paper variant="outlined" key={area.id} sx={{ p: 2 }}><Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", gap: 2 }}><div><Typography sx={{ fontWeight: 600 }}>{area.icon} {area.name}</Typography><Typography variant="body2" color="text.secondary">{counts[area.id] ?? 0} active habits</Typography></div><Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}><Button variant="outlined" size="small" disabled={index === 0} aria-label={`Move ${area.name} up`} onClick={() => move(area, -1)}>↑</Button><Button variant="outlined" size="small" disabled={index === areas.length - 1} aria-label={`Move ${area.name} down`} onClick={() => move(area, 1)}>↓</Button><Button size="small" onClick={() => { setEditing(area); setEditName(area.name); }}>Edit</Button><Button size="small" color="error" onClick={() => setDeleting(area)}>Delete</Button></Stack></Stack></Paper>)}</Stack> : <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}><Typography variant="h3">No areas yet</Typography><Typography color="text.secondary">Group related habits to see progress by area.</Typography></Paper>}
    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} aria-labelledby="edit-area-title"><DialogTitle id="edit-area-title">Edit area</DialogTitle><DialogContent><Stack component="form" id="edit-area-form" onSubmit={rename} sx={{ pt: 1 }}><TextField label="Area name" value={editName} onChange={e => setEditName(e.target.value)} required fullWidth/></Stack></DialogContent><DialogActions><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="contained" type="submit" form="edit-area-form">Save</Button></DialogActions></Dialog>
    <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} aria-labelledby="delete-area-title"><DialogTitle id="delete-area-title">Delete area?</DialogTitle><DialogContent>Habits in this area will become uncategorized.</DialogContent><DialogActions><Button onClick={() => setDeleting(null)}>Cancel</Button><Button variant="contained" color="error" onClick={() => void remove()}>Delete</Button></DialogActions></Dialog>
  </Stack>;
}

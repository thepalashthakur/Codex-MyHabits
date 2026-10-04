"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
type Note = { id: string; content: string; date: string | null; created_at: string };
export function Notes({ habitId, initial }: { habitId: string; initial: Note[] }) { const router = useRouter(); const [notes, setNotes] = useState(initial); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  async function add(event: React.SubmitEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const form = event.currentTarget; const content = String(new FormData(form).get("content")); try { const response = await fetch("/api/v1/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habit_id: habitId, content }) }); const body = await response.json(); if (!response.ok) throw Error(body.error); setNotes([body.note, ...notes]); form.reset(); router.refresh(); } catch(e) { setError(e instanceof Error ? e.message : "Could not add note."); } finally { setBusy(false); } }
  async function remove() { if (!pendingDelete) return; const response = await fetch(`/api/v1/notes/${pendingDelete}`, { method: "DELETE" }); if (response.ok) { setNotes(notes.filter(n => n.id !== pendingDelete)); setPendingDelete(null); router.refresh(); } else setError("Could not delete note."); }
  return <><Stack component="form" spacing={2} onSubmit={add} sx={{ maxWidth: 720 }}>
    <TextField label="Habit note" id="note" name="content" multiline minRows={3} slotProps={{ htmlInput: { maxLength: 4000 } }} placeholder="What did you notice?" required fullWidth/>
    <Button variant="outlined" type="submit" disabled={busy} sx={{ alignSelf: "flex-start" }}>{busy ? "Adding…" : "Add note"}</Button>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
  </Stack><Stack spacing={1.5} sx={{ mt: 2 }}>{notes.map(note => <Paper variant="outlined" key={note.id} sx={{ p: 2 }}><Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}><Typography variant="caption" color="text.secondary">{new Date(note.created_at).toLocaleDateString()}</Typography><Button size="small" color="error" onClick={() => setPendingDelete(note.id)}>Delete</Button></Stack><Typography sx={{ whiteSpace: "pre-wrap" }}>{note.content}</Typography></Paper>)}{notes.length === 0 && <Typography color="text.secondary">No notes yet. Add a reflection to keep it with this habit.</Typography>}</Stack><Dialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} aria-labelledby="delete-note-title"><DialogTitle id="delete-note-title">Delete note?</DialogTitle><DialogContent>This note cannot be recovered.</DialogContent><DialogActions><Button onClick={() => setPendingDelete(null)}>Cancel</Button><Button variant="contained" color="error" onClick={() => void remove()}>Delete</Button></DialogActions></Dialog></>;
}

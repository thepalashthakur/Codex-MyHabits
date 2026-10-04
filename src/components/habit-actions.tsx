"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Alert from "@mui/material/Alert";
export function HabitActions({ id, archived }: { id: string; archived: boolean }) { const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [confirmDelete, setConfirmDelete] = useState(false);
  async function update(method: "PATCH" | "DELETE") { setBusy(true); setError(""); try { const response = await fetch(`/api/v1/habits/${id}`, { method, headers: { "Content-Type": "application/json" }, body: method === "PATCH" ? JSON.stringify({ is_archived: !archived }) : undefined }); const body = await response.json(); if (!response.ok) throw Error(body.error); setConfirmDelete(false); router.push("/habits"); router.refresh(); } catch(e) { setError(e instanceof Error ? e.message : "Unable to update."); } finally { setBusy(false); } }
  return <><div className="actions"><Button variant="outlined" size="small" disabled={busy} onClick={() => update("PATCH")}>{archived ? "Restore" : "Archive"}</Button><Button variant="outlined" size="small" color="error" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete permanently</Button></div>{error && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{error}</Alert>}<Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} aria-labelledby="delete-habit-title"><DialogTitle id="delete-habit-title">Delete habit permanently?</DialogTitle><DialogContent>Its logs, notes and reminders will also be deleted. This cannot be undone.</DialogContent><DialogActions><Button onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="contained" color="error" disabled={busy} onClick={() => void update("DELETE")}>Delete permanently</Button></DialogActions></Dialog></>;
}

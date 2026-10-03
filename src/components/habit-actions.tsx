"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@mui/material/Button";
export function HabitActions({ id, archived }: { id: string; archived: boolean }) { const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function update(method: "PATCH" | "DELETE") { if (method === "DELETE" && !confirm("Permanently delete this habit, its logs, notes and reminders? This cannot be undone.")) return; setBusy(true); setError(""); try { const response = await fetch(`/api/v1/habits/${id}`, { method, headers: { "Content-Type": "application/json" }, body: method === "PATCH" ? JSON.stringify({ is_archived: !archived }) : undefined }); const body = await response.json(); if (!response.ok) throw Error(body.error); router.push("/habits"); router.refresh(); } catch(e) { setError(e instanceof Error ? e.message : "Unable to update."); } finally { setBusy(false); } }
  return <div className="actions"><Button variant="outlined" size="small" disabled={busy} onClick={() => update("PATCH")}>{archived ? "Restore" : "Archive"}</Button><Button variant="outlined" size="small" color="secondary" disabled={busy} onClick={() => update("DELETE")}>Delete permanently</Button>{error && <span role="alert" className="form-error">{error}</span>}</div>;
}

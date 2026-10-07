"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

export function RoutineActions({ id, paused, archived }: { id: string; paused: boolean; archived: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function action(value: "PAUSE" | "RESUME" | "ARCHIVE" | "RESTORE") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/routines/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? "Could not update routine.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update routine."); }
    finally { setBusy(false); }
  }
  return <Stack spacing={1}><Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
    {!archived && <Button variant="outlined" size="small" disabled={busy} onClick={() => void action(paused ? "RESUME" : "PAUSE")}>{paused ? "Resume" : "Pause"}</Button>}
    <Button variant="text" size="small" color={archived ? "primary" : "error"} disabled={busy} onClick={() => void action(archived ? "RESTORE" : "ARCHIVE")}>{archived ? "Restore" : "Archive"}</Button>
  </Stack>{error && <Alert severity="error" role="alert">{error}</Alert>}</Stack>;
}

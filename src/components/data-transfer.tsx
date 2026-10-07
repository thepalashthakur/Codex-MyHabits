"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

const csvTables = ["areas", "habits", "logs", "notes", "reminders", "pauses", "relationships", "versions"];
type Preview = { areas: number; habits: number; logs: number; notes: number; reminders: number; pauses: number; relationships: number; duplicateAreas: number; duplicateHabits: string[] };

export function DataTransfer() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"skip" | "copy">("skip");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function request(previewOnly: boolean) {
    if (!file && previewOnly) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      let candidate = payload;
      if (previewOnly) {
        if (file!.size > 20_000_000) throw Error("Choose a JSON file smaller than 20 MB.");
        candidate = JSON.parse(await file!.text()) as unknown;
      }
      const response = await fetch("/api/v1/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: candidate, mode, preview: previewOnly }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      if (previewOnly) { setPayload(candidate); setPreview(body.preview); }
      else { setMessage(`Imported ${body.result.habitsCreated} habits and ${body.result.areasCreated} areas. ${body.result.habitsSkipped} duplicate habits skipped.`); setPreview(null); setPayload(null); setFile(null); router.refresh(); }
    } catch (cause) { setFailed(true); setMessage(cause instanceof Error ? cause.message : "Could not import file."); }
    finally { setBusy(false); }
  }

  return <Stack spacing={2} sx={{ maxWidth: 700 }}><div><Button component="a" href="/api/v1/data?format=json" variant="outlined">Download JSON backup</Button><p className="subtle">Includes habits, areas, schedule history, logs, notes, reminders, pauses and habit relationships. Routine templates and occurrences are not yet included.</p></div><details><summary>Download CSV files</summary><div className="template-options">{csvTables.map(table => <Button component="a" variant="text" size="small" key={table} href={`/api/v1/data?format=csv&table=${table}`}>{table}</Button>)}</div></details><div><h3>Import a MyHabits backup</h3><p className="subtle">Preview the file first. Existing records are never overwritten.</p></div><TextField type="file" label="JSON backup" slotProps={{ htmlInput: { accept: ".json,application/json" }, inputLabel: { shrink: true } }} onChange={event => { setFile((event.target as HTMLInputElement).files?.[0] ?? null); setPreview(null); setPayload(null); setMessage(""); }}/><TextField select label="Duplicates" value={mode} onChange={event => { setMode(event.target.value as "skip" | "copy"); setPreview(null); }}><MenuItem value="skip">Skip habits with matching names</MenuItem><MenuItem value="copy">Create copies</MenuItem></TextField><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Button variant="outlined" disabled={!file || busy} onClick={() => void request(true)}>Preview import</Button><Button variant="contained" disabled={!preview || busy} onClick={() => void request(false)}>Import these records</Button></Stack>{preview && <Alert severity="info" role="status">{preview.habits} habits, {preview.areas} areas, {preview.logs} logs, {preview.notes} notes, {preview.reminders} reminders, {preview.pauses} pauses, {preview.relationships} relationships. {preview.duplicateHabits.length} habit names and {preview.duplicateAreas} area names already exist. {mode === "skip" ? "Matching habits and their activity will be skipped." : "Matching names will be imported as separate copies."}{preview.duplicateHabits.length > 0 && <span> Matches: {preview.duplicateHabits.slice(0, 5).join(", ")}{preview.duplicateHabits.length > 5 ? "…" : ""}.</span>}</Alert>}{message && <Alert severity={failed ? "error" : "success"} role="status">{message}</Alert>}</Stack>;
}

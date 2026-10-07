"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { ArrowDown, ArrowUp } from "lucide-react";

export function ReorderHabit({ ids, index, name }: { ids: string[]; index: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function move(direction: -1 | 1) {
    const next = [...ids];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/habits/order", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reorder habit."); }
    finally { setBusy(false); }
  }
  return <div className="reorder-actions"><Tooltip title={`Move ${name} up`}><span><IconButton aria-label={`Move ${name} up`} disabled={busy || index === 0} onClick={() => void move(-1)}><ArrowUp size={17}/></IconButton></span></Tooltip><Tooltip title={`Move ${name} down`}><span><IconButton aria-label={`Move ${name} down`} disabled={busy || index === ids.length - 1} onClick={() => void move(1)}><ArrowDown size={17}/></IconButton></span></Tooltip>{error && <span role="alert" className="form-error">{error}</span>}</div>;
}

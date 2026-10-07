"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { RoutineRule } from "@/lib/routines";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaults: Record<RoutineRule["type"], RoutineRule> = {
  DAILY: { type: "DAILY" }, WEEKDAYS: { type: "WEEKDAYS", weekdays: [1, 2, 3, 4, 5] },
  INTERVAL_DAYS: { type: "INTERVAL_DAYS", interval: 2 }, INTERVAL_WEEKS: { type: "INTERVAL_WEEKS", interval: 2 },
  MONTH_DATES: { type: "MONTH_DATES", dates: [1], missing: "SKIP" },
};
function MonthDates({ value, onChange }: { value: Extract<RoutineRule, { type: "MONTH_DATES" }>; onChange: (value: RoutineRule) => void }) {
  const [draft, setDraft] = useState(value.dates.join(", "));
  return <><TextField label="Dates of month" helperText="Comma separated, for example 1, 15, 31" value={draft} onChange={event => {
    setDraft(event.target.value);
    onChange({ ...value, dates: event.target.value.split(",").map(part => Number(part.trim())).filter(number => Number.isInteger(number) && number > 0) });
  }}/><TextField select label="When a month lacks a selected date" value={value.missing} onChange={event => onChange({ ...value, missing: event.target.value as "SKIP" | "LAST_DAY" })}><MenuItem value="SKIP">Skip that date</MenuItem><MenuItem value="LAST_DAY">Use the last day of the month</MenuItem></TextField></>;
}
export function RoutineRuleFields({ value, onChange, label = "Repeat" }: { value: RoutineRule; onChange: (value: RoutineRule) => void; label?: string }) {
  return <Stack spacing={1.5}>
    <TextField select label={label} value={value.type} onChange={event => onChange(defaults[event.target.value as RoutineRule["type"]])} fullWidth>
      <MenuItem value="DAILY">Daily</MenuItem><MenuItem value="WEEKDAYS">Selected weekdays</MenuItem>
      <MenuItem value="INTERVAL_DAYS">Every N days</MenuItem><MenuItem value="INTERVAL_WEEKS">Every N weeks</MenuItem>
      <MenuItem value="MONTH_DATES">Dates of the month</MenuItem>
    </TextField>
    {value.type === "WEEKDAYS" && <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }} aria-label="Repeat on weekdays">{weekdays.map((day, index) => <Chip key={day} label={day} clickable color={value.weekdays.includes(index) ? "primary" : "default"} variant={value.weekdays.includes(index) ? "filled" : "outlined"} onClick={() => onChange({ ...value, weekdays: value.weekdays.includes(index) ? value.weekdays.filter(current => current !== index) : [...value.weekdays, index].sort() })}/>)}</Box>}
    {(value.type === "INTERVAL_DAYS" || value.type === "INTERVAL_WEEKS") && <TextField label={value.type === "INTERVAL_DAYS" ? "Every how many days" : "Every how many weeks"} type="number" value={value.interval} onChange={event => onChange({ ...value, interval: Number(event.target.value) })} slotProps={{ htmlInput: { min: 1, max: value.type === "INTERVAL_DAYS" ? 365 : 52 } }}/>}
    {value.type === "MONTH_DATES" && <MonthDates value={value} onChange={onChange}/>}
  </Stack>;
}

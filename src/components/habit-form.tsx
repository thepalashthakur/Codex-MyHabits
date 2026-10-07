"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Area, Habit, ScheduleType } from "@/lib/domain";
import type { Template } from "@/lib/habit-templates";
export function HabitForm({ areas, today, habit, template }: { areas: Area[]; today: string; habit?: Habit; template?: Template }) {
  const router = useRouter(); const [schedule, setSchedule] = useState<ScheduleType>(habit?.schedule_type ?? "DAILY"); const [tracking, setTracking] = useState(habit?.tracking_type ?? template?.tracking_type ?? "BOOLEAN"); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget);
    const weekdays = [0,1,2,3,4,5,6].filter(day => form.get(`weekday-${day}`) === "on");
    const schedule_config = schedule === "WEEKDAYS" ? { weekdays } : schedule === "INTERVAL" ? { interval: Number(form.get("interval")) } : schedule === "WEEKLY_TARGET" || schedule === "MONTHLY_TARGET" ? { target: Number(form.get("target")) } : {};
    const optionalNumber = (name: string) => form.get(name) ? Number(form.get(name)) : null;
    const quickIncrements = String(form.get("quick_increments") ?? "").split(",").map(value => value.trim()).filter(Boolean).map(Number);
    const body = { name: form.get("name"), description: form.get("description") || null, area_id: form.get("area_id") || null, type: form.get("type"), tracking_type: tracking, goal_value: tracking === "MEASURABLE" ? Number(form.get("goal_value")) : null, minimum_goal_value: tracking === "MEASURABLE" ? optionalNumber("minimum_goal_value") : null, stretch_goal_value: tracking === "MEASURABLE" ? optionalNumber("stretch_goal_value") : null, quick_increments: tracking === "MEASURABLE" && quickIncrements.length ? quickIncrements : null, unit: tracking === "MEASURABLE" ? form.get("unit") : null, schedule_type: schedule, schedule_config, start_date: form.get("start_date"), end_date: form.get("end_date") || null, time_of_day: form.get("time_of_day"), priority: form.get("priority"), difficulty: form.get("difficulty") || null, icon: form.get("icon") || null, color: form.get("color") || null };
    try { const response = await fetch(habit ? `/api/v1/habits/${habit.id}` : "/api/v1/habits", { method: habit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw Error(data.error); router.push(`/habits/${data.habit.id}`); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save habit."); } finally { setPending(false); }
  }
  return <Paper component="form" variant="outlined" onSubmit={submit} sx={{ maxWidth: 720, p: { xs: 2, sm: 3 } }}>
    <Stack spacing={2.5}>
      <TextField label="Habit name" id="name" name="name" defaultValue={habit?.name ?? template?.name ?? ""} slotProps={{ htmlInput: { maxLength: 120 } }} placeholder="e.g. Read 30 pages" required autoFocus fullWidth/>
      <div className="form-grid">
        <TextField select label="Habit type" id="type" name="type" defaultValue={habit?.type ?? template?.type ?? "GOOD"}><MenuItem value="GOOD">Build a good habit</MenuItem><MenuItem value="BAD">Reduce a bad habit</MenuItem></TextField>
        <TextField select label="Tracking" id="tracking" name="tracking" value={tracking} onChange={e => setTracking(e.target.value as Habit["tracking_type"])}><MenuItem value="BOOLEAN">Yes or no</MenuItem><MenuItem value="MEASURABLE">Measured amount</MenuItem></TextField>
      </div>
      {tracking === "MEASURABLE" && <div className="form-grid"><TextField label="Target amount" id="goal_value" name="goal_value" type="number" slotProps={{ htmlInput: { min: 0.001, step: "any" } }} defaultValue={habit?.goal_value ?? template?.goal_value ?? ""} required/><TextField label="Unit" id="unit" name="unit" placeholder="pages, L, steps…" defaultValue={habit?.unit ?? template?.unit ?? ""} required/></div>}
      <div className="form-grid">
        <TextField select label="Schedule" id="schedule" value={schedule} onChange={e => setSchedule(e.target.value as ScheduleType)}><MenuItem value="DAILY">Every day</MenuItem><MenuItem value="WEEKDAYS">Specific weekdays</MenuItem><MenuItem value="WEEKLY_TARGET">Times per week</MenuItem><MenuItem value="MONTHLY_TARGET">Times per month</MenuItem><MenuItem value="INTERVAL">Every N days</MenuItem></TextField>
        <TextField select label="Time of day" id="time_of_day" name="time_of_day" defaultValue={habit?.time_of_day ?? template?.time_of_day ?? "ANYTIME"}><MenuItem value="ANYTIME">Anytime</MenuItem><MenuItem value="MORNING">Morning</MenuItem><MenuItem value="AFTERNOON">Afternoon</MenuItem><MenuItem value="EVENING">Evening</MenuItem></TextField>
      </div>
      <TextField label="Start date" id="start_date" name="start_date" type="date" defaultValue={habit?.start_date ?? today} required slotProps={{ inputLabel: { shrink: true } }}/>
      {schedule === "WEEKDAYS" && <fieldset className="field"><legend>On these days</legend><div className="checkboxes">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, i) => <FormControlLabel key={day} control={<Checkbox name={`weekday-${i}`} defaultChecked={habit?.schedule_config.weekdays?.includes(i) ?? (i > 0 && i < 6)}/>} label={day}/>)}</div></fieldset>}
      {(schedule === "WEEKLY_TARGET" || schedule === "MONTHLY_TARGET") && <TextField label={`Times per ${schedule === "WEEKLY_TARGET" ? "week" : "month"}`} id="target" name="target" type="number" slotProps={{ htmlInput: { min: 1, max: schedule === "WEEKLY_TARGET" ? 7 : 31 } }} defaultValue={habit?.schedule_config.target ?? 3} required/>}
      {schedule === "INTERVAL" && <TextField label="Every how many days?" id="interval" name="interval" type="number" slotProps={{ htmlInput: { min: 1, max: 365 } }} defaultValue={habit?.schedule_config.interval ?? 2} required/>}
      <details><summary>More options</summary><Stack spacing={2} sx={{ pt: 2 }}>
        <TextField select label="Area" id="area_id" name="area_id" defaultValue={habit?.area_id ?? ""}><MenuItem value="">Uncategorized</MenuItem>{areas.map(area => <MenuItem key={area.id} value={area.id}>{area.name}</MenuItem>)}</TextField>
        <TextField label="Description" id="description" name="description" multiline minRows={3} defaultValue={habit?.description ?? ""}/>
        {tracking === "MEASURABLE" && <><div className="form-grid"><TextField label="Minimum (optional)" name="minimum_goal_value" type="number" slotProps={{ htmlInput: { min: 0.001, step: "any" } }} defaultValue={habit?.minimum_goal_value ?? ""}/><TextField label="Stretch (optional)" name="stretch_goal_value" type="number" slotProps={{ htmlInput: { min: 0.001, step: "any" } }} defaultValue={habit?.stretch_goal_value ?? ""}/></div><TextField label="Quick increments" name="quick_increments" defaultValue={(habit?.quick_increments ?? template?.quick_increments ?? []).join(", ")} helperText="Up to five positive amounts, separated by commas. Direct entry remains available."/></>}
        <div className="form-grid"><TextField select label="Priority" name="priority" defaultValue={habit?.priority ?? "NORMAL"}><MenuItem value="LOW">Low</MenuItem><MenuItem value="NORMAL">Normal</MenuItem><MenuItem value="HIGH">High</MenuItem></TextField><TextField select label="Effort" name="difficulty" defaultValue={habit?.difficulty ?? ""}><MenuItem value="">Unspecified</MenuItem><MenuItem value="EASY">Easy</MenuItem><MenuItem value="MODERATE">Moderate</MenuItem><MenuItem value="HARD">Hard</MenuItem></TextField></div>
        <div className="form-grid"><TextField label="End date" id="end_date" name="end_date" type="date" defaultValue={habit?.end_date ?? ""} slotProps={{ inputLabel: { shrink: true } }}/><TextField label="Icon or emoji" id="icon" name="icon" slotProps={{ htmlInput: { maxLength: 40 } }} defaultValue={habit?.icon ?? template?.icon ?? ""}/></div>
        <Stack spacing={1}><Typography component="label" htmlFor="color" variant="body2">Color</Typography><input id="color" name="color" type="color" defaultValue={habit?.color ?? "#245fa6"}/></Stack>
      </Stack></details>
      {error && <Alert severity="error" role="alert">{error}</Alert>}
      <Button variant="contained" type="submit" disabled={pending} sx={{ alignSelf: "flex-start" }}>{pending ? "Saving…" : habit ? "Save changes" : "Create habit"}</Button>
    </Stack>
  </Paper>;
}

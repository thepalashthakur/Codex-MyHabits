import type { Habit, TimeOfDay } from "./domain";

export type Template = {
  id: string; name: string; icon: string; type: Habit["type"];
  tracking_type: Habit["tracking_type"]; goal_value?: number; unit?: string;
  quick_increments?: number[]; time_of_day: TimeOfDay;
};

export const habitTemplates: Template[] = [
  { id: "water", name: "Drink water", icon: "💧", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 2, unit: "L", quick_increments: [0.25, 0.5], time_of_day: "ANYTIME" },
  { id: "walk", name: "Walk", icon: "🚶", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 8000, unit: "steps", quick_increments: [500, 1000], time_of_day: "AFTERNOON" },
  { id: "read", name: "Read", icon: "📖", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 20, unit: "pages", quick_increments: [5, 10], time_of_day: "EVENING" },
  { id: "workout", name: "Workout", icon: "🏋️", type: "GOOD", tracking_type: "BOOLEAN", time_of_day: "AFTERNOON" },
  { id: "meditate", name: "Meditate", icon: "🧘", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 10, unit: "minutes", quick_increments: [5, 10], time_of_day: "MORNING" },
  { id: "stretch", name: "Stretch", icon: "🌿", type: "GOOD", tracking_type: "BOOLEAN", time_of_day: "MORNING" },
  { id: "supplements", name: "Take supplements", icon: "✓", type: "GOOD", tracking_type: "BOOLEAN", time_of_day: "MORNING" },
  { id: "floss", name: "Floss", icon: "✓", type: "GOOD", tracking_type: "BOOLEAN", time_of_day: "EVENING" },
  { id: "sugar", name: "No added sugar", icon: "✓", type: "BAD", tracking_type: "BOOLEAN", time_of_day: "ANYTIME" },
  { id: "sleep", name: "Sleep on time", icon: "🌙", type: "GOOD", tracking_type: "BOOLEAN", time_of_day: "EVENING" },
  { id: "study", name: "Study", icon: "✏️", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 30, unit: "minutes", quick_increments: [10, 30], time_of_day: "AFTERNOON" },
  { id: "practice", name: "Practice a skill", icon: "✦", type: "GOOD", tracking_type: "MEASURABLE", goal_value: 20, unit: "minutes", quick_increments: [5, 10], time_of_day: "ANYTIME" },
];

export function habitTemplate(id?: string) { return habitTemplates.find(template => template.id === id); }

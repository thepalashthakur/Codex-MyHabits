# Codex Implementation Prompt --- Habit Tracker V2

## Purpose

Upgrade the existing **Habit Tracker V1** application into **Habit
Tracker V2**. This is an enhancement of an existing production-oriented
application, **not a greenfield rewrite**.

Preserve the existing Next.js App Router + TypeScript + React +
Tailwind/shadcn + Supabase PostgreSQL + Zod + Server Components/Server
Actions + Vercel architecture and existing authentication. V1 already
contains Today, Habits, Areas, Habit Details, History, Analytics,
Settings, good/bad habits, Boolean/measurable habits,
daily/weekday/weekly-target/monthly-target/interval schedules, start/end
dates, goals/units, reminder configuration,
completion/failure/skip/undo, measurable progress, notes, historical
tracking, streaks, statistics, analytics, timezone-aware scheduling,
optimistic interactions, authorization and Supabase persistence.

Do not remove, regress, or unnecessarily replace those capabilities.

V2 should materially improve **daily execution, flexible habit planning,
reflection/insights, mobile UX, and visual hierarchy**.

------------------------------------------------------------------------

## 1. Mandatory repository audit

Before coding inspect `package.json`, `app/`, `components/`, `lib/`,
`actions/`, `types/`, `supabase/`, migrations, tests, authentication,
design system, Today, habit forms/details, History, Analytics, Areas,
Settings, scheduling/streak/statistics services, and timezone utilities.

Run:

``` bash
git status
git log --oneline --decorate -20
```

Do not initialize another Git repository. Do not replace working
infrastructure. First produce a concise implementation plan covering
reusable V1 architecture, schema changes, migration strategy, UI
changes, services, tests and implementation order.

## 2. V2 product principles

Optimize for fast logging, low cognitive load, flexible scheduling,
accurate history, meaningful progress, useful reflection, mobile-first
interaction, excellent desktop use, privacy, accessibility and data
correctness.

Do not turn the app into a mood tracker, generic journal, social
network, coaching platform, AI chatbot or broad wellness suite.

## 3. Navigation

Use:

``` text
Today
Habits
History
Insights
Areas
Settings
```

Rename user-facing **Analytics** to **Insights**. Prefer `/insights`;
use a redirect from `/analytics` if routes change.

## 4. Today V2

Today becomes the strongest screen. Replace dashboard/card-heavy
presentation with a compact actionable daily list. Immediately
communicate what is complete, partial and remaining.

Example:

``` text
Sunday, October 4                         70%
7 of 10 habits completed

MORNING                                   3/3
✓ Drink Water                     3 / 3 L
✓ Meditation                       10 min
✓ Supplements

AFTERNOON                                 2/3
✓ Read                             30 pages
◉ Walk                        6,420 / 10,000
✓ Healthy Lunch

EVENING                                   2/4
○ Workout                          45 min
✓ Floss
○ No phone after 10 PM
✓ Prepare tomorrow
```

Use the existing design system rather than copying ASCII literally.

## 5. Time-of-day organization

Add optional `MORNING`, `AFTERNOON`, `EVENING`, `ANYTIME` grouping.
Existing habits migrate safely to `ANYTIME`. Users can reorder habits
within groups. Keep representation future-extensible and do not force
assignment.

## 6. Daily progress

Display a compact scheduled-habit progress summary. Explicitly document
how completed, failed, skipped, paused and partially completed habits
affect progress. Never count unscheduled habits.

## 7. Inline tracking

Boolean habits support fast Complete with secondary Fail/Skip/Undo
actions. Measurable habits support inline progress, increment/decrement
where sensible, direct entry and optimistic updates. Users should rarely
need Habit Detail just to log progress.

## 8. Configurable quick increments

Per measurable habit support positive quick increments such as
`+250 ml`, `+500 ml`, `+5 pages`, `+10 pages`, `+500 steps`. Do not
hardcode globally. Direct numeric entry always remains available.

## 9. First-class partial progress

Represent `6,420 / 10,000` as 64.2% without forcing complete/fail.
Preserve the existing HabitLog model where possible and avoid
unnecessary rows. Keep operations idempotent and race-safe.

## 10. Minimum / Target / Stretch goals

Support optional tiers:

``` text
Minimum  5,000
Target   8,000
Stretch 10,000
```

Enforce `minimum <= target <= stretch`. Target remains the normal
completion threshold unless existing semantics require a documented
alternative. Show tier progress without excessive gamification.

## 11. Flexible weekly/monthly targets

Preserve `WEEKLY_TARGET` and `MONTHLY_TARGET`. A `3 times this week`
habit must not require fixed weekdays. Streak/statistics logic must
understand period targets.

## 12. Habit pause periods

Add temporary pauses distinct from archive, skip, fail and
not-scheduled.

Conceptual model:

``` ts
HabitPause {
  id
  userId
  habitId
  startDate
  endDate?
  reason?
  note?
  createdAt
  updatedAt
}
```

Support reasons such as Vacation, Sick, Recovery, Unavailable, Busy
period and Custom without making them mandatory. Prevent invalid
overlaps where appropriate.

## 13. Pause semantics

Paused dates do not count as failures, misses or scheduled opportunities
and should not destroy an otherwise valid streak. History must visually
distinguish Paused, Skipped and Not scheduled.

## 14. Habit lifecycle

Represent Active, Paused and Archived cleanly. Upcoming can be derived
from future `startDate` rather than duplicated state where appropriate.

## 15. Priority and difficulty

Add optional priority (`LOW`, `NORMAL`, `HIGH`) and optional
user-defined effort (`Easy`, `Moderate`, `Hard`). These are metadata,
not objective judgments. Defaults must not make everything look urgent.

## 16. Habit stacking

Support explicit `AFTER` relationships,
e.g. `Morning Coffee → Meditation`. Prevent self-reference, cross-user
links and invalid cycles.

Conceptual model:

``` ts
HabitRelationship {
  id
  userId
  sourceHabitId
  targetHabitId
  type
  position?
  createdAt
}
```

Only show routine-style presentation when relationships exist; Today
grouping remains primary.

## 17. Templates

Add editable starting templates such as Drink Water, Walk, Read,
Workout, Meditate, Stretch, Supplements, Floss, No Sugar, Sleep on Time,
Study and Practice a Skill. Templates may prefill name/icon/area
suggestion/tracking type/goal/unit/schedule/quick
increments/time-of-day. Store maintainable configuration rather than
duplicated UI logic.

## 18. Simplified creation

The initial create flow should expose only essential fields and use
progressive disclosure.

``` text
Create Habit
[ Drink more water ]

Type: Build / Break
Goal: [3] [litres]
Repeat: Every day
Time: Anytime

[ Create Habit ]
More options
```

Advanced fields can include Area, icon, color, description,
minimum/stretch, increments, priority, difficulty, reminder, dates and
habit stack relationship.

Provide both **Create from scratch** and **Use a template**. Add Quick
Add from Today, Habits and mobile `+`, with name focused immediately.

## 19. UI redesign

Use restrained productivity-focused design. Avoid giant habit cards,
unnecessary gradients, glassmorphism, excessive shadows/borders/badges,
oversized headers and decorative charts on Today. Prefer typography
hierarchy, whitespace, compact rows, subtle separators, consistent
iconography and small habit-color accents.

Desktop should use an efficient sidebar/app shell and available width
intelligently. Mobile may use `Today / Habits / + / History / Insights`
bottom navigation, with Areas/Settings secondary. Respect safe areas and
accessible touch targets.

Swipe actions are optional and must always have
keyboard/mouse/non-gesture alternatives.

## 20. Habit Detail V2

Organize around rapid understanding:

``` text
Meditation                              Active
12 day streak

This month
██████████████████░░ 89%

28 completed
2 skipped
1 missed

Consistency
[heatmap]

Progress
[trend]

Current streak 12
Best streak    42
Schedule       Every day
Usually done   7:00–8:00 AM

Notes
...
```

Actions: Edit, Pause/Resume, Archive, Delete. Permanent deletion remains
intentionally difficult.

## 21. Consistency heatmap

Add responsive accessible consistency heatmaps. Do not communicate state
only through color. Provide labels/tooltips/detail access. Selecting a
date shows relevant activity.

## 22. History V2

Distinguish Completed, Partially completed, Failed, Skipped, Paused,
Pending and Not scheduled. Date selection shows daily summary, scheduled
habits, progress, values and relevant notes. Historical meaning must not
silently change after goal/schedule/name/archive changes.

## 23. Insights V2

Replace BI-style Analytics presentation with interpretation-focused
Insights. Answer:

-   How consistent am I?
-   What is improving?
-   What needs attention?
-   Which habits are strongest?
-   Which are struggling?
-   Which weekdays are easiest/hardest?
-   How does this period compare with the previous equivalent period?

Support 7d, 30d, 3m, 6m, 1y and all-time ranges.

Useful views include completion trend, consistency heatmap, completion
by weekday, Area performance, habit comparison and measurable-value
trend. Avoid chart overload.

Use scheduled opportunities as denominators; unscheduled/paused dates
must not lower completion rates.

Strongest/needs-attention rankings require enough observations to be
meaningful; use a documented minimum-data threshold.

## 24. Areas V2

Areas become progress views, not just folders:

``` text
Health    82%   6 habits
Fitness   74%   4 habits
Learning  91%   3 habits
```

Area detail shows period progress, comparison and member-habit
performance. Reuse shared statistics/insight services rather than
duplicating analytics.

## 25. Weekly Review

Add an optional compact habit review, not generic journaling:

``` text
Your Week
82% consistency
↑ 6% vs last week

Best habit: Meditation — 7/7
Improved most: Reading — 86%
Needs attention: Workout — 1/3

Completed 34
Skipped 3
Missed 5
```

A small optional period-specific reflection note is acceptable. Only
introduce a `HabitReview` persistence model if free-text review notes
are implemented; derived statistics should normally be calculated from
logs.

## 26. Milestones

Add quiet deterministic recognition such as 7/30/100 completions and
7/30/100-day streaks. Avoid coins, points, loot boxes, manipulative
pressure or confetti-heavy gamification.

## 27. Skip/failure semantics

Allow optional skip reasons such as Sick, Travel, Rest day, Unavailable,
Schedule conflict or Custom. A nullable `reason` on the log may be
sufficient.

Explicit `FAILED` must remain distinct from a derived historical
**missed** occurrence where a past scheduled habit simply has no
qualifying log. Do not pre-create failed rows for every missed date.

## 28. Import / Export

Add user-controlled JSON and CSV export covering habits, areas,
schedules, goals, logs, values, notes, pauses, reminder configuration,
relationships and relevant metadata. CSV may use multiple logical files
where flattening would lose structure.

Support safe import of the app's own exported format. Validate schema,
preview changes, deliberately handle duplicates, use transactions where
practical, and never silently overwrite. Conflict choices may include
Skip duplicate or Create copy. Do not implement unsafe automatic
merging.

Treat imported files as untrusted. Never trust imported `userId`; scope
imported records to the authenticated user through controlled server
logic.

## 29. Historical integrity

Inspect how V1 preserves historical meaning before changing anything. If
editing names/goals/units/schedules/areas can reinterpret old logs,
implement the smallest reliable snapshot/versioning strategy. Do not
blindly add version tables. Document the chosen behavior.

## 30. Habits screen

Support compact search/filter by name, area, Active/Paused/Archived,
good/bad, Boolean/measurable, time of day and priority. Do not display
every filter simultaneously.

Support Create, Edit, Pause, Resume, Archive, Restore, Delete and
reorder. Permanent deletion remains secondary.

## 31. Empty/loading/error feedback

Use calm intentional states. Examples:

``` text
Nothing scheduled today
Enjoy the open day, or add a habit.
```

``` text
No habits yet
Start with one habit you want to repeat consistently.
[Create habit] [Browse templates]
```

``` text
Not enough data yet
Keep tracking your habits and insights will appear here.
```

Preserve optimistic logging with rollback. Avoid success toasts for
every completion; reserve toasts for errors, undo, important changes,
imports/exports and destructive operations.

## 32. Accessibility and responsive design

Support keyboard navigation, semantic controls, screen readers, visible
focus, contrast, reduced motion, light/dark/system themes and accessible
touch interaction. Status and heatmaps must not rely only on color.
Gestures require alternatives.

Test small/large mobile, tablet, laptop, desktop and wide desktop. Do
not merely stretch mobile cards on desktop or shrink desktop tables on
mobile.

## 33. Settings V2

Suggested organization:

``` text
Appearance
  Theme

Preferences
  Timezone
  Week starts on
  Default Today grouping

Tracking
  Completion/skip preferences

Notifications
  Reminder configuration/status

Data
  Export
  Import

About
  Version
```

Only show settings that actually work. Add Monday/Sunday week-start
preference carefully; ensure weekly target semantics and existing users
are migrated deliberately.

## 34. Database changes

Inspect the current schema first. Likely additions include:

``` text
Habit:
  timeOfDay?
  priority?
  difficulty?
  quickIncrements?
  minimumGoalValue?
  stretchGoalValue?

HabitPause
HabitRelationship

HabitLog:
  reason?
```

Only add `HabitReview` if persisted review notes are implemented.

Use foreign keys, indexes, uniqueness/check constraints, timestamps,
ownership and RLS appropriately. Validate
`minimum <= target <= stretch`, positive increments, pause ranges and
`sourceHabit != targetHabit`. Prevent cross-user relationships.

Evaluate useful indexes such as Habit by
user/archive/area/timeOfDay/priority, HabitLog by user/date and
habit/date, pause date ranges, and relationship source/target. Avoid
redundant indexes.

## 35. Scheduling V2

The existing centralized scheduling engine remains authoritative. Extend
it for pause periods rather than duplicating rules in React.

Potential domain functions:

``` ts
isHabitScheduledForDate()
isHabitPausedForDate()
getHabitStateForDate()
```

Document evaluation order for start/end dates, archive history, pauses
and schedule exclusions.

## 36. Streak V2

Extend schedule-aware streak tests for pauses, weekly/monthly targets,
partial measurable progress, goal tiers, future starts, end dates,
skip/fail/missed states. Never reduce streak logic to consecutive
calendar days.

Recommended default: reaching the **target** qualifies normal
completion/streak semantics. If minimum has different semantics, make
them explicit.

## 37. Statistics / Insights service layer

Extend statistics for completion rate, current/best streak, scheduled
opportunities, completed/failed/skipped/missed/paused, partial progress,
average measurable value, target/minimum/stretch achievement, weekday
performance, Area performance and period comparison.

Create/reuse testable services such as:

``` ts
getOverallConsistency()
getPeriodComparison()
getHabitPerformance()
getAreaPerformance()
getWeekdayPerformance()
getStrongestHabits()
getHabitsNeedingAttention()
getConsistencyHeatmap()
getWeeklyReviewSummary()
```

Do not put calculations inside chart components.

## 38. Performance and architecture

Design for years of data. Use bounded date queries, indexed filtering,
server/database aggregation, pagination and concurrent independent
requests. Avoid N+1 queries, loading all logs into the browser,
duplicate insight queries and unnecessary `"use client"`.

Prefer reusable domain-oriented components such as `HabitRow`,
`HabitProgress`, `HabitQuickActions`, `HabitGroup`, `DailyProgress`,
`TimeOfDaySection`, `GoalTierIndicator`, `HabitHeatmap`,
`InsightMetric`, `PeriodSelector`, `HabitPauseDialog`,
`HabitTemplatePicker`, `QuickHabitDialog`, `WeeklyReview` and
`AreaProgress`.

Use the existing design system and tokens. Do not add a competing UI
framework.

## 39. Security and privacy

Every protected operation must resolve authenticated user server-side,
validate input, load resource, verify ownership and then mutate. Never
trust browser-supplied `userId`. Apply this to habits, logs, areas,
notes, pauses, relationships, reviews, reminders, import and export.

Keep privileged Supabase credentials server-only.

Do not unnecessarily send personal habit names, notes, custom areas,
values or free text to third-party analytics.

## 40. Existing V1 migration guarantees

Existing users must retain all habits, historical logs, Areas, notes,
measurable values and schedule/streak data. Give new fields safe
defaults such as `ANYTIME`, `NORMAL`, nullable difficulty and nullable
increments. Never reset the database or rewrite historical completion
records merely to simplify V2.

## 41. Automated tests

All valid V1 tests continue to pass. Add deterministic tests for:

### Pauses

-   start/end/open-ended pause
-   resume
-   overlap validation
-   pause outside schedule
-   timezone boundaries
-   ownership
-   pauses excluded from failures/opportunities
-   streak continuity

### Goal tiers

Test values below minimum, at minimum, below target, at target, below
stretch and at stretch; reject invalid ordering and negative values.

### Quick increments

Test increment/decrement/direct entry, rapid updates/races, optimistic
rollback, no duplicate logical logs, target crossing and undo.

### Habit stacking

Test create/remove, ownership, self-reference rejection, invalid target,
cycle prevention, archive/delete behavior. Removing a relationship must
never delete habits.

### Insights

Test completion rate, weekday/Area performance, equivalent-period
comparison, rankings, heatmap values and paused/unscheduled exclusion.

### Import/export

Test JSON/CSV export, valid import, invalid schema/dates/values,
duplicate conflicts, cross-user ID handling and round-trip where
practical.

## 42. Implementation phases

Implement incrementally:

1.  Repository audit and plan.
2.  Domain foundations: time-of-day, priority/difficulty, increments,
    goal tiers, pauses, skip reason, relationships.
3.  Scheduling/streak/statistics extensions with tests.
4.  Today V2.
5.  Habit creation V2, Quick Add and templates.
6.  Habit Detail and History V2.
7.  Insights V2.
8.  Areas V2.
9.  Weekly Review and milestones.
10. Import/export.
11. Responsive/accessibility/dark-mode/error/loading polish.
12. Full verification.

Run the repository's actual equivalents of lint, tests, type checks and
production build after each major phase.

## 43. Git requirements

Before each commit inspect:

``` bash
git status
git diff
git diff --staged
```

Prefer one coherent feature per commit. Possible sequence:

``` text
feat: add v2 habit metadata and goal tiers
feat: add habit pause periods
feat: extend scheduling and streak logic for pauses
feat: improve measurable habit progress
feat: add configurable quick increments
feat: add habit stacking relationships
feat: redesign today experience
feat: add time-of-day habit grouping
feat: simplify habit creation
feat: add habit templates
feat: redesign habit detail
feat: add consistency heatmap
feat: improve history states
feat: replace analytics experience with insights
feat: add weekday and area insights
feat: add weekly habit review
feat: add habit milestones
feat: add habit data export
feat: add safe habit data import
test: expand v2 domain coverage
docs: document habit tracker v2
```

These are examples, not mandatory artificial commit boundaries.

## 44. Manual verification

Verify all critical flows on desktop and mobile: Today, Boolean
completion, measurable increments, create/edit, pause/resume, Habit
Detail, History, Insights, Areas, Settings and import/export.

Check no horizontal overflow, safe-area navigation, keyboard behavior,
touch-friendly progress controls and responsive charts/heatmaps.

Audit unnecessary client bundles, N+1 queries, unbounded log queries,
excessive rerenders and slow Today/Insights rendering.

## 45. Definition of Done

V2 is complete when the authenticated user can:

1.  Continue using all valid V1 functionality and historical data.
2.  Use the redesigned fast Today experience.
3.  Organize habits by Morning/Afternoon/Evening/Anytime.
4.  Log Boolean habits quickly.
5.  Record measurable progress inline.
6.  Use configurable quick increments.
7.  See partial measurable progress.
8.  Configure minimum/target/stretch goals.
9.  Use flexible weekly/monthly targets.
10. Pause/resume without incorrect streak/statistics penalties.
11. Distinguish paused/skipped/failed/missed/unscheduled states.
12. Set optional priority and difficulty.
13. Stack habits through explicit relationships.
14. Create habits rapidly through Quick Add.
15. Create/edit habits from templates.
16. Use progressive-disclosure configuration.
17. View improved Habit Details and consistency heatmaps.
18. Browse accurate improved History.
19. Use Insights with period comparisons, weekday performance, Area
    performance and meaningful rankings.
20. Use weekly habit reviews and lightweight milestones.
21. Export their data and safely import supported data.
22. Use the app comfortably on mobile/desktop, keyboard and assistive
    technology.
23. Use light/dark/system themes correctly.
24. Access only their own records.
25. Pass tests, lint, type checks and production build.
26. Deploy successfully to Vercel.

## 46. Explicit non-goals

Do not add Mood tracking/analytics, generic journaling, separate sleep
or meditation products, social feeds, friends, leaderboards, public
profiles, coaching marketplace, AI chatbot/health advice, calorie
tracking, medical/financial tracking or Habitify API integration.

Users may track activities such as meditation or sleep time **as
habits**, but V2 must remain a habit tracker.

## 47. Final engineering rule

V2 must feel like the natural evolution of V1, not a replacement
template.

Preserve authentication, Supabase architecture, user data,
schedule/timezone correctness, history, security, tests and working
infrastructure.

When choosing between more features and a faster/clearer experience,
choose the faster/clearer experience. When choosing between visual
novelty and predictable usability, choose predictable usability. When
choosing between architectural complexity and simple typed testable
domain logic, choose simple typed testable domain logic.

Do not claim V2 is complete until it is implemented, tested and verified
in the actual repository.

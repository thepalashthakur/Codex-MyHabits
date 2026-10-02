# Codex Build Instructions — Habit Tracker Web App

## Objective

Build a production-ready **habit tracking web application** using **Next.js App Router + TypeScript**, designed for deployment on **Vercel**.

Use the habit-related concepts from Habitify as functional inspiration:
https://api-docs.habitify.me/api#description/introduction

Do **not** integrate with Habitify's API and do not copy Habitify branding/UI. This must be an independent product.

The product scope is strictly habit-related. Do **not** implement Mood, mood logs, mood analytics, meditation, sleep tracking, generic journaling, social/community features, coaching, or unrelated wellness modules.

---

## 1. Existing Infrastructure

### Authentication

Authentication already exists in the repository.

- Inspect and reuse the existing authentication implementation.
- Do not introduce a second auth provider.
- Create/use a clean server-side boundary such as `getCurrentUser()`, `requireUser()`, and `getCurrentUserId()`.
- Never trust a `userId` supplied by the browser.
- Every query and mutation must be scoped to the authenticated user.
- If the auth integration cannot be determined, create a small adapter and clearly mark the integration point rather than inventing a replacement auth system.

### Supabase

Use **Supabase PostgreSQL** as the application's persistent data store.

- Reuse an existing Supabase setup if present.
- Keep privileged Supabase credentials server-only.
- Prefer server-side database access for protected data.
- Use Row Level Security where appropriate as defense in depth, but still perform application-level ownership checks.
- Do not expose service-role credentials to client components.
- Use migrations/schema files that can be reproduced across environments.
- Do not add S3 for this application.
- The initial habit tracker does not require user file uploads.

If the existing repository already uses a stable Supabase-compatible ORM/data layer, retain it. Otherwise use a simple, maintainable Supabase/Postgres data-access layer rather than introducing unnecessary infrastructure.

---

## 2. Technology

Use:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui where useful
- Supabase PostgreSQL
- Zod validation
- Server Components by default
- Server Actions for authenticated application mutations where appropriate
- Route Handlers only where an HTTP endpoint is genuinely needed
- Vercel-compatible architecture

Follow existing repository conventions, package manager, linting, formatting, and component patterns.

Use the Node.js runtime by default.

---

## 3. Core Product

The application should contain:

1. Today
2. Habits
3. Areas
4. Habit Details
5. History
6. Analytics
7. Settings

Core capabilities:

- Create/edit/archive/delete habits
- Good and bad habits
- Boolean and measurable habits
- Daily schedules
- Specific weekdays
- Weekly targets
- Monthly targets
- Interval schedules
- Start/end dates
- Habit goals and units
- Habit reminders
- Habit completion/failure/skip/undo
- Measurable progress
- Habit notes
- Areas/categories
- Historical tracking
- Current/best streaks
- Completion statistics
- Progress analytics

---

## 4. Areas

An Area groups habits.

Examples: Health, Fitness, Learning, Productivity.

Suggested structure:

```ts
Area {
  id
  userId
  name
  color?
  icon?
  position
  createdAt
  updatedAt
}
```

Users can create, edit, delete, reorder and filter by areas.

Deleting an area must not accidentally delete its habits. Habits should become uncategorized or require reassignment.

---

## 5. Habits

Suggested structure:

```ts
Habit {
  id
  userId
  areaId?

  name
  description?

  type
  trackingType

  goalValue?
  unit?

  scheduleType
  scheduleConfig

  startDate
  endDate?

  color?
  icon?

  position

  isArchived
  archivedAt?

  createdAt
  updatedAt
}
```

Habit types:

```ts
GOOD
BAD
```

Tracking types:

```ts
BOOLEAN
MEASURABLE
```

Boolean example: Exercise today.

Measurable examples:

- Drink 3 litres of water
- Read 30 pages
- Walk 10,000 steps

Do not hardcode measurement units.

---

## 6. Scheduling Engine

Scheduling is core domain logic.

Support:

```ts
DAILY
WEEKDAYS
WEEKLY_TARGET
MONTHLY_TARGET
INTERVAL
```

Examples:

- Every day
- Monday, Wednesday and Friday
- 4 times per week
- 5 times per month
- Every 2 days

Store schedule configuration as structured data rather than display strings.

Create centralized logic such as:

```ts
isHabitScheduledForDate(habit, date)
getScheduledHabits(userId, date)
```

Never duplicate scheduling calculations across React components.

The engine must respect:

- user timezone
- habit start date
- habit end date
- archived state
- schedule configuration

---

## 7. Habit Logs

Habit activity must be stored separately from habit configuration.

```ts
HabitLog {
  id
  habitId
  userId
  date
  status
  value?
  createdAt
  updatedAt
}
```

Statuses:

```ts
COMPLETED
FAILED
SKIPPED
```

No row should generally mean pending/not recorded.

Do not pre-create pending rows for every future habit/date.

Support:

- Complete
- Fail
- Skip
- Undo
- Update measured value

Use database constraints to prevent duplicate logical logs for a habit/date.

Operations should be idempotent where practical.

---

## 8. Today Dashboard

Primary route:

```text
/today
```

Show only habits scheduled for the selected local date.

Each habit should show relevant information such as:

- name
- icon
- area
- goal
- measured progress
- status
- streak

Boolean quick actions:

```text
Complete
Fail
Skip
Undo
```

Measurable habits should support increment/decrement and direct entry.

Example:

```text
Drink Water

2 / 3 L

[-] [+]
```

Display daily progress:

```text
7 / 10 completed
70%
```

Provide date navigation so previous days can be reviewed.

---

## 9. Habits Screen

Route:

```text
/habits
```

Sections:

- Active
- Archived

Support:

- create
- edit
- archive
- restore
- permanent delete

Prefer archive over permanent deletion.

Permanent deletion must require confirmation and clearly explain its impact on history.

---

## 10. Create/Edit Habit

The basic flow should be quick.

Required:

- Name
- Habit type
- Tracking type
- Schedule
- Start date

Optional:

- Description
- Area
- Icon
- Color
- Goal
- Unit
- End date
- Reminder

Use progressive disclosure for advanced options.

Example:

```text
Name: Read
Area: Learning
Goal: 30 pages
Schedule: Every day
Reminder: 9:00 PM
```

---

## 11. Habit Detail

Route:

```text
/habits/[habitId]
```

Display:

- name
- description
- area
- schedule
- goal
- current streak
- best streak
- completion rate
- recent activity
- calendar/history
- statistics
- notes

Actions:

- Edit
- Archive
- Delete

---

## 12. Habit Notes

Notes must belong to habits rather than becoming a generic journal.

```ts
HabitNote {
  id
  userId
  habitId
  date?
  content
  createdAt
  updatedAt
}
```

Example: "Finished chapter 6."

---

## 13. History

Route:

```text
/history
```

Provide a calendar-oriented history.

Represent:

- Completed
- Failed
- Skipped
- Pending
- Not scheduled

Selecting a day should show that day's scheduled habits and recorded state.

Historical data must remain meaningful even if a habit is later edited.

Avoid recalculating old results in a way that silently rewrites history.

---

## 14. Streak Engine

Implement streak calculations in testable domain services.

Provide:

```ts
calculateCurrentStreak()
calculateBestStreak()
```

Streaks must understand schedules.

A Monday/Wednesday/Friday habit must not lose its streak because Tuesday had no scheduled occurrence.

Weekly/monthly target habits require period-based semantics rather than daily semantics.

Define and document how `SKIPPED` affects streaks.

Add automated tests for all streak rules.

---

## 15. Statistics

For each habit calculate:

- Current streak
- Best streak
- Completion rate
- Completed count
- Failed count
- Skipped count
- Scheduled opportunities

For measurable habits also calculate:

- Total value
- Average value
- Goal achievement rate

Support:

- 7 days
- 30 days
- 3 months
- 6 months
- 1 year
- All time

Unscheduled dates must never count as failures.

---

## 16. Analytics

Route:

```text
/analytics
```

Include useful metrics such as:

- Overall completion rate
- This week vs previous week
- Active habit count
- Longest current streaks
- Completion trend
- Area-level completion
- Completed habits per day

Use charts only when they communicate useful information.

All charts must be responsive.

A useful weekly component:

```text
          M T W T F S S
Read      ✓ ✓ ✓ ✓ ○ ○ ○
Workout   ✓ - ✓ - ✓ - -
Water     ✓ ✓ × ✓ ○ ○ ○
```

Where:

```text
✓ completed
× failed
→ skipped
○ pending
- not scheduled
```

---

## 17. Reminders

Model reminders independently.

```ts
HabitReminder {
  id
  habitId
  userId
  time
  timezone
  enabled
  createdAt
  updatedAt
}
```

Allow the schema to support multiple reminders per habit.

Do not run a permanent background Node.js process on Vercel.

Persist reminder configuration first.

Actual delivery can later use Vercel Cron, web push, email, or another notification service.

Do not display reminders as successfully delivered unless delivery infrastructure actually exists.

---

## 18. Timezones

Timezone behavior must be correct.

- Store timestamps in UTC.
- Obtain/store the user's timezone.
- Habit `date` represents the user's local calendar date.
- Never depend on the Vercel server timezone.
- Centralize date/time utilities.

For example, a completion at 11:30 PM Asia/Kolkata belongs to that user's local calendar day.

---

## 19. UI/UX

Desktop navigation:

```text
Today
Habits
History
Analytics
Areas
Settings
```

Provide responsive mobile navigation.

Design should be modern, minimal and productivity-focused.

Prioritize:

- fast habit check-ins
- readable typography
- whitespace
- accessibility
- responsive layouts
- accessible contrast

Support:

- Light
- Dark
- System theme

Avoid unnecessary gradients, glass effects and oversized decorative cards.

---

## 20. Empty, Loading and Error States

Every major screen needs an intentional empty state.

Example:

```text
No habits yet

Create your first habit and start building consistency.

[Create habit]
```

Use Next.js conventions where appropriate:

```text
loading.tsx
error.tsx
not-found.tsx
```

Use skeletons for meaningful loading states.

Never expose raw database/internal errors.

---

## 21. Optimistic UI

Habit tracking should feel immediate.

Use optimistic updates where safe for:

- Complete
- Undo
- Skip
- Fail
- Increment/decrement measured value

Rollback when the server operation fails.

The database remains the source of truth.

---

## 22. Supabase Data Integrity

Create proper foreign keys and indexes.

All user-owned records must be associated with the authenticated user.

Useful indexes include:

```text
Habit(userId, isArchived)
HabitLog(userId, date)
HabitLog(habitId, date)
HabitNote(habitId)
Area(userId)
```

Enforce a unique logical habit/date log where applicable.

Use Supabase/Postgres constraints rather than relying only on frontend validation.

Configure Row Level Security policies for user-owned tables where compatible with the existing auth setup.

RLS must not be treated as a substitute for correct application authorization.

---

## 23. Security

Every mutation must independently:

1. Resolve authenticated user
2. Validate input with Zod
3. Load the requested entity
4. Verify ownership
5. Perform the mutation

Never accept client-supplied ownership as authoritative.

Keep Supabase secrets and privileged clients server-only.

Do not expose sensitive environment variables through `NEXT_PUBLIC_*`.

---

## 24. Next.js Architecture

Prefer Server Components.

Use Client Components only for genuine interactivity such as:

- dialogs
- interactive forms
- charts
- drag/drop
- optimistic controls
- client state

Do not mark large page trees `"use client"`.

Use Server Actions for internal authenticated mutations when appropriate.

Use Route Handlers for genuine HTTP/API requirements.

Keep Supabase/database access server-side unless a client-side Supabase operation is explicitly justified and secured by RLS.

---

## 25. Suggested Structure

Adapt this to the existing repository:

```text
app/
  (app)/
    layout.tsx

    today/
      page.tsx

    habits/
      page.tsx

      new/
        page.tsx

      [habitId]/
        page.tsx

        edit/
          page.tsx

    history/
      page.tsx

    analytics/
      page.tsx

    areas/
      page.tsx

    settings/
      page.tsx

  api/

components/
  habits/
  dashboard/
  analytics/
  areas/
  ui/

lib/
  auth/
  supabase/
  habits/
  schedules/
  streaks/
  statistics/
  dates/
  validation/

actions/
  habits.ts
  logs.ts
  areas.ts
  notes.ts

types/

supabase/
  migrations/
```

---

## 26. Domain Services

Keep business logic out of React components.

Implement testable functions/services such as:

```ts
isHabitScheduledForDate()
getScheduledHabits()
calculateCurrentStreak()
calculateBestStreak()
calculateCompletionRate()
calculateHabitStatistics()
recordHabitCompletion()
recordHabitFailure()
skipHabit()
undoHabitLog()
updateHabitProgress()
```

Prefer pure functions for scheduling, streaks and statistics.

---

## 27. Performance

Design for years of history.

Do not load all logs for every page.

Use:

- indexed queries
- date filtering
- bounded ranges
- database aggregation
- pagination where appropriate
- concurrent independent server requests

Avoid N+1 queries.

Do not calculate large analytics datasets in the browser when the server/database can aggregate them efficiently.

---

## 28. Accessibility

Support keyboard navigation.

Use semantic HTML and accessible controls.

Do not communicate habit status only through color.

Provide labels/icons/text equivalents.

Forms need proper labels and validation messages.

---

## 29. Testing

At minimum test scheduling, streaks, logging and authorization.

### Daily

Completed Monday, Tuesday, Wednesday → current streak 3.

### Weekdays

Schedule Monday/Wednesday/Friday → Tuesday must not break streak.

### Interval

Every 2 days → only scheduled dates affect streak.

### Weekly target

Exercise 3 times/week → correctly determine whether the period target is achieved.

### Measurable

Goal 3 L/day.

Logs/increments totaling 3 L should result in goal completion.

Also test:

- fail
- skip
- undo
- timezone boundaries
- start/end dates
- archived habits
- duplicate logging
- ownership isolation
- unauthorized mutations

---

## 30. Development Seed Data

Provide optional development seed data:

Areas:

- Health
- Fitness
- Learning

Habits:

- Drink Water — 3 L daily
- Read — 30 pages daily
- Workout — Monday/Wednesday/Friday
- Walk — 10,000 steps daily

Do not run production seed data automatically.

---

## 31. Vercel Deployment

Ensure the project can be deployed cleanly to Vercel.

Document required environment variables, including Supabase configuration and any existing auth configuration.

Do not hardcode environment-specific URLs or credentials.

Run and fix:

```bash
npm run lint
npm run test
npm run build
```

Use the repository's actual package manager/scripts if different.

The final production build must succeed before considering the implementation complete.

---

# 32. Implementation Process for Codex

Do not immediately start rewriting the repository.

Follow this order.

### Phase 1 — Repository Inspection

Inspect:

- package.json
- existing auth
- Supabase setup
- database/schema/migrations
- existing design system
- Next.js structure
- environment configuration
- existing utilities
- test framework
- Vercel configuration

Produce a short implementation plan based on what actually exists.

Do not replace working infrastructure.

### Phase 2 — Domain Design

Define:

- tables
- constraints
- indexes
- RLS policies
- schedule representation
- streak semantics
- timezone rules

Create migrations.

### Phase 3 — Domain Logic

Implement and test scheduling, logging, streaks and statistics before embedding the logic deeply into UI components.

### Phase 4 — Core UI

Implement in this priority:

1. App shell/navigation
2. Today
3. Create/edit habit
4. Habits list
5. Habit detail
6. Areas
7. History
8. Analytics
9. Settings

### Phase 5 — Polish

Add:

- optimistic interactions
- loading states
- empty states
- error handling
- responsive behavior
- accessibility
- dark mode

### Phase 6 — Verification

Verify:

- authentication
- user isolation
- Supabase policies
- schedule edge cases
- timezone behavior
- mobile responsiveness
- tests
- lint
- production build

---

# 33. Important Engineering Rules

Do not:

- build another auth system
- add Mood features
- integrate directly with Habitify
- add S3
- place business logic inside presentation components
- trust browser-supplied user IDs
- expose Supabase privileged credentials
- create pending log rows for every date
- count unscheduled days as failures
- calculate streaks as simple consecutive calendar days
- use server timezone as the user's timezone
- silently swallow errors
- introduce large dependencies without a clear need
- rewrite existing working infrastructure merely to match this specification

Prefer simple, typed, testable implementations.

When an implementation decision is ambiguous, prioritize:

1. data correctness
2. security
3. simple UX
4. maintainability
5. performance
6. visual polish

---

# 34. Definition of Done

The feature is complete when an authenticated user can:

1. Create areas.
2. Create Boolean and measurable habits.
3. Configure daily, weekday, interval, weekly-target and monthly-target schedules.
4. See the correct habits for today.
5. Complete, fail, skip and undo habit logs.
6. Record measurable progress.
7. Navigate historical dates.
8. View habit history.
9. Add habit-specific notes.
10. Archive and restore habits.
11. View accurate current/best streaks.
12. View meaningful habit statistics and analytics.
13. Use the application comfortably on desktop and mobile.
14. Refresh/reopen the application without losing state because data is persisted in Supabase.
15. Access only their own records.
16. Deploy the application successfully on Vercel.

Before finishing, provide a concise README section covering:

- architecture
- Supabase schema/migrations
- RLS/security assumptions
- authentication integration
- environment variables
- local setup
- tests
- Vercel deployment
- known limitations
- reminder-delivery status

Do not claim functionality exists unless it has actually been implemented and verified.

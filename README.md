# MyHabits

A Next.js habit tracker with Supabase Auth and PostgreSQL, user scoped REST endpoints, and a bearer token MCP endpoint. Inspired by habit tracking concepts, with its own interface and data model.

## Architecture

- `src/app/(app)` contains the authenticated screens: Today, Habits, Areas, History, Insights, and Settings. `/analytics` redirects to Insights.
- `src/lib/domain.ts` contains dated schedule, pause, goal-tier, streak, and statistics functions. `src/lib/insights.ts` builds period comparisons, rankings, and weekly reviews. Server components query Supabase through `src/lib/data.ts`; interactive controls call HTTP route handlers.
- `src/lib/auth.ts` wraps Supabase Auth. It follows the same email/password and server cookie pattern as the supplied `UseAuth` reference repo, deployed at `https://use-auth-rosy.vercel.app`. MyHabits must use **the same Supabase project** so existing UseAuth accounts can sign in here. The UseAuth hosted cookie cannot be shared across these domains; users sign in on MyHabits to establish its own secure session. No second identity provider or service role key is used. Bearer requests use the same Supabase user identity.
- `supabase/migrations/20261007000000_myhabits.sql` is the single complete schema file. It installs missing phases for habits, schedule history, V2 planning, and routines in one transaction while retaining existing tracker rows. History uses the version effective on the viewed date. A skip preserves a streak without increasing it; pauses are excluded from scheduled opportunities. Weekly and monthly target streaks count successful periods.

## Setup

1. Use the same Supabase project as UseAuth. Run the entire `supabase/migrations/20261007000000_myhabits.sql` file once in Supabase SQL Editor. It can also upgrade an existing MyHabits V1/V2 schema and be rerun safely. The tracker tables all start with `tracker_`; the existing `profiles`, `areas`, `habits`, and `habit_logs` tables belong to another schema and must be left alone.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the **same project values** used by UseAuth, plus `APP_URL` (for example, `http://localhost:3000`). These are server environment variables; do not prefix the key with `NEXT_PUBLIC_`.
3. In Supabase Auth, enable email/password and allow your app URL and `/auth/confirm` as a redirect. This app uses Supabase Auth email confirmation when enabled.
4. Use Node.js 24, run `npm install` and `npm run dev`. Existing UseAuth users can sign in at `/sign-in`; new users can use `/sign-up` after adding `https://myhabits-dun.vercel.app/auth/confirm` to the shared Supabase Auth redirect URLs.

All `tracker_*` tables, including V2 pauses and relationships, have RLS. Queries and mutations also filter by the authenticated `user_id`. The client never supplies an authoritative user ID. Deleting an area sets its habits' `area_id` to null. Deleting a habit cascades to its activity and relationships.

Optional local sample data is in `supabase/seed.dev.sql`. It requires an existing Supabase Auth user and is never run automatically.

## API and MCP

The REST API is under `/api/v1`: `areas`, `habits`, `logs`, `notes`, `reminders`, `relationships`, `profile`, and `data`. Habit pause and reorder endpoints live under `habits`. Browser requests use a secure Supabase session cookie; external clients send `Authorization: Bearer <Supabase access token>`. Mutations validate input and ownership. Browser mutations require a same origin `Origin` header. Logs use `PUT /api/v1/logs` with `status: null` to undo; a unique `(habit_id, date)` constraint makes repeated check-ins idempotent. Settings exports JSON or table CSV files; JSON imports are validated, previewed, then transactionally copied or skipped without overwriting existing records.

## V2 behavior

- Today groups habits by time of day and supports Boolean check-ins, measurable increments, partial progress, and weekly/monthly targets. The normal completion and streak threshold is the **target**; minimum and stretch are distinct progress tiers.
- Habit planning supports priority, difficulty, quick increments, pause periods, explicit after-habit relationships, templates, and compact creation. A pause date takes precedence over a scheduled opportunity, and paused days do not become missed days.
- Habit detail, History, Insights, and Areas use dated schedule state. Existing V1 schedule versions are backfilled with the habit's **current** name, area, and new planning fields during migration; historical changes to those fields before V2 cannot be reconstructed. Future edits snapshot those fields on the effective local date.
- Weekly reviews and milestones are calculated from activity. They do not create separate persistent records.

## Routines

Routines are reusable templates with nested groups, tasks, and references to existing habits. The implementation lives in `src/lib/routines.ts` (recurrence and progress), `src/lib/routine-data.ts` (materialization and queries), `/routines` (planning/history), `/routine-occurrences` (execution), and `/api/v1/routines` and `/api/v1/routine-occurrences` (mutations). The single schema file adds the definition, pause, occurrence, and item-snapshot tables plus user-scoped transaction functions.

Routine dates use each routine's IANA timezone. A preferred start time is guidance: users can start earlier. The scheduling window closes at the end of the planned local calendar day. An unstarted occurrence becomes `MISSED`; one started with unfinished required steps becomes `PARTIAL`. Optional leaves and groups do not block completion. A monthly rule can skip nonexistent dates or run on the last day of a shorter month. Child overrides filter the parent's dates. The original `scheduled_date` is an immutable occurrence identity; rescheduling changes `planned_date`, and a future reschedule changes the planned offset without moving the recurrence anchor. Step title, instructions, and required status can be edited for this occurrence or for the template plus future unstarted occurrences.

Pages materialize due occurrences lazily. The database's unique `(routine_id, scheduled_date)` key makes retries and concurrent page loads idempotent. Opening a routine's monthly History materializes past scheduled dates in that month, then a transaction function closes overdue occurrences; **no cron job is required**. Each occurrence snapshots applicable items, so editing a template does not change started or completed checklists. Future unstarted default occurrences are regenerated after template edits. Habit steps reuse `tracker_habit_logs` and associate a newly created log with its item occurrence. Undo removes only the log created by that step when it has not been changed or reused elsewhere; a changed habit check-in is preserved. The `reference_provider` and `reference_key` columns leave room for a future external task provider, but Todoist and Jira are not connected.

Because generation is lazy, an old date first opened after a template edit uses the current template. Start and completion history already materialized before the edit retains its saved snapshot. Live verification still requires the shared database migration and an authenticated account.

`POST /api/mcp` supports MCP JSON-RPC `initialize`, `tools/list`, and `tools/call` over HTTP with a Supabase Bearer access token. Tools include `list_habits`, `create_area`, `create_habit`, `update_habit`, and `log_habit`. Clients must obtain a token through Supabase Auth. A hosted OAuth authorization flow and ChatGPT connector registration are not included yet.

## Verification and deployment

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Apply the single schema file to the shared Supabase project **before** deploying the V2 application; the new UI and API expect its columns and tables. The Vercel project `myhabits` is linked and its first production deployment is at `https://myhabits-dun.vercel.app` with deployment protection. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are configured in Vercel; `APP_URL` is set for production. Add `/auth/confirm` to the shared Supabase Auth redirect URLs. No background process is required.

## Current limits

- Reminder times are stored, but no notification delivery is configured.
- V2 JSON/CSV backup currently covers habits but not routine templates or occurrence history. Keep a database backup before schema or deployment changes.
- Insights aggregates paginated logs in the server process. Database-side aggregates would improve latency for accounts with years of activity.
- Weekly and monthly target streaks use the current target for earlier periods when a target has changed. Daily, weekday, and interval history uses schedule snapshots.
- The V2 database migration, authenticated database behavior, RLS, import round-trip, and live MCP flows require verification against the shared Supabase project with an authenticated test account.
- `https://s3-sync.vercel.app` is a separate deployed service. MyHabits does not use it because habits have no file uploads.

# Frontend audit and redesign

- Stack: Next.js 16 App Router, React 19, TypeScript, MUI 9 with Emotion and the v16 App Router cache provider. Unused Tailwind and PostCSS integration was removed.
- Routes: `/`, `/sign-in`, `/sign-up`, `/today`, `/habits`, `/habits/new`, `/habits/[habitId]`, `/habits/[habitId]/edit`, `/history`, `/analytics`, `/areas`, `/settings`. Auth confirmation remains a route handler. App loading, error, and not-found states are included.
- Shell: desktop sidebar with MUI navigation and mobile bottom navigation. Stored appearance and profile preference remain active.
- Forms and dialogs: authentication, habit creation/edit, check-in, notes, reminders, area management, settings, and deletion confirmation. Analytics uses a horizontally scrollable MUI table.
- Data and behavior preserved: Supabase authentication, API calls, timezone scheduling, habit logging, analytics calculations, reminders, notes, areas, ordering, and archive/delete flows.
- Design: centralized light/dark MUI theme and CSS tokens. Content, forms, cards, calendar and navigation adapt across mobile, tablet and desktop.

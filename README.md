# KnightCode V2 — Student Portal

An isolated stack migration of KnightCode's student experience:

- Next.js 16 App Router
- React and TypeScript
- Node.js Vercel runtime
- Supabase PostgreSQL, Auth, Storage and Row Level Security
- Existing Unity WebGL export and browser bridge

The goal is behavioral and visual parity with the current PHP student portal. This is not a redesign. The original CSS, crest, dashboard animation stylesheet, performance bridge and WebGL export are copied public assets. The source PHP website at `C:/xampp/htdocs/knight-code` and Unity project at `C:/Users/Ryzen 3/UnityGem/2DGame` are reference-only and are not imported as writable dependencies.

## Implemented student scope

- Student email, username and Student ID sign-in through Supabase Auth
- Protected dashboard with XP, rank, streak, progress and current quest
- Assigned lessons and sequential/direct challenge access
- Lesson content and view activity
- Teacher assignments
- Lifetime level performance and activity timeline
- Profile, avatar, public profile image storage, theme and password changes
- Notifications
- Embedded Unity WebGL loading and starter-code configuration
- Validated, idempotent session telemetry saved by one PostgreSQL function
- Light/dark visual behavior using the current KnightCode CSS

Teacher and administrator pages are intentionally deferred to later phases. Their tables and relationships already exist where the student portal needs them.

See [SUPABASE-SETUP.md](SUPABASE-SETUP.md) to create the database and test accounts.

## Structure

```text
src/
  app/
    (student)/       protected student pages
    actions/         server-side Auth/profile mutations
    api/             game/activity/preference/notification endpoints
    auth/callback/   Supabase PKCE callback
    login/           student login
  components/        shared student shell and interactive UI
  lib/
    supabase/        browser/server/admin clients and session proxy
    student-data.ts  assignment, sequencing and progress queries
  types/             database and Unity contracts
supabase/
  migrations/        PostgreSQL schema, Auth trigger, RLS and telemetry RPC
  seed.sql           current curriculum and achievements
public/
  assets/             incumbent KnightCode visual assets
  game_build/         unchanged Unity WebGL export
```

## Commands

```powershell
npm run dev
npm run lint
npm run build
```

The application intentionally fails closed when Supabase is not configured. Copy `.env.example` to `.env.local` and follow the setup guide.

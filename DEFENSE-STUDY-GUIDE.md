# KnightCode Source Code Defense Study Guide

This guide teaches the rebuilt **KnightCodeNext** system from the ground up. It assumes you are new to Next.js, React, TypeScript, Supabase, and Vercel. Read the lessons in order. Do not try to memorize every line. Your goal is to understand the path that data follows and know where to look when a panel asks a question.

---

## 1. The one-sentence explanation

KnightCode is a web application where **Next.js displays the pages and runs server code**, **Supabase stores accounts and school data**, and a **Unity WebGL game sends level results back to the website**.

The short data flow is:

```text
Browser -> Next.js page -> Next.js server action/API -> Supabase -> response -> updated page

Unity game -> JavaScript bridge -> /api/progress -> Supabase function -> progress tables
```

There are three account roles:

- **Student:** reads assigned lessons, plays levels, views progress, edits a profile.
- **Teacher:** manages classes, students, assignments, announcements, reports, and password resets.
- **Admin:** manages the whole school workspace, curriculum records, accounts, backups, imports, and settings.

---

# Lesson plan

Use this as a 10-session course. A session can take 45 to 90 minutes.

| Session | Topic                           | What you should be able to explain afterward                                |
| ------- | ------------------------------- | --------------------------------------------------------------------------- |
| 1       | Folder map and generated files  | Which folders are ours, which are generated, and which are deployed         |
| 2       | TypeScript and React basics     | Imports, functions, types, JSX, props, state, and effects                   |
| 3       | Next.js routing                 | How a file becomes a URL and what layouts/actions/API routes do             |
| 4       | Supabase and authentication     | Auth users, profiles, cookies, server clients, roles, and RLS               |
| 5       | Student system                  | Dashboard, assignments, lesson locking, profile, and progress               |
| 6       | Unity connection                | How starter code enters Unity and how progress comes back                   |
| 7       | Teacher system                  | Classes, assignments, imports, reports, and emails                          |
| 8       | Admin system                    | Management, audit history, backups, restore, and settings                   |
| 9       | Database                        | Every main table, its relationships, SQL functions, and security rules      |
| 10      | Deployment and defense practice | Vercel variables, Supabase URLs, common questions, and live code navigation |

Do the small exercises at the end of each lesson. They are designed for defense preparation.

---

# Lesson 1: Understand the whole folder

## The top-level map

```text
KnightCodeNext/
├── .next/                 Generated production/development output
├── node_modules/          Downloaded third-party packages
├── public/                Files sent directly to the browser
├── scripts/               One-time maintenance/setup scripts
├── src/                   The actual Next.js application
│   ├── app/               Pages, layouts, API routes, and server actions
│   ├── components/        Reusable interface and behavior blocks
│   ├── lib/               Shared business logic and Supabase helpers
│   ├── types/             TypeScript descriptions of data
│   └── proxy.ts           Refreshes login sessions
├── supabase/              Database migrations and starting data
├── .env.local             Local secret values; never publish this file
├── .env.example           List of required variable names without real secrets
├── .gitignore             Files Git must not save
├── .vercelignore          Files Vercel must not upload
├── next.config.ts         Next.js and game response-header settings
├── package.json           Project name, commands, and package list
├── package-lock.json      Exact package versions
├── tsconfig.json          TypeScript rules and the @/ path shortcut
└── eslint.config.mjs      Code-quality checking rules
```

## Do not study `node_modules` file by file

`node_modules` contains code written by package authors. For example, the open file `node_modules/path-key/index.js` belongs to the `path-key` package. KnightCode did not write it. npm downloaded it because another package needs it.

You only need to know:

- `npm install` reads `package.json` and `package-lock.json`.
- It downloads packages into `node_modules`.
- Vercel installs these packages during deployment.
- You should not manually edit these files because reinstalling packages overwrites them.

## Do not study `.next` file by file

`.next` is produced by `npm run dev` and `npm run build`. It contains compiled pages, caches, and server bundles. Delete it only when troubleshooting a bad build cache; Next.js recreates it. It is ignored during deployment.

## Folders your team owns

Study these:

1. `src/` — application code.
2. `supabase/` — database definition.
3. `public/assets/` — shared CSS, images, and the Unity bridge.
4. `public/game_build/` — exported Unity WebGL game.
5. Root configuration files.

### Exercise

In VS Code, collapse `node_modules` and `.next`. Open only `src`, `supabase`, and `public`. Practice saying: “The first two large folders are generated. Our main application source is under `src`.”

---

# Lesson 2: Code basics without difficult words

## Imports

```ts
import { createClient } from "@/lib/supabase/server";
```

This means: “Bring the `createClient` function from another file into this file.” `@/` means the `src/` folder because of `tsconfig.json`.

## Exports

```ts
export function formatDuration(seconds: number) { ... }
```

`export` allows another file to import the function.

## Types

```ts
type Role = "student" | "teacher" | "admin";
```

This says `Role` may contain only one of those three words. TypeScript checks mistakes before deployment.

## Interfaces

```ts
interface Profile {
  id: string;
  name: string;
  email: string;
}
```

An interface is a description of the fields an object must contain. It does not create a database table. It helps TypeScript understand database results.

## Functions

```ts
function rankForLevel(level: number) {
  if (level >= 10) return "Legendary Knight";
  return "Novice Knight";
}
```

A function receives input, performs rules, and returns output.

## `async` and `await`

Database and network work takes time:

```ts
const { data } = await supabase.from("profiles").select("*");
```

`await` means “wait for this operation to finish before using its result.” The surrounding function must be `async`.

## React components and JSX

```tsx
export default function Page() {
  return (
    <main>
      <h1>Dashboard</h1>
    </main>
  );
}
```

A React component is a function that returns interface markup. JSX looks like HTML but can insert JavaScript using braces:

```tsx
<strong>{student.name}</strong>
```

## Props

Props are information passed into a component:

```tsx
<UnityPlayer level={level} initial={progress} />
```

The parent gives `UnityPlayer` a level and existing progress.

## State

```tsx
const [status, setStatus] = useState("Loading game…");
```

`status` is the current value. `setStatus` changes it and React updates the screen.

## Effects

`useLayoutEffect` in `unity-player.tsx` starts Unity after the browser page appears. Its cleanup function stops Unity when the student leaves the page.

## Server and client files

- A file with `"use client"` runs interactive code in the browser.
- A file with `"use server"` contains server actions and may safely use private server credentials.
- Files without either line are normally server components in the Next.js App Router.

### Exercise

Open `src/lib/format.ts`. Identify an import, export, function parameter, `if`, and returned value. Explain `formatDuration` in your own words.

---

# Lesson 3: How Next.js turns folders into URLs

Next.js uses the `src/app` folder as a route map.

```text
src/app/login/page.tsx                  -> /login
src/app/(student)/dashboard/page.tsx    -> /dashboard
src/app/(student)/lesson/[id]/page.tsx  -> /lesson/1, /lesson/2, and so on
src/app/api/progress/route.ts            -> /api/progress
```

Important naming rules:

- `page.tsx` creates a page.
- `layout.tsx` wraps several pages with shared interface and checks.
- `loading.tsx` appears while a page is loading.
- `route.ts` receives HTTP requests instead of drawing a page.
- `[id]` is a changing part of the URL.
- `(student)`, `(teacher)`, and `(admin)` group files without adding those parentheses to the URL.

## Root application files

- `src/app/layout.tsx`: loads global CSS, fonts, title metadata, and wraps every route.
- `src/app/page.tsx`: opening `/`; sends the visitor to the appropriate entry page.
- `src/app/globals.css`: small global and loading styles.
- `src/app/teacher.css`: teacher interface styles.
- `src/app/admin.css`: admin interface styles.
- `src/app/favicon.ico`: browser-tab icon.

## Student route files

- `(student)/layout.tsx`: requires a student login, loads shared stats and notifications, then uses `StudentShell`.
- `dashboard/page.tsx`: overview, next level, learning path, activity, streak, achievements.
- `lessons/page.tsx`: assigned lessons and available levels.
- `lesson/[id]/page.tsx`: one lesson, its objective, progress, and challenges.
- `play/[id]/page.tsx`: checks access and passes a level into `UnityPlayer`.
- `assignments/page.tsx`: teacher assignments visible to the signed-in student.
- `progress/page.tsx`: totals, lesson progress, history, and achievements.
- `profile/page.tsx`: loads profile statistics and achievements.
- `profile/profile-form.tsx`: interactive account, photo, avatar, theme, and password form.
- `loading.tsx`: student-page skeleton.

## Teacher route files

- `(teacher)/teacher/layout.tsx`: requires the teacher role and provides the teacher shell.
- `dashboard/page.tsx`: school/class summary.
- `classes/page.tsx`: class list, class creation, and import area.
- `class/[id]/page.tsx`: class details and roster.
- `students/page.tsx`: teacher’s combined student list.
- `student/[id]/page.tsx`: detailed student progress and session performance.
- `assignments/page.tsx`: existing assignments and creation form.
- `assignments/assignment-form.tsx`: interactive target filters and assignment inputs.
- `lessons/page.tsx`: curriculum list.
- `lesson/[id]/page.tsx`: lesson and level details available to the teacher.
- `monitoring/page.tsx`: recent learning activity.
- `reports/page.tsx`: report selection and download.
- `announcements/page.tsx`: announcement management.
- `import/[id]/page.tsx`: previews an uploaded student list before confirmation.
- `profile/page.tsx`: teacher profile, avatar, theme, email, and password.
- `loading.tsx`: teacher skeleton layout.

## Admin route files

- `(admin)/admin/layout.tsx`: requires the admin role and adds `AdminShell`.
- `admin/page.tsx`: system overview.
- `admin/manage/[entity]/page.tsx`: reusable manager for teachers, students, classes, lessons, and levels.
- `admin/classes/[id]/page.tsx`: one class and its roster.
- `admin/results/page.tsx`: school result records.
- `admin/audit/page.tsx`: administrator action history.
- `admin/backup/page.tsx`: encrypted backup download.
- `admin/data/page.tsx`: restore and controlled data clearing.
- `admin/import/page.tsx`: teacher import.
- `admin/settings/page.tsx`: admin profile, school details, access, theme, and password.
- `admin/loading.tsx`: admin loading layout.

## Public login and session routes

- `login/page.tsx` and `login/login-form.tsx`: student login.
- `teacher-login/page.tsx`: teacher login.
- Teacher accounts are created by the administrator; public teacher self-registration is not available.
- `admin-login/page.tsx`: admin login.
- `logout/route.ts`, `teacher-logout/route.ts`, `admin-logout/route.ts`: sign out and redirect.
- `auth/callback/route.ts`: exchanges an authentication callback code for a Supabase session.

### Exercise

Given `/teacher/student/abc`, point to the folder that handles it. Given `src/app/(student)/play/[id]/page.tsx`, say what a URL might look like.

---

# Lesson 4: Supabase, login, roles, and security

Supabase provides three services used here:

1. **Auth:** passwords, login sessions, and user IDs.
2. **PostgreSQL:** tables and SQL functions.
3. **Storage:** uploaded profile pictures.

## Auth user versus profile

`auth.users` is managed by Supabase Auth. It holds the login identity and password information. `public.profiles` holds KnightCode information such as name, role, student ID, avatar, XP, and theme.

Both records use the same UUID. This lets the system connect a login to its KnightCode profile.

## Three Supabase clients

- `src/lib/supabase/client.ts`: browser client using the publishable key.
- `src/lib/supabase/server.ts`: server client that reads and writes login cookies.
- `src/lib/supabase/admin.ts`: private service-role client. It can bypass RLS and must never be sent to the browser.

## Session refresh

`src/proxy.ts` runs `updateSession` from `src/lib/supabase/proxy.ts`. It refreshes Supabase cookies while visitors move between pages. It skips static files such as CSS and the Unity build.

## Role protection

`src/lib/auth.ts` performs these steps:

1. Read the signed-in user claim.
2. Find the active `profiles` row with the same ID.
3. Check its role.
4. Return the profile or redirect to the correct login page.

`requireStudent`, `requireTeacher`, and `requireAdmin` are guards. A guard is a function that stops an unauthorized person from opening a protected page.

## Student login flow

`src/app/actions/auth.ts`:

1. Reads the entered Student ID, username, or email.
2. If it is not an email, safely looks up the matching email.
3. Calls `signInWithPassword`.
4. Checks that the profile is active and has the student role.
5. Redirects to `/dashboard`.

Teacher and admin login API routes do the same role check for their own portals.

## RLS

RLS means **Row Level Security**. It is a database rule that decides which rows a signed-in user may read or change.

Examples:

- A student can read only their own progress.
- A student can see assignments directed to them or their class.
- A student can update only their own notification records.
- Profile-picture rules require uploads to be stored inside that user’s folder.

The service-role key bypasses RLS. That is why it is restricted to server files.

### Exercise

Explain why hiding an admin button in CSS is not enough security. Correct answer: a user could still call the URL; the server role guard and database rules must block them.

---

# Lesson 5: Student data and learning rules

The main student logic is in `src/lib/student-data.ts`.

## Assignment scope

`getAssignmentScope` builds sets of allowed lesson and level IDs. An assignment may target:

- One student.
- A whole class.
- A complete lesson.
- One direct level.

Duplicate class and individual assignments are combined. A direct individual assignment is preferred because it may contain personal instructions or a different due date.

## Sequential unlocking

For a complete lesson assignment, levels are sorted using `order_in_lesson`. The first unfinished level is playable. Later levels stay locked until the earlier level is completed. A directly assigned level is immediately playable.

## Student statistics

`getStudentStats` calculates:

- XP and player level.
- Rank title.
- Completed lessons and challenges.
- Attempts, mistakes, play time, and overall percentage.
- Current streak.

The formula is one player level per 500 XP:

```text
player level = floor(total XP / 500) + 1
```

## Profile form

`src/app/actions/profile.ts` validates the name, email, avatar, theme, photo, and optional password change. The form uses Supabase Storage for pictures and Supabase Auth for email/password updates.

Current item to remember: the interface accepts photos up to 5 MB, while the first migration originally created the storage bucket with a 2 MB limit. Before final production, those values should be made equal.

## Small activity records

`LessonViewBeacon` calls `/api/activity` when a lesson is viewed. The server validates the action and calls the database function `record_student_activity`.

### Exercise

Draw an example with three lesson levels. Mark level 1 complete, level 2 incomplete, and explain why level 3 is locked.

---

# Lesson 6: Unity WebGL and progress saving

This is the most important cross-system flow.

## Static Unity files

`public/game_build/Build/` contains:

- `game_build.loader.js`: starts the Unity loader.
- `game_build.framework.js`: Unity browser runtime.
- `game_build.wasm`: compiled game program.
- `game_build.data`: scenes, art, audio, and other game data.

These files are exported by Unity. Do not manually rewrite them.

## `UnityPlayer`

`src/components/unity-player.tsx` performs this sequence:

1. Places the current level’s starter-code settings on `window.KnightCodeStarterCode`.
2. Loads `performance-bridge.js`.
3. Loads Unity’s loader script.
4. Creates the Unity instance inside the canvas.
5. Sends `LoadLevel` to Unity with the level number.
6. Displays save status and current statistics.

Starter code contains:

```text
enabled       Should starter code appear?
allowEditing  May the student delete/change its protected structure?
template      What code text should be inserted?
```

## JavaScript performance bridge

`public/assets/js/performance-bridge.js` sits between Unity and Next.js.

Unity calls either:

- `recordAttempt(payload)` for an unfinished attempt.
- `completeLevel(payload)` for a completed run.

The bridge:

1. Normalizes old and new telemetry formats.
2. Creates a run ID and sequence number.
3. Queues save requests so their order stays correct.
4. Retries a failed save three times.
5. Keeps a failed item available for the “Retry saving” button.

## API validation

`src/app/api/progress/route.ts` uses Zod to reject impossible or malformed values. It checks IDs, counters, time limits, line counts, mode, run ID, sequence, and scene number.

Then it checks the login and calls the PostgreSQL function `record_level_progress`.

## Database save function

The SQL function:

- Confirms the level is assigned and playable.
- Prevents the same run/sequence from being counted twice.
- Stores one session record.
- Updates lifetime level progress.
- Awards XP only when appropriate.
- Adds activity records.
- Updates streak and achievement data.

## Safe shutdown

When the student clicks another internal link, `UnityPlayer` stops the game, removes scripts, cancels network work, clears global objects, and calls Unity’s `Quit`. This prevents game audio from continuing on another page.

### Exercise

Practice this answer: “Unity does not write directly to the database. It reports to a JavaScript bridge, the bridge calls a protected Next.js API, the API validates the values and login, and a Supabase SQL function performs the final save.”

---

# Lesson 7: Teacher system

## Teacher data context

`src/lib/teacher-data.ts` loads the teacher’s classes, assignments, lessons, levels, notifications, class memberships, students, progress, activity, achievements, and sessions.

It then calculates student status:

- Active
- On Track
- Needs Attention
- Inactive

The status uses last activity, progress, and failed attempts.

## Teacher actions

`src/app/actions/teacher.ts` contains server functions for:

- Creating/updating/archiving classes.
- Adding or removing students.
- Creating and deleting assignments.
- Creating and deleting announcements.
- Resetting student passwords.
- Updating teacher profile, picture, theme, and password.

Before sensitive student operations, the code checks that the teacher owns the class or student relationship.

## Student creation and email

When a teacher creates a student:

1. The server creates a Supabase Auth user with a temporary password.
2. The database trigger creates the profile.
3. The profile receives student fields.
4. The student is connected to the class.
5. `src/lib/mail.ts` sends credentials through SMTP.
6. The temporary password is also shown once in a short-lived secure cookie message.

## Imports

- `import-utils.ts` changes different spreadsheet headings into standard fields.
- `/api/teacher/import` reads CSV/XLSX data and validates it.
- `teacher-import.ts` confirms or cancels a preview batch.
- `public/teacher/sample-students-import.csv` is the downloadable example.

## Reports

`teacher-reports.ts` prepares plain report lines for student progress, class performance, completion, activity, inactive students, and assignments. `/api/teacher/reports` returns the requested report format.

### Exercise

Explain how a teacher can see a student without being allowed to manage every student in the database: the teacher’s context is limited through owned classes and class membership.

---

# Lesson 8: Admin system

## Admin context

`src/lib/admin-data.ts` loads system-wide tables. It is used only after `requireAdmin`. It supports dashboard totals, management lists, results, and settings.

## Admin actions

`src/app/actions/admin.ts` handles account creation/editing, active/archive state, password resets, rosters, and settings. Actions are written to `admin_audit_log` so important changes have a history.

## Import

`admin-import.ts` imports teacher records and rolls back newly created Auth users if a later database step fails.

## Backup

`admin-backup.ts`:

1. Reads the selected school tables.
2. Excludes administrator profiles.
3. Converts data to JSON.
4. Compresses it with gzip.
5. Derives an encryption key from a password using PBKDF2.
6. Encrypts with AES-256-GCM.

The restore code checks the format, version, password, and required table arrays before using the backup.

## Data reset

`admin-data.ts` requires the current admin password and an exact confirmation phrase before clearing records. Curriculum and admin access are preserved for the learning-data reset.

### Exercise

Explain why a backup password is not stored in the database: it is used locally on the server to derive the encryption key, then only the encrypted file is downloaded.

---

# Lesson 9: Database table map

The migrations under `supabase/migrations/` are ordered changes. They allow a new Supabase project to recreate the structure.

## Core tables

| Table                    | Plain meaning                                              |
| ------------------------ | ---------------------------------------------------------- |
| `profiles`               | KnightCode details for every Auth user                     |
| `lessons`                | Teaching topics and learning content                       |
| `levels`                 | Playable challenges connected to lessons                   |
| `classes`                | Teacher-owned class groups                                 |
| `class_students`         | Many-to-many connection between classes and students       |
| `assignments`            | Lesson or level assigned to a class or one student         |
| `student_level_progress` | Lifetime totals for each student and level                 |
| `student_level_sessions` | Detailed record of individual play sessions                |
| `student_telemetry_runs` | Run IDs/sequences used to stop duplicate counting          |
| `student_activity`       | Timeline events such as lesson view, attempt, completion   |
| `achievements`           | Definitions of available badges                            |
| `student_achievements`   | Which badges a student earned and when                     |
| `student_notifications`  | Messages shown to students                                 |
| `announcements`          | Teacher-created class announcements                        |
| `teacher_notifications`  | Messages shown to teachers                                 |
| `teacher_import_batches` | Short-lived student import preview data                    |
| `admin_settings`         | School name, access settings, and other key/value settings |
| `admin_audit_log`        | History of administrator actions                           |

## Relationships

```text
auth.users 1---1 profiles
profiles(teacher) 1---many classes
classes many---many profiles(student) through class_students
lessons 1---many levels
assignments -> teacher + optional class/student + lesson/level
profiles(student) 1---many progress/activity/session/notification rows
levels 1---many progress/session/activity rows
achievements many---many students through student_achievements
```

## Migrations

- `202609270001_student_foundation.sql`: core enums, tables, triggers, RLS, storage, and progress functions.
- `202609270002_student_runtime_fixes.sql`: improved activity/progress behavior.
- `202609280001_teacher_foundation.sql`: teacher fields, announcements, notifications, and import batches.
- `202609300001_admin_foundation.sql`: admin settings, audit log, and forced-password-change field.
- `seed.sql`: inserts the seven lessons, levels, and achievements.

## Useful SQL words

- `create table`: make a table.
- `primary key`: unique identity of a row.
- `foreign key`: link to another table.
- `not null`: value is required.
- `default`: value used when none is supplied.
- `unique`: duplicates are blocked.
- `index`: makes common searches faster.
- `trigger`: automatically runs after/before a database event.
- `function`: reusable logic executed inside PostgreSQL.
- `policy`: RLS permission rule.
- `on conflict`: describes what to do if a matching row already exists.

### Exercise

Pick one student. Trace their ID through `profiles`, `class_students`, `assignments`, `student_level_progress`, and `student_level_sessions`.

---

# Lesson 10: Configuration and deployment

## `package.json`

Important commands:

```text
npm run dev    Development server with live code updates
npm run build  Checks and creates an optimized production build
npm run start  Runs the already-built production version
npm run lint   Checks code-quality rules
```

Important packages:

- `next`, `react`, `react-dom`: web framework and UI.
- `@supabase/supabase-js`, `@supabase/ssr`: database/auth clients and cookie sessions.
- `zod`: checks incoming API data.
- `nodemailer`: sends student credentials.
- `read-excel-file`: reads XLSX imports.
- `sanitize-html`: removes unsafe HTML from managed content.

## Environment variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
KC_MAIL_SMTP_HOST
KC_MAIL_SMTP_PORT
KC_MAIL_SMTP_USERNAME
KC_MAIL_SMTP_PASSWORD
KC_MAIL_FROM_ADDRESS
KC_MAIL_FROM_NAME
```

`NEXT_PUBLIC_` values may be visible to the browser. The service-role key and SMTP password must not use that prefix.

## `next.config.ts`

- Allows server-action request bodies up to 6 MB for imports/photos.
- Adds safe content and cache headers to `/game_build` files.

## Vercel

Vercel installs packages, runs `npm run build`, hosts the static files, and runs Next.js server code when requested. Supabase remains the external database/auth/storage service.

The WebGL build is around 81 MB of public assets. It currently fits the 100 MB Hobby static upload limit but has limited room for growth.

---

# Reusable components and shared files

## Components

- `StudentShell`: student sidebar, top bar, notifications, theme, footer, and navigation.
- `TeacherShell`: teacher navigation and notifications.
- `AdminShell`: admin navigation and theme shell.
- `UnityPlayer`: Unity lifecycle and progress connection.
- `ThemeControls`: light/dark choice and preference save.
- `LessonViewBeacon`: quietly records a lesson view.
- `teacher-ui.tsx`: small shared teacher hero/alert/back components.
- `admin-ui.tsx`: small shared admin hero/card/alert components.
- `AdminImporter`: client interface for teacher import.

## Types

- `types/database.ts`: TypeScript shapes for profiles, lessons, levels, progress, assignments, notifications, and achievements.
- `types/unity.d.ts`: tells TypeScript about Unity functions placed on the browser `window` object.

## Public assets

- `assets/css/style.css`: original shared/student visual system.
- `assets/css/dashboard-quest.css`: student dashboard details and animations.
- `assets/img/knight-logo.png`: brand image.
- `assets/js/performance-bridge.js`: Unity result queue and retry logic.
- `teacher/sample-students-import.csv`: import example.
- `game_build/`: Unity export.

---

# Complete request examples

## Opening the dashboard

```text
Browser requests /dashboard
-> proxy refreshes session cookie
-> student layout calls requireStudent
-> auth.ts verifies role and active profile
-> layout loads stats and notifications
-> dashboard loads progress/activity/achievements
-> server returns rendered HTML
-> browser displays it
```

## Saving a completed game

```text
Unity calls completeLevel
-> performance bridge queues telemetry
-> UnityPlayer POSTs /api/progress
-> Zod validates payload
-> API checks Supabase user
-> record_level_progress SQL function checks access and duplicates
-> progress/session/activity/XP rows update
-> JSON response returns new stats
-> React updates the visible session and lifetime panels
```

## Creating a student

```text
Teacher submits form
-> server action checks teacher and class ownership
-> service-role client creates Supabase Auth user
-> trigger creates profile
-> action fills student fields and class membership
-> SMTP email sends temporary credentials
-> teacher page reloads with success information
```

---

# Common defense questions and simple answers

## “Why did you choose Next.js?”

It provides React pages and Node.js server code in one project. It works well on Vercel and lets private database operations stay on the server.

## “Why Supabase?”

It provides PostgreSQL, authentication, storage, and row-level security in one hosted service. We do not need to build password storage ourselves.

## “How is the game connected?”

The Unity WebGL build runs in a canvas. A JavaScript bridge receives telemetry from Unity and sends it to a protected Next.js API. The API validates it before Supabase saves it.

## “Can students fake progress from the browser?”

The browser is never fully trusted. The API checks login and payload shape, and the SQL function checks whether the level is assigned and unlocked. Run IDs and sequence numbers prevent simple duplicate submissions. No client-side system can make cheating impossible, but the important rules are enforced on the server/database side.

## “How are passwords stored?”

Supabase Auth manages password hashing. KnightCode never stores plain account passwords in its own tables. Temporary passwords are generated server-side and emailed or shown once to an authorized teacher/admin.

## “What is RLS?”

Row Level Security is a database permission layer. It limits which rows each signed-in user may read or change.

## “What happens if the internet fails while saving?”

The bridge queues the result, retries three times, and keeps the failed item for manual retry while the page remains open.

## “What is the difference between session and lifetime performance?”

A session is one play period/run record. Lifetime progress combines all sessions for that student and level, including totals and best results.

## “What is the service-role key?”

It is a private Supabase server key with high permission. It is used only in server code for teacher/admin operations and must never be placed in browser code or committed to Git.

## “How are pages protected?”

Role guards redirect unauthorized users, server actions check ownership, and RLS protects database rows.

## “Does Vercel contain the database?”

No. Vercel hosts Next.js and static files. Supabase hosts PostgreSQL, Auth, and Storage.

---

# Five-minute defense code tour

If the panel asks you to open the source code, use this order:

1. Open `src/app/(student)/dashboard/page.tsx` and explain that a page loads data and returns JSX.
2. Open `src/lib/auth.ts` and show the three role guards.
3. Open `src/lib/student-data.ts` and show assignment scope and sequential unlocking.
4. Open `src/components/unity-player.tsx` and show the Unity URLs and `/api/progress` request.
5. Open `src/app/api/progress/route.ts` and show Zod validation plus the database function call.
6. Open the migration and point to `record_level_progress` and RLS policies.
7. Open `src/app/actions/teacher.ts` and name the teacher operations.
8. Open `src/lib/admin-backup.ts` and explain encrypted backup.

Do not start inside `node_modules`. If the panel opens it, say: “That is an installed third-party dependency. Our application source is under `src`.”

---

# One-minute architecture speech

“KnightCodeNext uses Next.js with React and TypeScript for the interface and server logic. Supabase provides PostgreSQL, authentication, row-level security, and profile-image storage. Students only see content assigned directly or through their classes. The Unity WebGL game loads from the public game build. It reports attempts and completion through a JavaScript bridge to a protected Next.js API. That API validates the payload and calls a Supabase database function that updates session and lifetime progress, XP, activity, streaks, and achievements. Teachers manage their own classes and students, while administrators manage school-wide data, settings, audits, imports, and encrypted backups. Vercel hosts the Next.js application and static Unity files, while Supabase remains the database service.”

---

# Final study checklist

- [ ] I can explain `src`, `public`, `supabase`, `node_modules`, and `.next`.
- [ ] I know how `page.tsx`, `layout.tsx`, `route.ts`, and `[id]` work.
- [ ] I can explain JSX, props, state, `async`, and `await`.
- [ ] I can trace student login.
- [ ] I can explain Auth user versus profile.
- [ ] I know why the service-role key stays on the server.
- [ ] I can explain RLS in one sentence.
- [ ] I can trace Unity progress from game to database.
- [ ] I understand session versus lifetime performance.
- [ ] I can explain assignments and sequential unlocking.
- [ ] I can describe teacher account creation and email.
- [ ] I can describe admin audit and encrypted backup.
- [ ] I know Vercel hosts code while Supabase hosts data.
- [ ] I can perform the five-minute code tour without opening `node_modules`.

Read this guide once from beginning to end. On the second reading, open every named file while reading. On the third pass, answer the defense questions aloud without looking at the answers.

---

# Appendix A: File-by-file quick reference

Use this appendix when someone opens a file and asks what it is for.

## Root files

| File                | Purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `.env.local`        | Real local keys and passwords. Private and ignored.                          |
| `.env.example`      | Safe template showing which variable names are required.                     |
| `.gitignore`        | Stops generated files and secrets from entering Git.                         |
| `.vercelignore`     | Stops selected local/setup files from being uploaded to Vercel.              |
| `AGENTS.md`         | Instructions for coding agents working in this repository. Not runtime code. |
| `CLAUDE.md`         | Small agent-tool instruction file. Not runtime code.                         |
| `README.md`         | Project introduction and commands.                                           |
| `SUPABASE-SETUP.md` | Manual database setup instructions.                                          |
| `eslint.config.mjs` | Rules used by `npm run lint`.                                                |
| `next-env.d.ts`     | Generated TypeScript connection to Next.js types.                            |
| `next.config.ts`    | Next.js build, request-size, and Unity header configuration.                 |
| `package.json`      | Commands and direct package dependencies.                                    |
| `package-lock.json` | Exact dependency tree used for repeatable installation.                      |
| `tsconfig.json`     | TypeScript compiler rules and the `@/` alias.                                |

## API routes

| File                                 | Request handled                                         |
| ------------------------------------ | ------------------------------------------------------- |
| `api/activity/route.ts`              | Records lesson views and session heartbeats.            |
| `api/progress/route.ts`              | Validates Unity telemetry and saves level progress.     |
| `api/preferences/route.ts`           | Saves a student’s light/dark theme.                     |
| `api/notifications/route.ts`         | Marks one or all student notifications as read.         |
| `api/teacher/login/route.ts`         | Teacher ID/email and password login.                    |
| `api/teacher/notifications/route.ts` | Marks teacher notifications as read.                    |
| `api/teacher/import/route.ts`        | Reads and validates a CSV/XLSX upload.                  |
| `api/teacher/reports/route.ts`       | Creates downloadable teacher reports.                   |
| `api/admin/login/route.ts`           | Admin email/password login and audit entry.             |
| `api/admin/backup/route.ts`          | Verifies admin password and downloads encrypted backup. |

## Server-action files

| File                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `actions/auth.ts`           | Student sign-in and sign-out.                             |
| `actions/profile.ts`        | Student profile, picture, theme, email, and password.     |
| `actions/teacher.ts`        | Main teacher class/student/assignment/profile operations. |
| `actions/teacher-import.ts` | Confirms or cancels an import preview.                    |
| `actions/admin.ts`          | Main admin account/entity/settings operations.            |
| `actions/admin-import.ts`   | Teacher batch import.                                     |
| `actions/admin-data.ts`     | Data clearing and encrypted restore.                      |

## Library files

| File                     | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `lib/auth.ts`            | Finds current profile and protects pages by role.                       |
| `lib/student-data.ts`    | Student assignment scope, unlocking, totals, badges, and notifications. |
| `lib/teacher-data.ts`    | Teacher-owned data and calculated student/class statistics.             |
| `lib/admin-data.ts`      | School-wide table loading and simple admin helpers.                     |
| `lib/admin-backup.ts`    | Backup capture, compression, encryption, and decryption.                |
| `lib/teacher-reports.ts` | Turns teacher data into report lines.                                   |
| `lib/import-utils.ts`    | Cleans spreadsheet headings and reports row errors.                     |
| `lib/mail.ts`            | SMTP settings and temporary-password email text.                        |
| `lib/format.ts`          | Duration, date, level-time, and rank formatting.                        |
| `lib/game-build.ts`      | List of Unity level numbers currently available in the build.           |
| `lib/supabase/client.ts` | Supabase browser client.                                                |
| `lib/supabase/server.ts` | Supabase server client using login cookies.                             |
| `lib/supabase/admin.ts`  | Private service-role client.                                            |
| `lib/supabase/proxy.ts`  | Refreshes authentication cookies.                                       |

## Maintenance scripts

| File                                       | Purpose                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `scripts/create-admin.mjs`                 | Creates the first or another admin account from the terminal. |
| `scripts/read-presentation-curriculum.php` | One-time extractor from the old PHP database.                 |
| `scripts/generate-seed.mjs`                | Turns reference curriculum JSON into seed SQL.                |

## CSS files

CSS controls appearance, not database behavior.

- `public/assets/css/style.css`: student/shared colors, spacing, panels, responsive rules, profile, lessons, game wrapper, and authentication UI.
- `public/assets/css/dashboard-quest.css`: dashboard-specific presentation and animations.
- `src/app/teacher.css`: teacher pages and teacher login/register UI.
- `src/app/admin.css`: admin pages and admin login UI.
- `src/app/globals.css`: small Next-specific fixes and skeleton loaders.

## Files that are safe to recognize as generated or external

- Everything inside `node_modules` is installed package code.
- Everything inside `.next` is generated Next.js output.
- Most of `public/game_build` is generated Unity output.
- Do not claim authorship of these generated files during defense.

---

# Appendix B: How to read a database query

Example:

```ts
const { data, error } = await supabase
  .from("student_level_progress")
  .select("*")
  .eq("student_id", studentId);
```

Read it aloud like this: “Ask Supabase for all columns from the student-level-progress table where the student ID equals the current student ID. Put returned rows in `data` and any problem in `error`.”

Common query methods:

- `.select(...)`: read rows.
- `.insert(...)`: add rows.
- `.update(...)`: change rows.
- `.delete()`: remove rows.
- `.eq(column, value)`: exact filter.
- `.in(column, values)`: value must be inside a list.
- `.order(column)`: sort results.
- `.limit(number)`: return only that many rows.
- `.single()`: expect exactly one row.
- `.maybeSingle()`: expect zero or one row.
- `.rpc(name, values)`: call a PostgreSQL function.

Always check `error`. A server action should show a safe message rather than exposing secret database details.

---

# Appendix C: Words you should know

- **API:** a defined way for one program to request work from another.
- **Authentication:** proving who a user is.
- **Authorization:** deciding what that known user may do.
- **Backend:** code that runs on the server.
- **Browser/client:** code running on the user’s device.
- **Component:** reusable React UI function.
- **Cookie:** small browser value used here to maintain login sessions.
- **Database migration:** ordered SQL instructions that change database structure.
- **Dependency:** outside package used by the project.
- **Environment variable:** configuration or secret stored outside source code.
- **Foreign key:** database link to another row/table.
- **Frontend:** what the user sees and interacts with.
- **Idempotent:** repeating the same request does not count it twice.
- **JSON:** text format for structured data.
- **Middleware/proxy:** code that runs around matching requests, here to refresh sessions.
- **PostgreSQL:** the database engine used by Supabase.
- **RLS:** database rules that filter rows by user.
- **Route:** URL handled by a page or API file.
- **Server action:** React/Next.js function executed safely on the server after a form/action.
- **SMTP:** standard used to send email.
- **Telemetry:** measured game data such as attempts, mistakes, time, and lines.
- **UUID:** long unique ID used for accounts.
- **WebGL:** browser technology used to run the Unity game.

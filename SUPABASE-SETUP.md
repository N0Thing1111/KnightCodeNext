# Connect KnightCode V2 to Supabase

These steps affect only the new Supabase project. They do not connect to or modify the PHP/MySQL website, Aiven presentation database, or Unity source.

## 1. Create the database structure

Open **Supabase Dashboard → SQL Editor → New query**. Paste and run, in order:

1. `supabase/migrations/202609270001_student_foundation.sql`
2. `supabase/seed.sql`

The migration creates the student schema, Auth profile trigger, storage bucket, Row Level Security policies, and the atomic/idempotent Unity progress function. The seed contains the seven current lessons, twenty level descriptions, and six achievements.

Do not place the service-role key in SQL or in the browser. RLS intentionally prevents students from directly changing totals, sessions, telemetry cursors, XP, and achievements. The `record_level_progress` database function is the only student-facing write path for trusted game totals.

## 2. Add local environment variables

In **Project Settings → API**, copy the Project URL, publishable key, and service-role key. Copy `.env.example` to `.env.local`, then replace the placeholders:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Only the Project URL and publishable key are allowed in browser code. The service-role key is used by the Next.js server solely to resolve a student ID/username to an Auth email. Store all three in Vercel Environment Variables when deploying. Mark `SUPABASE_SERVICE_ROLE_KEY` sensitive.

## 3. Configure Auth for local testing

In **Authentication → URL Configuration** set:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

Add the future Vercel production URL and its `/auth/callback` URL before deploying.

In **Authentication → Users**, create two test users with passwords you control. Add the shown JSON as user metadata during creation.

Teacher metadata:

```json
{ "role": "teacher", "name": "Demo Teacher" }
```

Student metadata:

```json
{
  "role": "student",
  "name": "Demo Student",
  "student_id": "DEMO-STUDENT",
  "username": "demo-student",
  "class_section": "SHS Demo"
}
```

The trigger creates their `profiles` rows. If the dashboard user form does not expose metadata, create the users first and then update their profile rows in Table Editor: set the first profile role to `teacher`; give the second profile the student values above.

## 4. Give the demo student lessons

Replace the two emails below, then run this in SQL Editor. It assigns every seeded lesson directly to the student, preserving the original sequential level unlocking behavior.

```sql
insert into public.assignments(teacher_id,student_id,lesson_id,title,instructions)
select
  (select id from public.profiles where email='TEACHER_EMAIL' and role='teacher'),
  (select id from public.profiles where email='STUDENT_EMAIL' and role='student'),
  lesson.id,
  'Lesson ' || lesson.order_number || ': ' || lesson.title,
  lesson.description
from public.lessons lesson
where lesson.active
  and not exists (
    select 1 from public.assignments existing
    where existing.student_id=(select id from public.profiles where email='STUDENT_EMAIL' and role='student')
      and existing.lesson_id=lesson.id
      and existing.level_id is null
  );
```

Sign in with the student email, `DEMO-STUDENT`, or `demo-student` plus the password created in Supabase Auth.

## 5. Start and verify locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000/login` and verify:

1. Email, Student ID, and username all sign in.
2. Dashboard totals start at zero and assigned lessons appear.
3. Lesson pages record a `lesson_viewed` activity.
4. Only the first incomplete level of a whole-lesson assignment is playable; a direct level assignment bypasses sequence locking.
5. Theme changes persist after reload.
6. Profile fields, avatar, image and password changes persist.
7. Running a Unity level updates the current session and lifetime totals without double-counting a retried telemetry sequence.
8. The same student cannot query another student's progress using the Supabase client.

## Starter-code settings

The checked-in curriculum reference does not contain the administrator-edited starter-code values, and the isolated Aiven service was unavailable during export. The seed therefore leaves starter code disabled by default. When that service is running, copy each level's `starter_code_enabled`, `starter_code_template`, and `starter_code_locked` values into Supabase before comparing gameplay. Do not copy student records or credentials.

## Vercel

Import this folder as a **new Vercel project**. Keep its root directory at the repository root, add the three environment variables, and deploy. It must not reuse the existing `knightcode` presentation project. The WebGL build is currently in `public/game_build` and is copied unchanged from the PHP website export.

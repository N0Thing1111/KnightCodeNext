# KnightCode Function-by-Function Source Reference

This is the detailed companion to [DEFENSE-STUDY-GUIDE.md](./DEFENSE-STUDY-GUIDE.md). It indexes every named function found in the project-owned TypeScript and TSX source after formatting. Line numbers refer to the formatted files.

## How the structure is located

- `src/app` is the URL structure. A folder is a URL part, `page.tsx` draws a page, `layout.tsx` wraps pages, `loading.tsx` draws a skeleton, and `route.ts` is an API.
- Folders in parentheses organize roles but are not included in the URL. `(admin)/admin/page.tsx` becomes `/admin`.
- Square brackets are changing URL values. `lesson/[id]/page.tsx` handles `/lesson/1`, `/lesson/2`, and so on.
- `src/components` contains reusable interface blocks.
- `src/lib` contains shared rules and data loading.
- `src/types` describes data shapes.
- `public` is served directly by URL.
- `supabase` contains SQL database setup, not browser pages.

## The open `node_modules/path-key/index.js` example

That file is third-party package code, not KnightCode code. Its `pathKey(options = {})` function decides the correct spelling of the operating-system PATH environment variable. macOS/Linux normally use `PATH`. Windows environment keys are case-insensitive and may store it as `Path`, so the function searches existing keys and returns the spelling it finds. `module.exports = pathKey` makes the function available to older CommonJS code. KnightCode does not call this package directly; it is part of the installed dependency tree. Do not edit or memorize it.

## What “calls” means

If a row says a function calls `requireAdmin`, `getAdminContext`, and `rows.map`, that is the path inside the code: first it checks the admin, then loads data, then turns rows into UI. Built-ins such as `map`, `filter`, and `Math.round` are included so you can follow the exact source.

## `src/app/(admin)/admin/audit/page.tsx`

Page component for `/admin/audit`.

| Line | Function | Inputs            | What it does                                        | Main functions/methods it calls                                                                                                                                                                                                         |
| ---: | -------- | ----------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    3 | `Page`   | { searchParams, } | Loads data and renders the page for `/admin/audit`. | `Promise.all`, `getAdminContext`, `Math.max`, `Number`, `ctx.admin_audit_log.slice`, `rows.map`, `ctx.profiles.find`, `new Date(r.created_at).toLocaleString`, `String(r.action).replaceAll`, `String`, `Object.keys`, `JSON.stringify` |

## `src/app/(admin)/admin/backup/page.tsx`

Page component for `/admin/backup`.

| Line | Function | Inputs            | What it does                                         | Main functions/methods it calls                                      |
| ---: | -------- | ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
|    5 | `Page`   | { searchParams, } | Loads data and renders the page for `/admin/backup`. | `Promise.all`, `cookies`, `JSON.parse`, `jar.get`, `credentials.map` |

## `src/app/(admin)/admin/classes/[id]/page.tsx`

Page component for `/admin/classes/[id]`.

| Line | Function | Inputs                    | What it does                                               | Main functions/methods it calls                                                                                                                                                                                                                                   |
| ---: | -------- | ------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    6 | `Page`   | { params, searchParams, } | Loads data and renders the page for `/admin/classes/[id]`. | `Promise.all`, `getAdminContext`, `ctx.classes.find`, `String`, `notFound`, `ctx.class_students .filter((x) => x.class_id === cls.id) .map`, `ctx.class_students .filter`, `ctx.profiles.filter`, `ids.has`, `ctx.profiles.find`, `available.map`, `students.map` |

## `src/app/(admin)/admin/data/page.tsx`

Page component for `/admin/data`.

| Line | Function | Inputs            | What it does                                       | Main functions/methods it calls                                                       |
| ---: | -------- | ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
|    6 | `Page`   | { searchParams, } | Loads data and renders the page for `/admin/data`. | `Promise.all`, `getAdminContext`, `tables.map`, `t.replaceAll`, `ctx.profiles.filter` |

## `src/app/(admin)/admin/import/page.tsx`

Page component for `/admin/import`.

| Line | Function | Inputs            | What it does                                         | Main functions/methods it calls                                      |
| ---: | -------- | ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
|    5 | `Page`   | { searchParams, } | Loads data and renders the page for `/admin/import`. | `Promise.all`, `cookies`, `JSON.parse`, `jar.get`, `credentials.map` |

## `src/app/(admin)/admin/layout.tsx`

Shared layout that wraps pages under `/admin`.

| Line | Function | Inputs        | What it does                                           | Main functions/methods it calls |
| ---: | -------- | ------------- | ------------------------------------------------------ | ------------------------------- |
|    5 | `Layout` | { children, } | Checks the account and wraps child pages for `/admin`. | `requireAdmin`                  |

## `src/app/(admin)/admin/loading.tsx`

Loading skeleton for pages under `/admin`.

| Line | Function  | Inputs | What it does                                  | Main functions/methods it calls |
| ---: | --------- | ------ | --------------------------------------------- | ------------------------------- |
|    1 | `Loading` | none   | Renders the loading placeholder for `/admin`. | `[1, 2, 3, 4].map`              |

## `src/app/(admin)/admin/manage/[entity]/page.tsx`

Page component for `/admin/manage/[entity]`.

| Line | Function    | Inputs                                  | What it does                                                  | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                           |
| ---: | ----------- | --------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   73 | `Page`      | { params, searchParams, }               | Loads data and renders the page for `/admin/manage/[entity]`. | `Promise.all`, `getAdminContext`, `cookies`, `notFound`, `ctx.profiles.filter`, `(q.search \|\| "").toLowerCase`, `all.filter`, `Object.values(r).some`, `Object.values`, `String(v ?? "") .toLowerCase() .includes`, `String(v ?? "") .toLowerCase`, `String`, `all.find`, `JSON.parse`, `jar.get`, `config.label.slice`, `config.label.toLowerCase`, `rows.map`         |
|  198 | `Editor`    | { entity, config, record, ctx, }        | Renders the admin create/edit form for the chosen entity.     | `config.label.slice`, `config.fields.map`                                                                                                                                                                                                                                                                                                                                 |
|  274 | `Field`     | { field, entity, value, ctx, editing, } | Renders the correct admin input control for one entity field. | `field.replaceAll("_", " ").replace`, `field.replaceAll`, `x.toUpperCase`, `["content", "description", "learning_objective"].includes`, `ctx.profiles .filter`, `ctx.lessons.map`, `["Beginner", "Intermediate", "Advanced"].map`, `["order_number", "level_number", "order_in_lesson"].includes`, `["username", "class_section", "school_year", "description"].includes` |
|  385 | `RecordRow` | { entity, row, ctx, }                   | Renders one row in an admin management table.                 | `ctx.profiles.find`, `ctx.lessons.find`, `displayStatus`, `["archived", "hidden"].includes`, `["teachers", "students"].includes`, `["teachers", "students", "classes"].includes`                                                                                                                                                                                          |

## `src/app/(admin)/admin/page.tsx`

Page component for `/admin`.

| Line | Function | Inputs | What it does                                  | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                            |
| ---: | -------- | ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    5 | `Page`   | none   | Loads data and renders the page for `/admin`. | `requireAdmin`, `getAdminContext`, `ctx.profiles.filter`, `ctx.classes.filter`, `ctx.student_level_sessions.slice`, `[...Array(7)].map`, `Array`, `d.setDate`, `d.getDate`, `d.toISOString().slice`, `d.toISOString`, `d.toLocaleDateString`, `ctx.student_level_sessions.filter`, `String(s.started_at).startsWith`, `String`, `Math.max`, `week.map`, `admin.name.split` |

## `src/app/(admin)/admin/results/page.tsx`

Page component for `/admin/results`.

| Line | Function | Inputs            | What it does                                          | Main functions/methods it calls                                                                                                                                                                                                                                                  |
| ---: | -------- | ----------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    3 | `Page`   | { searchParams, } | Loads data and renders the page for `/admin/results`. | `Promise.all`, `getAdminContext`, `ctx.student_level_sessions.filter`, `String`, `ctx.profiles .filter((p) => p.role === "student") .map`, `ctx.profiles .filter`, `ctx.levels.map`, `rows.map`, `ctx.profiles.find`, `ctx.levels.find`, `new Date(s.started_at).toLocaleString` |

## `src/app/(admin)/admin/settings/page.tsx`

Page component for `/admin/settings`.

| Line | Function | Inputs            | What it does                                           | Main functions/methods it calls                                                                                                                                                                            |
| ---: | -------- | ----------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    5 | `Page`   | { searchParams, } | Loads data and renders the page for `/admin/settings`. | `Promise.all`, `requireAdmin`, `getAdminContext`, `setting`, `[ ["teacher", "Teachers"], ["student", "Students"], ].map`, `ctx.profiles.filter`, `[ ["dark", "☾", "Dark"], ["light", "☀", "Light"], ].map` |

## `src/app/(student)/assignments/page.tsx`

Page component for `/assignments`.

| Line | Function          | Inputs     | What it does                                                                                                         | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---: | ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    6 | `AssignmentsPage` | none       | Local helper named `AssignmentsPage`; read the listed calls and the source lines around it to follow its exact rule. | `requireStudent`, `createClient`, `Promise.all`, `getAssignmentScope`, `getStudentLearningData`, `learning.progress.map`, `scope.assignments.map`, `scope.assignments.map((row) => row.class_id).filter`, `supabase.from("profiles").select("id,name").in`, `supabase.from("profiles").select`, `supabase.from`, `supabase.from("classes").select("id,name,section").in`, `supabase.from("classes").select`, `(teachers ?? []).map`, `(classes ?? []).map`, `progress.get`, `learning.levels.filter`, `levels.every` |
|   30 | `statusFor`       | assignment | Classifies a student as Active, On Track, Needs Attention, Recently Active, or Inactive.                             | `progress.get`, `learning.levels.filter`, `levels.every`, `levels.some`                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## `src/app/(student)/dashboard/page.tsx`

Page component for `/dashboard`.

| Line | Function        | Inputs | What it does                                                                                                       | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                               |
| ---: | --------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   13 | `DashboardPage` | none   | Local helper named `DashboardPage`; read the listed calls and the source lines around it to follow its exact rule. | `requireStudent`, `createClient`, `Promise.all`, `getStudentStats`, `getStudentLearningData`, `getAchievements`, `supabase .from("student_activity") .select`, `supabase .from`, `learning.progress.map`, `learning.levels.filter`, `learning.playable.has`, `isGameLevelAvailable`, `playableLevels.find`, `progress.get`, `Boolean`, `playableLevels.every`, `learning.lessons.find`, `lessonLevels.filter` |

## `src/app/(student)/layout.tsx`

Shared layout that wraps pages under `/`.

| Line | Function        | Inputs        | What it does                                                                                                       | Main functions/methods it calls                                        |
| ---: | --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
|    5 | `StudentLayout` | { children, } | Local helper named `StudentLayout`; read the listed calls and the source lines around it to follow its exact rule. | `requireStudent`, `Promise.all`, `getStudentStats`, `getNotifications` |

## `src/app/(student)/lesson/[id]/page.tsx`

Page component for `/lesson/[id]`.

| Line | Function     | Inputs      | What it does                                                                                                    | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                    |
| ---: | ------------ | ----------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    8 | `LessonPage` | { params, } | Local helper named `LessonPage`; read the listed calls and the source lines around it to follow its exact rule. | `Number`, `Number.isInteger`, `notFound`, `requireStudent`, `getStudentLearningData`, `data.lessons.find`, `redirect`, `data.levels.filter`, `data.progress.map`, `levels.filter`, `progress.get`, `Math.round`, `levels.find`, `data.playable.has`, `isGameLevelAvailable`, `levels.map`, `status.toLowerCase().replaceAll`, `status.toLowerCase` |

## `src/app/(student)/lessons/page.tsx`

Page component for `/lessons`.

| Line | Function      | Inputs | What it does                                                                                                     | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                  |
| ---: | ------------- | ------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    7 | `LessonsPage` | none   | Local helper named `LessonsPage`; read the listed calls and the source lines around it to follow its exact rule. | `requireStudent`, `Promise.all`, `getStudentLearningData`, `getViewedLessonIds`, `data.progress.map`, `data.levels.filter`, `isGameLevelAvailable`, `data.lessons.map`, `levels.filter`, `progress.get`, `Math.round`, `levels.some`, `viewed.has`, `String(lesson.order_number).padStart`, `String`, `status.toLowerCase().replaceAll`, `status.toLowerCase`, `data.levels.map` |

## `src/app/(student)/loading.tsx`

Loading skeleton for pages under `/`.

| Line | Function         | Inputs | What it does                                                                                                        | Main functions/methods it calls |
| ---: | ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
|    1 | `StudentLoading` | none   | Local helper named `StudentLoading`; read the listed calls and the source lines around it to follow its exact rule. | none                            |

## `src/app/(student)/play/[id]/page.tsx`

Page component for `/play/[id]`.

| Line | Function   | Inputs      | What it does                                                                                                  | Main functions/methods it calls                                                                                                                                                                              |
| ---: | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|    8 | `PlayPage` | { params, } | Local helper named `PlayPage`; read the listed calls and the source lines around it to follow its exact rule. | `Number`, `Number.isInteger`, `notFound`, `requireStudent`, `getStudentLearningData`, `data.levels.find`, `redirect`, `data.playable.has`, `data.lessons.find`, `data.progress.find`, `isGameLevelAvailable` |

## `src/app/(student)/profile/page.tsx`

Page component for `/profile`.

| Line | Function      | Inputs | What it does                                                                                                     | Main functions/methods it calls                                                                                           |
| ---: | ------------- | ------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
|    7 | `ProfilePage` | none   | Local helper named `ProfilePage`; read the listed calls and the source lines around it to follow its exact rule. | `requireStudent`, `Promise.all`, `getStudentStats`, `getAchievements`, `formatDuration`, `achievements.map`, `formatDate` |

## `src/app/(student)/profile/profile-form.tsx`

Project source file.

| Line | Function      | Inputs              | What it does                                               | Main functions/methods it calls                                                                                                                                                                                                                                                                                            |
| ---: | ------------- | ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   33 | `ProfileForm` | { student, stats, } | Displays and manages the interactive student profile form. | `useActionState`, `useState`, `Boolean`, `setSelectedAvatar`, `setCustom`, `setPreview`, `document.getElementById("profileImageInput")?.click`, `document.getElementById`, `openPicker`, `stats.xp.toLocaleString`, `URL.createObjectURL`, `avatars.map`, `stats.attempts.toLocaleString`, `stats.mistakes.toLocaleString` |
|   50 | `reset`       | none                | Restores profile-form choices to their saved values.       | `setSelectedAvatar`, `setCustom`, `Boolean`, `setPreview`                                                                                                                                                                                                                                                                  |
|   56 | `openPicker`  | none                | Opens the hidden profile-picture file input.               | `document.getElementById("profileImageInput")?.click`, `document.getElementById`                                                                                                                                                                                                                                           |

## `src/app/(student)/progress/page.tsx`

Page component for `/progress`.

| Line | Function       | Inputs | What it does                                                                                                      | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---: | -------------- | ------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   11 | `ProgressPage` | none   | Local helper named `ProgressPage`; read the listed calls and the source lines around it to follow its exact rule. | `requireStudent`, `createClient`, `Promise.all`, `getStudentStats`, `getStudentLearningData`, `getAchievements`, `supabase .from("student_activity") .select`, `supabase .from`, `learning.progress.map`, `learning.levels.map`, `achievements.filter`, `stats.xp.toLocaleString`, `formatDuration`, `stats.attempts.toLocaleString`, `stats.mistakes.toLocaleString`, `learning.lessons.map`, `learning.levels.filter`, `levels.filter` |

## `src/app/(teacher)/teacher/announcements/page.tsx`

Page component for `/teacher/announcements`.

| Line | Function | Inputs            | What it does                                                  | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                        |
| ---: | -------- | ----------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    6 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher/announcements`. | `requireTeacher`, `getTeacherContext`, `createAdminClient() .from("announcements") .select("*") .eq`, `createAdminClient() .from("announcements") .select`, `createAdminClient() .from`, `createAdminClient`, `ctx.classes .filter((c) => c.status === "active") .map`, `ctx.classes .filter`, `list.map`, `ctx.classes.find`, `new Date(a.created_at).toLocaleString` |

## `src/app/(teacher)/teacher/assignments/assignment-form.tsx`

Project source file.

| Line | Function         | Inputs                                                                   | What it does                                                                 | Main functions/methods it calls                                                                                                                                                                                   |
| ---: | ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   16 | `AssignmentForm` | { classes, students, lessons, levels, defaultClassId, defaultLessonId, } | Filters assignment targets and collects the new assignment fields.           | `useState`, `useMemo`, `Number`, `students.filter`, `student.classIds.includes`, `setClassId`, `students .find`, `setStudentId`, `changeClass`, `classes.map`, `visibleStudents.map`, `lessons.map`, `levels.map` |
|   40 | `changeClass`    | value                                                                    | Changes the selected assignment class and clears a student who is not in it. | `setClassId`, `Number`, `students .find`, `setStudentId`                                                                                                                                                          |

## `src/app/(teacher)/teacher/assignments/page.tsx`

Page component for `/teacher/assignments`.

| Line | Function | Inputs            | What it does                                                | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---: | -------- | ----------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   10 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher/assignments`. | `requireTeacher`, `getTeacherContext`, `teacherStudents`, `ctx.classes .filter((c) => c.status === "active") .map`, `ctx.classes .filter`, `students.map`, `ctx.memberships .filter((m) => m.student_id === s.id) .map`, `ctx.memberships .filter`, `ctx.lessons.map`, `ctx.levels.map`, `ctx.assignments.map`, `ctx.classes.find`, `students.find`, `ctx.lessons.find`, `ctx.levels.find`, `assignmentCounts`, `new Date(a.due_date).toLocaleDateString`, `Math.round` |

## `src/app/(teacher)/teacher/class/[id]/page.tsx`

Page component for `/teacher/class/[id]`.

| Line | Function | Inputs                     | What it does                                               | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---: | -------- | -------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   18 | `Page`   | { params, searchParams, }  | Loads data and renders the page for `/teacher/class/[id]`. | `Promise.all`, `requireTeacher`, `cookies`, `getTeacherContext`, `ctx.classes.find`, `String`, `notFound`, `teacherStudents`, `ctx.memberships .filter((m) => m.class_id === cls.id) .map`, `ctx.memberships .filter`, `all.filter`, `ids.has`, `Math.round`, `students.reduce`, `students.filter`, `["Active", "Recently Active", "On Track"].includes`, `ctx.assignments .filter((a) => a.class_id === cls.id) .slice`, `ctx.assignments .filter` |
|  277 | `Metric` | { label, value, warning, } | Renders one small statistic card.                          | none                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|  296 | `Head`   | { eyebrow, title }         | Renders a repeated teacher card heading.                   | none                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## `src/app/(teacher)/teacher/classes/page.tsx`

Page component for `/teacher/classes`.

| Line | Function    | Inputs            | What it does                                            | Main functions/methods it calls                                                                                  |
| ---: | ----------- | ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
|    6 | `Page`      | { searchParams, } | Loads data and renders the page for `/teacher/classes`. | `requireTeacher`, `getTeacherContext`, `ctx.classes.find`, `String`, `ctx.classes.map`, `ctx.memberships.filter` |
|  180 | `ImportBox` | { classId }       | Renders the class student-import form.                  | none                                                                                                             |

## `src/app/(teacher)/teacher/dashboard/page.tsx`

Page component for `/teacher/dashboard`.

| Line | Function | Inputs                           | What it does                                              | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---: | -------- | -------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    9 | `Page`   | none                             | Loads data and renders the page for `/teacher/dashboard`. | `requireTeacher`, `getTeacherContext`, `teacherStats`, `teacherStudents`, `students .filter((s) => s.status === "Needs Attention") .slice`, `students .filter`, `ctx.classes .filter((c) => c.status === "active") .slice(0, 6) .map`, `ctx.classes .filter((c) => c.status === "active") .slice`, `ctx.classes .filter`, `ctx.memberships .filter((m) => m.class_id === c.id) .map`, `ctx.memberships .filter`, `students.filter`, `ids.includes`, `Math.round`, `rows.reduce`, `ctx.activity.slice`, `Array.from`, `d.setHours` |
|  221 | `Metric` | p                                | Renders one small statistic card.                         | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|  239 | `Head`   | { eyebrow, title, href, label, } | Renders a repeated teacher card heading.                  | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## `src/app/(teacher)/teacher/import/[id]/page.tsx`

Page component for `/teacher/import/[id]`.

| Line | Function | Inputs                     | What it does                                                | Main functions/methods it calls                                                                                                                                                                                                |
| ---: | -------- | -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|    7 | `Page`   | { params, searchParams, }  | Loads data and renders the page for `/teacher/import/[id]`. | `Promise.all`, `requireTeacher`, `createAdminClient`, `admin .from("teacher_import_batches") .select`, `admin .from`, `notFound`, `result.created.map`, `rows.map`, `issues`, `preview.filter`, `preview.map`, `r.issues.join` |
|  178 | `Metric` | { label, value, warning, } | Renders one small statistic card.                           | none                                                                                                                                                                                                                           |

## `src/app/(teacher)/teacher/layout.tsx`

Shared layout that wraps pages under `/teacher`.

| Line | Function | Inputs        | What it does                                             | Main functions/methods it calls       |
| ---: | -------- | ------------- | -------------------------------------------------------- | ------------------------------------- |
|    4 | `Layout` | { children, } | Checks the account and wraps child pages for `/teacher`. | `requireTeacher`, `getTeacherContext` |

## `src/app/(teacher)/teacher/lesson/[id]/page.tsx`

Page component for `/teacher/lesson/[id]`.

| Line | Function | Inputs      | What it does                                                | Main functions/methods it calls                                                                                                                                                |
| ---: | -------- | ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|    6 | `Page`   | { params, } | Loads data and renders the page for `/teacher/lesson/[id]`. | `requireTeacher`, `getTeacherContext`, `ctx.lessons.find`, `String`, `notFound`, `teacherStudents`, `ctx.levels.filter`, `levels.map`, `ctx.progress .filter`, `students.some` |

## `src/app/(teacher)/teacher/lessons/page.tsx`

Page component for `/teacher/lessons`.

| Line | Function | Inputs | What it does                                            | Main functions/methods it calls                                                                         |
| ---: | -------- | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
|    5 | `Page`   | none   | Loads data and renders the page for `/teacher/lessons`. | `requireTeacher`, `getTeacherContext`, `ctx.lessons.map`, `ctx.levels.filter`, `ctx.assignments.filter` |

## `src/app/(teacher)/teacher/loading.tsx`

Loading skeleton for pages under `/teacher`.

| Line | Function  | Inputs | What it does                                    | Main functions/methods it calls |
| ---: | --------- | ------ | ----------------------------------------------- | ------------------------------- |
|    1 | `Loading` | none   | Renders the loading placeholder for `/teacher`. | none                            |

## `src/app/(teacher)/teacher/monitoring/page.tsx`

Page component for `/teacher/monitoring`.

| Line | Function | Inputs            | What it does                                               | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---: | -------- | ----------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    5 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher/monitoring`. | `requireTeacher`, `getTeacherContext`, `teacherStudents`, `q.q.toLowerCase`, `rows.filter`, `(s.name + s.student_id).toLowerCase().includes`, `(s.name + s.student_id).toLowerCase`, `ctx.memberships.some`, `String`, `x.toLowerCase().replaceAll`, `x.toLowerCase`, `ctx.classes .filter((c) => c.status === "active") .map`, `ctx.classes .filter`, `rows.map`, `avatar`, `Math.min`, `Math.round`, `new Date(s.last_activity).toLocaleString` |

## `src/app/(teacher)/teacher/profile/page.tsx`

Page component for `/teacher/profile`.

| Line | Function | Inputs            | What it does                                            | Main functions/methods it calls                                                                                                                                                                                                                               |
| ---: | -------- | ----------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   11 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher/profile`. | `requireTeacher`, `getTeacherContext`, `teacherStats`, `(await import("@/lib/supabase/admin")) .createAdminClient() .from`, `(await import("@/lib/supabase/admin")) .createAdminClient`, `import`, `avatar`, `avatars.map`, `key[0].toUpperCase`, `key.slice` |

## `src/app/(teacher)/teacher/reports/page.tsx`

Page component for `/teacher/reports`.

| Line | Function | Inputs            | What it does                                            | Main functions/methods it calls                                                         |
| ---: | -------- | ----------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
|   18 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher/reports`. | `requireTeacher`, `reportTypes.includes`, `reportLines`, `reportTypes.map`, `lines.map` |

## `src/app/(teacher)/teacher/student/[id]/page.tsx`

Page component for `/teacher/student/[id]`.

| Line | Function | Inputs                    | What it does                                                 | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                |
| ---: | -------- | ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   15 | `Page`   | { params, searchParams, } | Loads data and renders the page for `/teacher/student/[id]`. | `Promise.all`, `requireTeacher`, `cookies`, `getTeacherContext`, `teacherStudents(ctx).find`, `teacherStudents`, `notFound`, `ctx.memberships .filter((m) => m.student_id === id) .map`, `ctx.memberships .filter`, `ctx.classes.find`, `assignedLevelIds`, `ctx.levels .filter((l) => scope.has(Number(l.id))) .map`, `ctx.levels .filter`, `scope.has`, `Number`, `ctx.progress.find`, `ctx.assignments .filter`, `cls.some` |
|  354 | `Head`   | { eyebrow, title }        | Renders a repeated teacher card heading.                     | none                                                                                                                                                                                                                                                                                                                                                                                                                           |
|  364 | `Row`    | { a, b }                  | Renders one label/value row.                                 | none                                                                                                                                                                                                                                                                                                                                                                                                                           |

## `src/app/(teacher)/teacher/students/page.tsx`

Page component for `/teacher/students`.

| Line | Function | Inputs            | What it does                                             | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                          |
| ---: | -------- | ----------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    6 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher/students`. | `requireTeacher`, `getTeacherContext`, `teacherStudents`, `q.q.toLowerCase`, `rows.filter`, `(s.name + s.student_id + s.email).toLowerCase().includes`, `(s.name + s.student_id + s.email).toLowerCase`, `ctx.memberships.some`, `String`, `Number`, `rows.sort`, `a.name.localeCompare`, `String(b.last_activity).localeCompare`, `rows.map`, `avatar`, `s.xp.toLocaleString`, `Math.min`, `Math.round` |
|  136 | `Filter` | { q, classes, }   | Renders teacher student-list search and class filters.   | `Array.from`, `classes .filter((c) => c.status === "active") .map`, `classes .filter`                                                                                                                                                                                                                                                                                                                    |

## `src/app/actions/admin-data.ts`

Server actions called by forms or interactive components.

| Line | Function             | Inputs              | What it does                                                               | Main functions/methods it calls                                                                                                                                                                                                                                                                                                              |
| ---: | -------------------- | ------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   11 | `verify`             | admin, password     | Checks the current administrator password before a sensitive action.       | `createClient`, `s.auth.signInWithPassword`, `Error`                                                                                                                                                                                                                                                                                         |
|   16 | `audit`              | id, action, details | Writes an administrator action to the audit log.                           | `createAdminClient() .from("admin_audit_log") .insert`, `createAdminClient() .from`, `createAdminClient`                                                                                                                                                                                                                                     |
|   21 | `go`                 | path, key, msg      | Revalidates a path and redirects with a success/error message.             | `revalidatePath`, `redirect`, `encodeURIComponent`                                                                                                                                                                                                                                                                                           |
|   25 | `clearAdminData`     | f                   | Re-authenticates the admin and clears the selected group of school data.   | `requireAdmin`, `String`, `f.get`, `verify`, `Error`, `createAdminClient`, `db.from(table).delete`, `db.from`, `query.gt`, `query.neq`, `db.from(table).delete().gt`, `db .from("profiles") .select("id") .in`, `db .from("profiles") .select`, `db .from`, `db.auth.admin.deleteUser`, `audit`, `go`                                        |
|   85 | `restoreAdminBackup` | f                   | Re-authenticates the admin and recreates records from an encrypted backup. | `requireAdmin`, `verify`, `String`, `f.get`, `Error`, `decryptBackup`, `Buffer.from`, `upload.arrayBuffer`, `createAdminClient`, `db .from("profiles") .select("id") .in`, `db .from("profiles") .select`, `db .from`, `db.auth.admin.deleteUser`, `[...BACKUP_TABLES].reverse`, `db.from(table).delete`, `db.from`, `query.neq`, `query.gt` |
|  207 | `remap`              | table, old          | Replaces old backup IDs with newly created IDs during restore.             | `userMap.get`, `idMaps.classes.get`, `idMaps.lessons.get`, `idMaps.levels.get`, `idMaps.achievements.get`                                                                                                                                                                                                                                    |

## `src/app/actions/admin-import.ts`

Server actions called by forms or interactive components.

| Line | Function            | Inputs   | What it does                                                | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                   |
| ---: | ------------------- | -------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   10 | `temporaryPassword` | none     | Creates a random temporary password.                        | `crypto.randomUUID().replaceAll("-", "").slice`, `crypto.randomUUID().replaceAll`, `crypto.randomUUID`                                                                                                                                                                                                                                                                                                            |
|   14 | `teacherId`         | none     | Creates a unique teacher ID.                                | `new Date().getFullYear`, `crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase`, `crypto.randomUUID().replaceAll("-", "").slice`, `crypto.randomUUID().replaceAll`, `crypto.randomUUID`                                                                                                                                                                                                              |
|   23 | `fail`              | message  | Redirects to the same workflow with a safe error message.   | `redirect`, `encodeURIComponent`                                                                                                                                                                                                                                                                                                                                                                                  |
|   27 | `importTeachers`    | formData | Validates a batch of teacher rows and creates the accounts. | `requireAdmin`, `JSON.parse`, `String`, `formData.get`, `fail`, `Array.isArray`, `rows.map`, `String(row?.name \|\| "").trim`, `String(row?.email \|\| "") .trim() .toLowerCase`, `String(row?.email \|\| "") .trim`, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test`, `seen.has`, `seen.add`, `createAdminClient`, `db .from("profiles") .select("email") .in`, `db .from("profiles") .select`, `db .from`, `normalized.map` |

## `src/app/actions/admin.ts`

Server actions called by forms or interactive components.

| Line | Function               | Inputs                                     | What it does                                                                                                | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---: | ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   11 | `db`                   | none                                       | Returns the private Supabase admin client.                                                                  | `createAdminClient`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|   12 | `str`                  | f, k                                       | Reads and trims a string from FormData.                                                                     | `String(f.get(k) \|\| "").trim`, `String`, `f.get`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|   13 | `num`                  | f, k                                       | Reads a numeric value from FormData.                                                                        | `Number`, `f.get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|   14 | `url`                  | path, key, msg                             | Builds a redirect URL containing a safe message.                                                            | `path.includes`, `encodeURIComponent`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|   23 | `audit`                | adminId, action, entity, recordId, details | Writes an administrator action to the audit log.                                                            | `db() .from("admin_audit_log") .insert`, `db() .from`, `db`, `String`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|   40 | `finish`               | path, job                                  | Runs a protected server job and handles its redirect result.                                                | `requireAdmin`, `job`, `revalidatePath`, `redirect`, `url`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|   53 | `tempPassword`         | none                                       | Creates a random temporary password.                                                                        | `crypto.randomUUID().replaceAll("-", "").slice`, `crypto.randomUUID().replaceAll`, `crypto.randomUUID`                                                                                                                                                                                                                                                                                                                                                                                                          |
|   56 | `school`               | v                                          | Local helper named `school`; read the listed calls and the source lines around it to follow its exact rule. | `v .toUpperCase() .replace(/[^A-Z0-9]+/g, "-") .replace`, `v .toUpperCase() .replace`, `v .toUpperCase`                                                                                                                                                                                                                                                                                                                                                                                                         |
|   63 | `saveAdminEntity`      | f                                          | Creates or updates a teacher, student, class, lesson, or level.                                             | `str`, `finish`, `["teachers", "students", "classes", "lessons", "levels"].includes`, `Error`, `db`, `str(f, "email").toLowerCase`, `school`, `str(f, "username").toLowerCase`, `email.includes`, `tempPassword`, `a.auth.admin.createUser`, `a .from("profiles") .select("email") .eq("id", userId) .single`, `a .from("profiles") .select("email") .eq`, `a .from("profiles") .select`, `a .from`, `a.auth.admin.updateUserById`, `Object.assign`, `a .from("profiles") .update(patch) .eq("id", userId) .eq` |
|  275 | `setAdminEntityStatus` | f                                          | Archives/restores or hides/shows an admin-managed record.                                                   | `str`, `finish`, `db`, `a .from("classes") .update`, `a .from`, `Number`, `a.from("levels").update({ active: restore }).eq`, `a.from("levels").update`, `a.from`, `["teachers", "students"].includes`, `a .from("profiles") .update({ active: restore }) .eq("id", id) .eq`, `a .from("profiles") .update({ active: restore }) .eq`, `a .from("profiles") .update`, `Error`, `audit`                                                                                                                            |
|  302 | `resetManagedPassword` | f                                          | Creates a temporary account password and sends it when appropriate.                                         | `str`, `finish`, `["teachers", "students"].includes`, `Error`, `db`, `tempPassword`, `a .from("profiles") .select`, `a .from`, `a.auth.admin.updateUserById`, `sendStudentPasswordEmail`, `audit`, `cookies`, `jar.set`, `JSON.stringify`                                                                                                                                                                                                                                                                       |
|  349 | `deleteAdminEntity`    | f                                          | Deletes a class or managed Auth user after role checks.                                                     | `str`, `finish`, `db`, `a.from("classes").delete().eq`, `a.from("classes").delete`, `a.from`, `Number`, `Error`, `["teachers", "students"].includes`, `a .from("profiles") .select("role") .eq("id", id) .single`, `a .from("profiles") .select("role") .eq`, `a .from("profiles") .select`, `a .from`, `a.auth.admin.deleteUser`, `audit`                                                                                                                                                                      |
|  372 | `saveRoster`           | f                                          | Adds or removes a student from an admin-managed class roster.                                               | `num`, `str`, `finish`, `db() .from("class_students") .upsert`, `db() .from`, `db`, `Error`, `db() .from("class_students") .delete() .eq("class_id", classId) .eq`, `db() .from("class_students") .delete() .eq`, `db() .from("class_students") .delete`, `audit`                                                                                                                                                                                                                                               |
|  400 | `saveAdminSettings`    | f                                          | Saves admin profile, school, theme, access, or password settings.                                           | `str`, `finish`, `db`, `str(f, "email").toLowerCase`, `email.includes`, `Error`, `a.auth.admin.updateUserById`, `a .from("profiles") .update({ name, email }) .eq`, `a .from("profiles") .update`, `a .from`, `school`, `a .from("admin_settings") .upsert`, `a .from("profiles") .update({ theme_preference: theme }) .eq`, `createClient`, `s.auth.signInWithPassword`, `f.get`, `s.auth.updateUser`, `a .from("profiles") .update({ must_change_password: false }) .eq`                                      |

## `src/app/actions/auth.ts`

Server actions called by forms or interactive components.

| Line | Function | Inputs       | What it does                                                                                                                      | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---: | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    8 | `login`  | \_, formData | Validates a student identifier and password, starts a Supabase session, checks the student role, then redirects to the dashboard. | `String(formData.get("identifier") ?? "") .trim() .toLowerCase`, `String(formData.get("identifier") ?? "") .trim`, `String`, `formData.get`, `identifier.includes`, `/^[a-z0-9._-]{1,80}$/.test`, `createAdminClient`, `admin .from("profiles") .select("email") .eq("role", "student") .or`, `admin .from("profiles") .select("email") .eq`, `admin .from("profiles") .select`, `admin .from`, `createClient`, `supabase.auth.signInWithPassword`, `supabase.auth.getUser`, `supabase .from("profiles") .select("role,active") .eq`, `supabase .from("profiles") .select`, `supabase .from`, `supabase.auth.signOut` |
|   68 | `logout` | none         | Ends the current Supabase session and returns the user to login.                                                                  | `createClient`, `supabase.auth.signOut`, `redirect`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## `src/app/actions/profile.ts`

Server actions called by forms or interactive components.

| Line | Function        | Inputs   | What it does                                                                                       | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---: | --------------- | -------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   16 | `updateProfile` | \_, form | Validates and saves the student profile, avatar/photo, theme, email, and optional password change. | `requireStudent`, `createClient`, `String(form.get("name") ?? "").trim`, `String`, `form.get`, `String(form.get("email") ?? "") .trim() .toLowerCase`, `String(form.get("email") ?? "") .trim`, `String(form.get("class_section") ?? "").trim`, `/^\S+@\S+\.\S+$/.test`, `allowedAvatars.has`, `["light", "dark"].includes`, `["image/jpeg", "image/png", "image/webp"].includes`, `picture.type.split`, `crypto.randomUUID`, `supabase.storage .from("profile-images") .upload`, `supabase.storage .from`, `supabase.storage.from("profile-images").remove`, `supabase.storage.from` |

## `src/app/actions/teacher-import.ts`

Server actions called by forms or interactive components.

| Line | Function        | Inputs | What it does                                                                                                  | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---: | --------------- | ------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    9 | `password`      | none   | Local helper named `password`; read the listed calls and the source lines around it to follow its exact rule. | `crypto.randomUUID().replaceAll("-", "").slice`, `crypto.randomUUID().replaceAll`, `crypto.randomUUID`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|   12 | `confirmImport` | form   | Creates or connects students from an approved import preview.                                                 | `requireTeacher`, `String`, `form.get`, `createAdminClient`, `admin .from("teacher_import_batches") .select("*") .eq("id", id) .eq`, `admin .from("teacher_import_batches") .select("*") .eq`, `admin .from("teacher_import_batches") .select`, `admin .from`, `new Date().toISOString`, `redirect`, `encodeURIComponent`, `row.student_id.toLowerCase`, `seen.has`, `/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test`, `errors.push`, `seen.add`, `admin .from("profiles") .select("*") .eq("role", "student") .or`, `admin .from("profiles") .select("*") .eq` |
|  160 | `cancelImport`  | form   | Deletes an unused import preview batch.                                                                       | `requireTeacher`, `String`, `form.get`, `createAdminClient() .from("teacher_import_batches") .delete() .eq`, `createAdminClient() .from("teacher_import_batches") .delete`, `createAdminClient() .from`, `createAdminClient`, `redirect`                                                                                                                                                                                                                                                                                                           |

## `src/app/actions/teacher.ts`

Server actions called by forms or interactive components.

| Line | Function                | Inputs             | What it does                                                                                                             | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---: | ----------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   10 | `str`                   | f, k               | Reads and trims a string from FormData.                                                                                  | `String(f.get(k) ?? "").trim`, `String`, `f.get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|   11 | `num`                   | f, k               | Reads a numeric value from FormData.                                                                                     | `Number`, `f.get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|   12 | `admin`                 | none               | Local helper named `admin`; read the listed calls and the source lines around it to follow its exact rule.               | `createAdminClient`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|   13 | `target`                | path, key, message | Local helper named `target`; read the listed calls and the source lines around it to follow its exact rule.              | `path.includes`, `encodeURIComponent`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|   22 | `ownsClass`             | t, id              | Local helper named `ownsClass`; read the listed calls and the source lines around it to follow its exact rule.           | `admin() .from("classes") .select("id") .eq("id", id) .eq`, `admin() .from("classes") .select("id") .eq`, `admin() .from("classes") .select`, `admin() .from`, `admin`                                                                                                                                                                                                                                                                                                                                                   |
|   31 | `ownsStudent`           | t, id              | Local helper named `ownsStudent`; read the listed calls and the source lines around it to follow its exact rule.         | `admin() .from("classes") .select("id") .eq`, `admin() .from("classes") .select`, `admin() .from`, `admin`, `(classes ?? []).map`, `admin() .from("class_students") .select("student_id") .eq`, `admin() .from("class_students") .select`                                                                                                                                                                                                                                                                                |
|   46 | `finish`                | path, job          | Runs a protected server job and handles its redirect result.                                                             | `job`, `revalidatePath`, `redirect`, `target`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|   58 | `saveClass`             | f                  | Creates or updates a teacher-owned class.                                                                                | `requireTeacher`, `num`, `finish`, `str`, `Error`, `admin().from("classes").update(row).eq("id", id).eq`, `admin().from("classes").update(row).eq`, `admin().from("classes").update`, `admin().from`, `admin`, `admin().from("classes").insert`                                                                                                                                                                                                                                                                          |
|   81 | `setClassStatus`        | f                  | Archives or restores a teacher-owned class.                                                                              | `requireTeacher`, `num`, `str`, `finish`, `admin() .from("classes") .update({ status }) .eq("id", id) .eq`, `admin() .from("classes") .update({ status }) .eq`, `admin() .from("classes") .update`, `admin() .from`, `admin`, `Error`                                                                                                                                                                                                                                                                                    |
|   95 | `removeStudent`         | f                  | Removes a student membership from a teacher-owned class.                                                                 | `requireTeacher`, `num`, `str`, `finish`, `ownsClass`, `Error`, `admin() .from("class_students") .delete() .eq`, `admin() .from("class_students") .delete`, `admin() .from`, `admin`                                                                                                                                                                                                                                                                                                                                     |
|  110 | `addExistingStudent`    | f                  | Adds an existing authorized student to a class.                                                                          | `requireTeacher`, `num`, `str`, `finish`, `ownsClass`, `ownsStudent`, `Error`, `admin() .from("class_students") .upsert`, `admin() .from`, `admin`                                                                                                                                                                                                                                                                                                                                                                       |
|  127 | `temporaryPassword`     | none               | Creates a random temporary password.                                                                                     | `crypto.randomUUID().replaceAll("-", "").slice`, `crypto.randomUUID().replaceAll`, `crypto.randomUUID`                                                                                                                                                                                                                                                                                                                                                                                                                   |
|  130 | `normalizeSchoolCode`   | v                  | Local helper named `normalizeSchoolCode`; read the listed calls and the source lines around it to follow its exact rule. | `v .trim() .toUpperCase() .replace(/[^A-Z0-9]+/g, "-") .replace`, `v .trim() .toUpperCase() .replace`, `v .trim() .toUpperCase`, `v .trim`                                                                                                                                                                                                                                                                                                                                                                               |
|  138 | `manualAddStudent`      | f                  | Creates or finds a student, links the class, and sends temporary credentials when newly created.                         | `requireTeacher`, `num`, `finish`, `ownsClass`, `Error`, `str`, `str(f, "email").toLowerCase`, `str(f, "username").toLowerCase`, `z.string().email().safeParse`, `z.string().email`, `z.string`, `admin`, `a .from("profiles") .select("*") .eq("role", "student") .or`, `a .from("profiles") .select("*") .eq`, `a .from("profiles") .select`, `a .from`, `temporaryPassword`, `a.auth.admin.createUser`                                                                                                                |
|  248 | `createAssignment`      | f                  | Validates a target, creates an assignment, and creates student notifications.                                            | `requireTeacher`, `finish`, `num`, `str`, `Error`, `ownsClass`, `ownsStudent`, `admin() .from("class_students") .select("student_id") .eq`, `admin() .from("class_students") .select`, `admin() .from`, `admin`, `admin() .from("levels") .select("lesson_id") .eq("id", levelId) .eq`, `admin() .from("levels") .select("lesson_id") .eq`, `admin() .from("levels") .select`, `admin() .from("assignments") .insert`, `new Date(due).toISOString`, `(data ?? []).map`, `admin() .from("student_notifications") .upsert` |
|  339 | `deleteAssignment`      | f                  | Deletes an assignment owned by the current teacher.                                                                      | `requireTeacher`, `finish`, `num`, `admin() .from("assignments") .delete() .eq("id", id) .eq`, `admin() .from("assignments") .delete() .eq`, `admin() .from("assignments") .delete`, `admin() .from`, `admin`, `Error`                                                                                                                                                                                                                                                                                                   |
|  352 | `saveAnnouncement`      | f                  | Creates an announcement and notifies its target students.                                                                | `requireTeacher`, `finish`, `num`, `str`, `ownsClass`, `Error`, `admin() .from("announcements") .insert`, `admin() .from`, `admin`, `new Date().toISOString`, `admin() .from("classes") .select("id") .eq`, `admin() .from("classes") .select`, `(classes ?? []).map`, `admin() .from("class_students") .select("student_id") .in`, `admin() .from("class_students") .select`, `(members ?? []).map`, `admin() .from("student_notifications") .upsert`, `recipients.map`                                                 |
|  408 | `deleteAnnouncement`    | f                  | Deletes an announcement owned by the current teacher.                                                                    | `requireTeacher`, `finish`, `admin() .from("announcements") .delete() .eq("id", num(f, "id")) .eq`, `admin() .from("announcements") .delete() .eq`, `admin() .from("announcements") .delete`, `admin() .from`, `admin`, `num`, `Error`                                                                                                                                                                                                                                                                                   |
|  420 | `resetStudentPassword`  | f                  | Checks teacher ownership, resets the student password, and sends the new temporary password.                             | `requireTeacher`, `str`, `finish`, `ownsStudent`, `Error`, `admin`, `a .from("profiles") .select`, `a .from`, `temporaryPassword`, `a.auth.admin.updateUserById`, `sendStudentPasswordEmail`, `cookies`, `jar.set`, `JSON.stringify`                                                                                                                                                                                                                                                                                     |
|  466 | `saveTeacherProfile`    | f                  | Updates teacher name, email, and school code.                                                                            | `requireTeacher`, `finish`, `str`, `str(f, "email").toLowerCase`, `normalizeSchoolCode`, `z.string().email().safeParse`, `z.string().email`, `z.string`, `Error`, `admin`, `a.auth.admin.updateUserById`, `a .from("profiles") .update({ name, email, school_code: school }) .eq`, `a .from("profiles") .update`, `a .from`                                                                                                                                                                                              |
|  488 | `saveTeacherAvatar`     | f                  | Chooses a built-in teacher avatar and clears a custom picture.                                                           | `requireTeacher`, `finish`, `str`, `["knight", "blue", "mage", "fox", "dragon", "robot"].includes`, `Error`, `admin() .from("profiles") .update`, `admin() .from`, `admin`                                                                                                                                                                                                                                                                                                                                               |
|  502 | `saveTeacherTheme`      | f                  | Saves the teacher light/dark preference.                                                                                 | `requireTeacher`, `finish`, `str`, `admin() .from("profiles") .update({ theme_preference: theme }) .eq`, `admin() .from("profiles") .update`, `admin() .from`, `admin`, `Error`                                                                                                                                                                                                                                                                                                                                          |
|  514 | `uploadTeacherPhoto`    | f                  | Validates, uploads, and activates a teacher profile image.                                                               | `requireTeacher`, `finish`, `f.get`, `Error`, `["image/jpeg", "image/png", "image/webp"].includes`, `file.type.split`, `crypto.randomUUID`, `admin`, `a.storage .from("profile-images") .upload`, `a.storage .from`, `file.arrayBuffer`, `a .from("profiles") .update({ profile_image: key }) .eq`, `a .from("profiles") .update`, `a .from`, `a.storage.from("profile-images").remove`, `a.storage.from`                                                                                                                |
|  540 | `changeTeacherPassword` | f                  | Checks the old password and sets a new teacher password.                                                                 | `requireTeacher`, `finish`, `str`, `Error`, `createClient`, `s.auth.signInWithPassword`, `s.auth.updateUser`                                                                                                                                                                                                                                                                                                                                                                                                             |

## `src/app/admin-login/page.tsx`

Page component for `/admin-login`.

| Line | Function | Inputs            | What it does                                        | Main functions/methods it calls |
| ---: | -------- | ----------------- | --------------------------------------------------- | ------------------------------- |
|    3 | `Page`   | { searchParams, } | Loads data and renders the page for `/admin-login`. | none                            |

## `src/app/admin-logout/route.ts`

HTTP route handler for `/admin-logout`.

| Line | Function | Inputs | What it does                                  | Main functions/methods it calls                           |
| ---: | -------- | ------ | --------------------------------------------- | --------------------------------------------------------- |
|    3 | `GET`    | r      | Handles GET requests sent to `/admin-logout`. | `createClient`, `s.auth.signOut`, `NextResponse.redirect` |

## `src/app/api/activity/route.ts`

HTTP route handler for `/api/activity`.

| Line | Function | Inputs  | What it does                                   | Main functions/methods it calls                                                                                                          |
| ---: | -------- | ------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
|    9 | `POST`   | request | Handles POST requests sent to `/api/activity`. | `schema.safeParse`, `request.json().catch`, `request.json`, `NextResponse.json`, `createClient`, `supabase.auth.getUser`, `supabase.rpc` |

## `src/app/api/admin/backup/route.ts`

HTTP route handler for `/api/admin/backup`.

| Line | Function | Inputs | What it does                                       | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                      |
| ---: | -------- | ------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    6 | `POST`   | r      | Handles POST requests sent to `/api/admin/backup`. | `getCurrentAdmin`, `NextResponse.redirect`, `r.formData`, `String`, `f.get`, `Error`, `createClient`, `s.auth.signInWithPassword`, `encryptBackup`, `captureBackup`, `createAdminClient() .from("admin_audit_log") .insert`, `createAdminClient() .from`, `createAdminClient`, `new Date().toISOString().replaceAll`, `new Date().toISOString`, `encodeURIComponent` |

## `src/app/api/admin/login/route.ts`

HTTP route handler for `/api/admin/login`.

| Line | Function | Inputs | What it does                                              | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---: | -------- | ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    4 | `fail`   | r, m   | Redirects to the same workflow with a safe error message. | `NextResponse.redirect`, `encodeURIComponent`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|   10 | `POST`   | r      | Handles POST requests sent to `/api/admin/login`.         | `r.formData`, `String(f.get("email") \|\| "") .trim() .toLowerCase`, `String(f.get("email") \|\| "") .trim`, `String`, `f.get`, `fail`, `NextResponse.redirect`, `createServerClient`, `r.cookies.getAll`, `v.forEach`, `response.cookies.set`, `s.auth.signInWithPassword`, `s.auth.getUser`, `createAdminClient() .from("profiles") .select("role,active") .eq`, `createAdminClient() .from("profiles") .select`, `createAdminClient() .from`, `createAdminClient`, `s.auth.signOut` |

## `src/app/api/notifications/route.ts`

HTTP route handler for `/api/notifications`.

| Line | Function | Inputs  | What it does                                        | Main functions/methods it calls                                                                                                                                                                                                                                                                                                 |
| ---: | -------- | ------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    4 | `POST`   | request | Handles POST requests sent to `/api/notifications`. | `z .object`, `z.number().int().positive().nullable`, `z.number().int().positive`, `z.number().int`, `z.number`, `request.json().catch`, `request.json`, `NextResponse.json`, `createClient`, `supabase.auth.getUser`, `supabase .from("student_notifications") .update`, `supabase .from`, `new Date().toISOString`, `query.eq` |

## `src/app/api/preferences/route.ts`

HTTP route handler for `/api/preferences`.

| Line | Function | Inputs  | What it does                                      | Main functions/methods it calls                                                                                                                                                                                                                   |
| ---: | -------- | ------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    4 | `POST`   | request | Handles POST requests sent to `/api/preferences`. | `z .object({ theme: z.enum(["light", "dark"]) }) .safeParse`, `z .object`, `z.enum`, `request.json().catch`, `request.json`, `NextResponse.json`, `createClient`, `supabase.auth.getUser`, `supabase .from("profiles") .update`, `supabase .from` |

## `src/app/api/progress/route.ts`

HTTP route handler for `/api/progress`.

| Line | Function | Inputs  | What it does                                   | Main functions/methods it calls                                                                                                                                     |
| ---: | -------- | ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   28 | `POST`   | request | Handles POST requests sent to `/api/progress`. | `payload.safeParse`, `request.json().catch`, `request.json`, `NextResponse.json`, `createClient`, `supabase.auth.getUser`, `supabase.rpc`, `error.message.includes` |

## `src/app/api/teacher/import/route.ts`

HTTP route handler for `/api/teacher/import`.

| Line | Function   | Inputs  | What it does                                                      | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---: | ---------- | ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    6 | `POST`     | request | Handles POST requests sent to `/api/teacher/import`.              | `requireTeacher`, `request.formData`, `Number`, `form.get`, `createAdminClient`, `admin .from("classes") .select("id") .eq("id", classId) .eq`, `admin .from("classes") .select("id") .eq`, `admin .from("classes") .select`, `admin .from`, `NextResponse.redirect`, `encodeURIComponent`, `file.name.toLowerCase().split(".").pop`, `file.name.toLowerCase().split`, `file.name.toLowerCase`, `["csv", "xlsx"].includes`, `Buffer.from`, `file.arrayBuffer`, `readSheet` |
|  113 | `parseCsv` | text    | Splits CSV text into rows and cells while handling quoted values. | `row.push`, `row.some`, `x.trim`, `rows.push`                                                                                                                                                                                                                                                                                                                                                                                                                              |

## `src/app/api/teacher/login/route.ts`

HTTP route handler for `/api/teacher/login`.

| Line | Function | Inputs           | What it does                                              | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---: | -------- | ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    4 | `fail`   | request, message | Redirects to the same workflow with a safe error message. | `NextResponse.redirect`, `encodeURIComponent`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|   10 | `POST`   | request          | Handles POST requests sent to `/api/teacher/login`.       | `request.formData`, `String(form.get("identifier") ?? "") .trim() .toLowerCase`, `String(form.get("identifier") ?? "") .trim`, `String`, `form.get`, `fail`, `identifier.includes`, `createAdminClient() .from("profiles") .select("email") .eq`, `createAdminClient() .from("profiles") .select`, `createAdminClient() .from`, `createAdminClient`, `NextResponse.redirect`, `createServerClient`, `request.cookies.getAll`, `values.forEach`, `response.cookies.set`, `supabase.auth.signInWithPassword`, `supabase.auth.getUser` |

## `src/app/api/teacher/notifications/route.ts`

HTTP route handler for `/api/teacher/notifications`.

| Line | Function | Inputs | What it does                                                | Main functions/methods it calls                                                                                                                                                                               |
| ---: | -------- | ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    4 | `POST`   | req    | Handles POST requests sent to `/api/teacher/notifications`. | `requireTeacher`, `req.json`, `createAdminClient() .from("teacher_notifications") .update`, `createAdminClient() .from`, `createAdminClient`, `new Date().toISOString`, `q.eq`, `Number`, `NextResponse.json` |

## `src/app/api/teacher/register/route.ts`

HTTP route handler for `/api/teacher/register`.

| Line | Function        | Inputs           | What it does                                                                                                       | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---: | --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    4 | `redirectError` | request, message | Local helper named `redirectError`; read the listed calls and the source lines around it to follow its exact rule. | `NextResponse.redirect`, `encodeURIComponent`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|   13 | `schoolCode`    | value            | Cleans school text into a consistent uppercase code.                                                               | `value .toUpperCase() .replace(/[^A-Z0-9]+/g, "-") .replace`, `value .toUpperCase() .replace`, `value .toUpperCase`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|   20 | `POST`          | request          | Handles POST requests sent to `/api/teacher/register`.                                                             | `request.formData`, `String(form.get("name") \|\| "").trim`, `String`, `form.get`, `String(form.get("email") \|\| "") .trim() .toLowerCase`, `String(form.get("email") \|\| "") .trim`, `schoolCode`, `createAdminClient`, `db .from("admin_settings") .select("setting_value") .eq`, `db .from("admin_settings") .select`, `db .from`, `redirectError`, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test`, `db .from("profiles") .select("id") .eq("email", email) .maybeSingle`, `db .from("profiles") .select("id") .eq`, `db .from("profiles") .select`, `new Date().getFullYear`, `crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase` |

## `src/app/api/teacher/reports/route.ts`

HTTP route handler for `/api/teacher/reports`.

| Line | Function  | Inputs       | What it does                                                                                             | Main functions/methods it calls                                                                                                                                                                                                                                                                            |
| ---: | --------- | ------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    8 | `csvCell` | value        | Escapes one value so it is safe inside a CSV file.                                                       | `value.replaceAll`                                                                                                                                                                                                                                                                                         |
|   11 | `pdf`     | title, lines | Builds a small PDF report without an outside PDF library.                                                | `value .replaceAll("\\", "\\\\") .replaceAll("(", "\\(") .replaceAll`, `value .replaceAll("\\", "\\\\") .replaceAll`, `value .replaceAll`, `esc`, `lines .slice(0, 45) .flatMap`, `lines .slice`, `line.slice`, `offsets.push`, `offsets .slice(1) .map`, `offsets .slice`, `String(n).padStart`, `String` |
|   12 | `esc`     | value        | Local helper named `esc`; read the listed calls and the source lines around it to follow its exact rule. | `value .replaceAll("\\", "\\\\") .replaceAll("(", "\\(") .replaceAll`, `value .replaceAll("\\", "\\\\") .replaceAll`, `value .replaceAll`                                                                                                                                                                  |
|   59 | `GET`     | request      | Handles GET requests sent to `/api/teacher/reports`.                                                     | `requireTeacher`, `url.searchParams.get`, `reportTypes.includes`, `reportLines`, `pdf`, `type.replaceAll`, `new Date().toISOString`, `lines.map`                                                                                                                                                           |

## `src/app/auth/callback/route.ts`

HTTP route handler for `/auth/callback`.

| Line | Function | Inputs  | What it does                                   | Main functions/methods it calls                                                                                       |
| ---: | -------- | ------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
|    3 | `GET`    | request | Handles GET requests sent to `/auth/callback`. | `url.searchParams.get`, `(await createClient()).auth.exchangeCodeForSession`, `createClient`, `NextResponse.redirect` |

## `src/app/layout.tsx`

Shared layout that wraps pages under `/layout.tsx`.

| Line | Function     | Inputs        | What it does                                                                                                    | Main functions/methods it calls |
| ---: | ------------ | ------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------- |
|   10 | `RootLayout` | { children, } | Local helper named `RootLayout`; read the listed calls and the source lines around it to follow its exact rule. | none                            |

## `src/app/login/login-form.tsx`

Project source file.

| Line | Function    | Inputs | What it does                                                                                                   | Main functions/methods it calls |
| ---: | ----------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
|    6 | `LoginForm` | none   | Local helper named `LoginForm`; read the listed calls and the source lines around it to follow its exact rule. | `useActionState`                |

## `src/app/login/page.tsx`

Page component for `/login`.

| Line | Function    | Inputs | What it does                                                                                                   | Main functions/methods it calls |
| ---: | ----------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
|    8 | `LoginPage` | none   | Local helper named `LoginPage`; read the listed calls and the source lines around it to follow its exact rule. | `getCurrentStudent`, `redirect` |

## `src/app/logout/route.ts`

HTTP route handler for `/logout`.

| Line | Function | Inputs  | What it does                            | Main functions/methods it calls                                                |
| ---: | -------- | ------- | --------------------------------------- | ------------------------------------------------------------------------------ |
|    3 | `GET`    | request | Handles GET requests sent to `/logout`. | `(await createClient()).auth.signOut`, `createClient`, `NextResponse.redirect` |

## `src/app/page.tsx`

Page component for `/page.tsx`.

| Line | Function | Inputs | What it does                                                                                              | Main functions/methods it calls |
| ---: | -------- | ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------- |
|    4 | `Home`   | none   | Local helper named `Home`; read the listed calls and the source lines around it to follow its exact rule. | `redirect`, `getCurrentStudent` |

## `src/app/teacher-login/page.tsx`

Page component for `/teacher-login`.

| Line | Function | Inputs            | What it does                                          | Main functions/methods it calls                                                                                                                         |
| ---: | -------- | ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    5 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher-login`. | `getCurrentTeacher`, `redirect`, `Promise.all`, `createAdminClient() .from("admin_settings") .select`, `createAdminClient() .from`, `createAdminClient` |

## `src/app/teacher-logout/route.ts`

HTTP route handler for `/teacher-logout`.

| Line | Function | Inputs | What it does                                    | Main functions/methods it calls                           |
| ---: | -------- | ------ | ----------------------------------------------- | --------------------------------------------------------- |
|    3 | `GET`    | req    | Handles GET requests sent to `/teacher-logout`. | `createClient`, `s.auth.signOut`, `NextResponse.redirect` |

## `src/app/teacher-register/page.tsx`

Page component for `/teacher-register`.

| Line | Function | Inputs            | What it does                                             | Main functions/methods it calls                                                                                                                         |
| ---: | -------- | ----------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    6 | `Page`   | { searchParams, } | Loads data and renders the page for `/teacher-register`. | `getCurrentTeacher`, `redirect`, `Promise.all`, `createAdminClient() .from("admin_settings") .select`, `createAdminClient() .from`, `createAdminClient` |

## `src/components/admin-importer.tsx`

Reusable React component and its local helpers.

| Line | Function        | Inputs | What it does                                                               | Main functions/methods it calls                                                                                                                                                                                                                                                                 |
| ---: | --------------- | ------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    7 | `parseCsv`      | text   | Splits CSV text into rows and cells while handling quoted values.          | `row.push`, `row.some`, `cell.trim`, `rows.push`                                                                                                                                                                                                                                                |
|   34 | `AdminImporter` | none   | Reads a teacher CSV in the browser and prepares validated rows for import. | `useState`, `setRows`, `setError`, `parseCsv`, `(await file.text()).replace`, `file.text`, `parsed.shift()?.map`, `parsed.shift`, `cell.trim().toLowerCase`, `cell.trim`, `parsed.some`, `parsed.map`, `name.trim`, `email.trim().toLowerCase`, `email.trim`, `next.some`, `choose`, `rows.map` |
|   37 | `choose`        | file   | Reads and validates the selected import file.                              | `setRows`, `setError`, `parseCsv`, `(await file.text()).replace`, `file.text`, `parsed.shift()?.map`, `parsed.shift`, `cell.trim().toLowerCase`, `cell.trim`, `parsed.some`, `parsed.map`, `name.trim`, `email.trim().toLowerCase`, `email.trim`, `next.some`                                   |

## `src/components/admin-shell.tsx`

Reusable React component and its local helpers.

| Line | Function     | Inputs               | What it does                                              | Main functions/methods it calls                                                                                                                                           |
| ---: | ------------ | -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   19 | `AdminShell` | { admin, children, } | Draws shared admin navigation and page title behavior.    | `usePathname`, `useState`, `useEffect`, `document.body.classList.add`, `document.body.classList.remove`, `path.startsWith`, `setMenu`, `links.map`, `active`, `pageTitle` |
|   33 | `active`     | href                 | Checks whether a navigation link matches the current URL. | `path.startsWith`                                                                                                                                                         |
|   96 | `pageTitle`  | path                 | Returns the student top-bar title for the current URL.    | `path.includes`                                                                                                                                                           |

## `src/components/admin-ui.tsx`

Reusable React component and its local helpers.

| Line | Function    | Inputs                            | What it does                                                  | Main functions/methods it calls |
| ---: | ----------- | --------------------------------- | ------------------------------------------------------------- | ------------------------------- |
|    2 | `Alerts`    | { q }                             | Renders success or error messages from URL search parameters. | none                            |
|   10 | `AdminHero` | { title, description, children, } | Renders an admin page heading block.                          | none                            |
|   30 | `CardHead`  | { eyebrow, title, href, label, }  | Renders an admin card heading and optional link.              | none                            |

## `src/components/lesson-view-beacon.tsx`

Reusable React component and its local helpers.

| Line | Function           | Inputs       | What it does                                                 | Main functions/methods it calls        |
| ---: | ------------------ | ------------ | ------------------------------------------------------------ | -------------------------------------- |
|    3 | `LessonViewBeacon` | { lessonId } | Sends a small activity request when a lesson page is viewed. | `useEffect`, `fetch`, `JSON.stringify` |

## `src/components/student-shell.tsx`

Reusable React component and its local helpers.

| Line | Function        | Inputs                                       | What it does                                                                                                   | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                          |
| ---: | --------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   17 | `avatarUrl`     | path                                         | Local helper named `avatarUrl`; read the listed calls and the source lines around it to follow its exact rule. | none                                                                                                                                                                                                                                                                                                                                                     |
|   22 | `StudentShell`  | { student, stats, notifications, children, } | Draws the shared student sidebar/top bar/footer and manages sidebar, theme, profile, and notifications.        | `usePathname`, `useState`, `useMemo`, `items.filter`, `avatarUrl`, `useEffect`, `requestAnimationFrame`, `setCollapsed`, `localStorage.getItem`, `document.body.classList.add`, `cancelAnimationFrame`, `document.body.classList.remove`, `document.body.classList.toggle`, `localStorage.setItem`, `fetch`, `JSON.stringify`, `setItems`, `current.map` |
|   68 | `toggleSidebar` | none                                         | Expands or collapses the student sidebar and remembers the choice.                                             | `setCollapsed`, `localStorage.setItem`                                                                                                                                                                                                                                                                                                                   |
|   74 | `markRead`      | id                                           | Marks one or all notifications as read and updates the visible list.                                           | `fetch`, `JSON.stringify`, `setItems`, `current.map`                                                                                                                                                                                                                                                                                                     |
|   96 | `active`        | href                                         | Checks whether a navigation link matches the current URL.                                                      | `pathname.startsWith`                                                                                                                                                                                                                                                                                                                                    |
|  308 | `pageTitle`     | path                                         | Returns the student top-bar title for the current URL.                                                         | `path.startsWith`                                                                                                                                                                                                                                                                                                                                        |

## `src/components/teacher-shell.tsx`

Reusable React component and its local helpers.

| Line | Function       | Inputs                                | What it does                                                                                              | Main functions/methods it calls                                                                                                                                                                                                                                         |
| ---: | -------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    9 | `TeacherShell` | { teacher, notifications, children, } | Draws shared teacher navigation and notification behavior.                                                | `usePathname`, `useState`, `useMemo`, `items.filter`, `useEffect`, `document.body.classList.add`, `document.body.classList.remove`, `pathname.startsWith`, `fetch`, `JSON.stringify`, `setItems`, `v.map`, `setMenu`, `links.map`, `active`, `title`, `setOpen`, `mark` |
|   38 | `active`       | href                                  | Checks whether a navigation link matches the current URL.                                                 | `pathname.startsWith`                                                                                                                                                                                                                                                   |
|   49 | `mark`         | id                                    | Local helper named `mark`; read the listed calls and the source lines around it to follow its exact rule. | `fetch`, `JSON.stringify`, `setItems`, `v.map`                                                                                                                                                                                                                          |
|  202 | `title`        | path                                  | Returns the teacher top-bar title for the current URL.                                                    | `path.includes`                                                                                                                                                                                                                                                         |

## `src/components/teacher-ui.tsx`

Reusable React component and its local helpers.

| Line | Function | Inputs                                     | What it does                                                  | Main functions/methods it calls |
| ---: | -------- | ------------------------------------------ | ------------------------------------------------------------- | ------------------------------- |
|    2 | `Alerts` | { searchParams, }                          | Renders success or error messages from URL search parameters. | none                            |
|   18 | `Hero`   | { eyebrow, title, description, children, } | Renders a teacher page heading block.                         | none                            |
|   40 | `Back`   | { href, label }                            | Renders a back-navigation link.                               | none                            |

## `src/components/theme-controls.tsx`

Reusable React component and its local helpers.

| Line | Function        | Inputs      | What it does                                              | Main functions/methods it calls                                                                  |
| ---: | --------------- | ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
|    5 | `ThemeControls` | { initial } | Displays light/dark choices and saves the selected theme. | `useState`, `setTheme`, `localStorage.setItem`, `setStatus`, `fetch`, `JSON.stringify`, `choose` |
|   11 | `choose`        | next        | Reads and validates the selected import file.             | `setTheme`, `localStorage.setItem`, `setStatus`, `fetch`, `JSON.stringify`                       |

## `src/components/unity-player.tsx`

Reusable React component and its local helpers.

| Line | Function        | Inputs              | What it does                                                                                                         | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                      |
| ---: | --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|    6 | `UnityPlayer`   | { level, initial, } | Starts Unity, supplies starter code, connects telemetry saving, shows statistics, and shuts Unity down when leaving. | `useState`, `useLayoutEffect`, `document.createElement`, `fetch`, `JSON.stringify`, `response.json`, `setLevelStats`, `setSession`, `window.createPerformanceBridge`, `setStatus`, `document.querySelector`, `window.createUnityInstance`, `created.Quit`, `created.SendMessage`, `String`, `document.body.appendChild`, `window.KnightCodeGame?.hasPending`, `event.preventDefault` |
|   44 | `save`          | completed, payload  | Sends one normalized Unity telemetry record to the protected progress API.                                           | `fetch`, `JSON.stringify`, `response.json`, `setLevelStats`, `setSession`                                                                                                                                                                                                                                                                                                            |
|  117 | `beforeUnload`  | event               | Warns when the browser is closing while a progress save is still pending.                                            | `window.KnightCodeGame?.hasPending`, `event.preventDefault`                                                                                                                                                                                                                                                                                                                          |
|  124 | `shutdown`      | none                | Stops Unity, cancels requests, clears globals, and removes scripts.                                                  | `controller.abort`, `window.removeEventListener`, `document.removeEventListener`, `bridge.remove`, `loader?.remove`, `(activeInstance?.Quit?.() ?? Promise.resolve()) .catch`, `activeInstance?.Quit`, `Promise.resolve`, `Array.from`, `scriptsBefore.has`, `script.src.includes`, `script.remove`                                                                                  |
|  152 | `leaveGamePage` | event               | Intercepts internal navigation so Unity can shut down before the page changes.                                       | `event.target.closest`, `target.hasAttribute`, `event.preventDefault`, `event.stopPropagation`, `setStatus`, `Promise.race`, `shutdown`, `window.setTimeout`, `window.location.assign`                                                                                                                                                                                               |

## `src/lib/admin-backup.ts`

Shared business or formatting logic.

| Line | Function        | Inputs         | What it does                                                      | Main functions/methods it calls                                                                                                                                                                                                                                              |
| ---: | --------------- | -------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   34 | `captureBackup` | none           | Reads the backup tables and builds the school backup object.      | `createAdminClient`, `db.from(table).select`, `db.from`, `(data ?? []).filter`, `new Date().toISOString`                                                                                                                                                                     |
|   52 | `encryptBackup` | data, password | Compresses and encrypts a backup with a password-derived AES key. | `Error`, `randomBytes`, `pbkdf2Sync`, `createCipheriv`, `cipher.setAAD`, `Buffer.from`, `Buffer.concat`, `cipher.update`, `gzipSync`, `JSON.stringify`, `cipher.final`, `salt.toString`, `iv.toString`, `cipher.getAuthTag().toString`, `cipher.getAuthTag`, `body.toString` |
|   75 | `decryptBackup` | file, password | Checks, decrypts, decompresses, and validates an uploaded backup. | `JSON.parse`, `file.toString`, `Error`, `Buffer.from`, `pbkdf2Sync`, `createDecipheriv`, `decipher.setAAD`, `decipher.setAuthTag`, `gunzipSync`, `Buffer.concat`, `decipher.update`, `decipher.final`, `Array.isArray`                                                       |

## `src/lib/admin-data.ts`

Shared business or formatting logic.

| Line | Function         | Inputs             | What it does                                                       | Main functions/methods it calls |
| ---: | ---------------- | ------------------ | ------------------------------------------------------------------ | ------------------------------- |
|   44 | `setting`        | ctx, key, fallback | Reads one admin setting and returns a fallback if it is missing.   | `ctx.admin_settings.find`       |
|   54 | `activeProfiles` | ctx, role          | Filters profiles to active students or active teachers.            | `ctx.profiles.filter`           |
|   60 | `displayStatus`  | row, entity        | Turns an entity record into the status text shown by admin tables. | none                            |

## `src/lib/auth.ts`

Shared business or formatting logic.

| Line | Function         | Inputs | What it does                                                      | Main functions/methods it calls |
| ---: | ---------------- | ------ | ----------------------------------------------------------------- | ------------------------------- |
|   35 | `requireStudent` | none   | Returns the active student profile or redirects to student login. | `getCurrentStudent`, `redirect` |
|   40 | `requireTeacher` | none   | Returns the active teacher profile or redirects to teacher login. | `getCurrentTeacher`, `redirect` |
|   45 | `requireAdmin`   | none   | Returns the active admin profile or redirects to admin login.     | `getCurrentAdmin`, `redirect`   |

## `src/lib/format.ts`

Shared business or formatting logic.

| Line | Function          | Inputs  | What it does                                            | Main functions/methods it calls                         |
| ---: | ----------------- | ------- | ------------------------------------------------------- | ------------------------------------------------------- |
|    1 | `formatDuration`  | seconds | Turns seconds into a short hours/minutes display.       | `Math.floor`                                            |
|    8 | `formatLevelTime` | seconds | Turns seconds into a clock-style minute:second display. | `Math.floor`, `String(seconds % 60).padStart`, `String` |
|   13 | `formatDate`      | value   | Turns a stored date into a readable English date.       | none                                                    |
|   22 | `rankForLevel`    | level   | Returns the knight rank name for a player level.        | none                                                    |

## `src/lib/game-build.ts`

Shared business or formatting logic.

| Line | Function               | Inputs      | What it does                                                           | Main functions/methods it calls |
| ---: | ---------------------- | ----------- | ---------------------------------------------------------------------- | ------------------------------- |
|   10 | `isGameLevelAvailable` | levelNumber | Checks whether the exported Unity build contains a given level number. | `availableGameLevels.has`       |

## `src/lib/import-utils.ts`

Shared business or formatting logic.

| Line | Function       | Inputs    | What it does                                                               | Main functions/methods it calls                                                                                                                                                                                                                                                                                                              |
| ---: | -------------- | --------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    8 | `normalizeRow` | raw       | Converts different spreadsheet column names into one standard student row. | `Object.fromEntries`, `Object.entries(raw).map`, `Object.entries`, `k .toLowerCase() .trim() .replaceAll`, `k .toLowerCase() .trim`, `k .toLowerCase`, `String(v ?? "").trim`, `String`, `[first, last].filter(Boolean).join`, `[first, last].filter`, `(normalized.email \|\| "").toLowerCase`, `(normalized.username \|\| "").toLowerCase` |
|   29 | `issues`       | row, seen | Returns validation problems for one import row.                            | `out.push`, `/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test`, `row.student_id.toLowerCase`, `seen.has`, `seen.add`                                                                                                                                                                                                                                        |

## `src/lib/mail.ts`

Shared business or formatting logic.

| Line | Function                    | Inputs | What it does                                                                | Main functions/methods it calls                                                                                                                                                                                                         |
| ---: | --------------------------- | ------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   14 | `mailConfig`                | none   | Reads SMTP environment variables and builds Nodemailer connection settings. | `process.env.KC_MAIL_SMTP_HOST?.trim`, `process.env.KC_MAIL_SMTP_USERNAME?.trim`, `Number`                                                                                                                                              |
|   31 | `loginUrl`                  | none   | Chooses the student login URL used inside account emails.                   | `process.env.NEXT_PUBLIC_APP_URL?.replace`                                                                                                                                                                                              |
|   39 | `isPasswordEmailConfigured` | none   | Reports whether the required SMTP settings exist.                           | `mailConfig`                                                                                                                                                                                                                            |
|   43 | `sendStudentPasswordEmail`  | input  | Builds and sends a welcome or password-reset email to a student.            | `mailConfig`, `input.schoolLabel?.trim`, `process.env.KC_MAIL_FROM_ADDRESS?.trim`, `process.env.KC_MAIL_FROM_NAME?.trim`, `lines.push`, `loginUrl`, `nodemailer.createTransport`, `transporter.sendMail`, `lines.join`, `console.error` |

## `src/lib/student-data.ts`

Shared business or formatting logic.

No named runtime functions were found. This file contains types, declarations, constants, or styles.

## `src/lib/supabase/admin.ts`

Supabase connection/session helper.

| Line | Function            | Inputs | What it does                                                                      | Main functions/methods it calls |
| ---: | ------------------- | ------ | --------------------------------------------------------------------------------- | ------------------------------- |
|    3 | `createAdminClient` | none   | Creates the private Supabase service-role client. It must run only on the server. | `createClient`                  |

## `src/lib/supabase/client.ts`

Supabase connection/session helper.

| Line | Function       | Inputs | What it does                                                                                                                         | Main functions/methods it calls |
| ---: | -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
|    3 | `createClient` | none   | Creates the Supabase client used by this file. Check the file path to know whether it is the browser or cookie-aware server version. | `createBrowserClient`           |

## `src/lib/supabase/proxy.ts`

Supabase connection/session helper.

| Line | Function        | Inputs  | What it does                                                                       | Main functions/methods it calls                                                                                                                                 |
| ---: | --------------- | ------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    4 | `updateSession` | request | Refreshes the Supabase login session and copies refreshed cookies to the response. | `NextResponse.next`, `createServerClient`, `request.cookies.getAll`, `values.forEach`, `request.cookies.set`, `response.cookies.set`, `supabase.auth.getClaims` |

## `src/lib/supabase/server.ts`

Supabase connection/session helper.

| Line | Function       | Inputs | What it does                                                                                                                         | Main functions/methods it calls                                                            |
| ---: | -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
|    4 | `createClient` | none   | Creates the Supabase client used by this file. Check the file path to know whether it is the browser or cookie-aware server version. | `cookies`, `createServerClient`, `cookieStore.getAll`, `values.forEach`, `cookieStore.set` |

## `src/lib/teacher-data.ts`

Shared business or formatting logic.

| Line | Function           | Inputs                 | What it does                                                                             | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                             |
| ---: | ------------------ | ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   24 | `db`               | none                   | Returns the private Supabase admin client.                                               | `createAdminClient`                                                                                                                                                                                                                                                                                                                                                                         |
|   25 | `unique`           | items                  | Removes duplicate values from an array.                                                  | none                                                                                                                                                                                                                                                                                                                                                                                        |
|  120 | `assignedLevelIds` | ctx, studentId         | Calculates the complete set of level IDs assigned to one student under a teacher.        | `ctx.memberships .filter((m) => m.student_id === studentId) .map`, `ctx.memberships .filter`, `classIds.has`, `result.add`, `Number`, `ctx.levels .filter((l) => l.lesson_id === a.lesson_id) .forEach`, `ctx.levels .filter`                                                                                                                                                               |
|  144 | `statusFor`        | last, progress, failed | Classifies a student as Active, On Track, Needs Attention, Recently Active, or Inactive. | `Math.floor`, `Date.now`, `new Date(last).getTime`                                                                                                                                                                                                                                                                                                                                          |
|  153 | `teacherStudents`  | ctx                    | Builds the teacher-facing student rows and calculated statistics.                        | `ctx.students.map`, `ctx.memberships .filter((m) => m.student_id === student.id) .map`, `ctx.memberships .filter`, `ctx.classes.find`, `assignedLevelIds`, `ctx.progress.filter`, `scope.has`, `Number`, `rows.filter`, `rows.reduce`, `ctx.activity.find`, `Math.round`, `classRows.map((c) => c!.name + " · " + c!.section).join`, `classRows.map`, `Math.floor`, `Math.max`, `statusFor` |
|  190 | `assignmentCounts` | ctx, assignment        | Counts how many targeted students completed an assignment.                               | `ctx.memberships .filter`, `unique`, `Number`, `ctx.levels .filter((l) => l.lesson_id === assignment.lesson_id) .map`, `ctx.levels .filter`, `ctx.progress .filter((p) => p.student_id === sid && p.completed) .map`, `ctx.progress .filter`, `required.every`, `completed.has`                                                                                                             |
|  215 | `teacherStats`     | ctx                    | Calculates summary totals for the teacher dashboard.                                     | `teacherStudents`, `rows.filter`, `Date.now`, `new Date(s.last_activity).getTime`, `ctx.classes.filter`, `Math.round`, `rows.reduce`                                                                                                                                                                                                                                                        |
|  239 | `avatar`           | key                    | Returns the emoji for a saved avatar key.                                                | none                                                                                                                                                                                                                                                                                                                                                                                        |
|  253 | `formatTime`       | value                  | Formats seconds as minutes and seconds.                                                  | `Math.floor`                                                                                                                                                                                                                                                                                                                                                                                |

## `src/lib/teacher-reports.ts`

Shared business or formatting logic.

| Line | Function      | Inputs          | What it does                                                | Main functions/methods it calls                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---: | ------------- | --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   16 | `reportLines` | teacherId, type | Builds the selected teacher report as human-readable lines. | `getTeacherContext`, `teacherStudents`, `rows.forEach`, `lines.push`, `ctx.classes.forEach`, `ctx.memberships .filter((m) => m.class_id === c.id) .map`, `ctx.memberships .filter`, `rows.filter`, `ids.includes`, `Math.round`, `students.reduce`, `rows .filter((r) => r.status === "Inactive") .forEach`, `rows .filter`, `ctx.activity.slice(0, 100).forEach`, `ctx.activity.slice`, `rows.find`, `ctx.levels.find`, `new Date(a.created_at).toLocaleString` |

## `src/proxy.ts`

Project source file.

| Line | Function | Inputs  | What it does                                        | Main functions/methods it calls |
| ---: | -------- | ------- | --------------------------------------------------- | ------------------------------- |
|    4 | `proxy`  | request | Runs session refresh for matching Next.js requests. | `updateSession`                 |

## `src/types/database.ts`

TypeScript declarations; these describe data but do not run by themselves.

No named runtime functions were found. This file contains types, declarations, constants, or styles.

## `src/types/unity.d.ts`

TypeScript declarations; these describe data but do not run by themselves.

No named runtime functions were found. This file contains types, declarations, constants, or styles.

## How to use this reference during defense

1. Use VS Code search with the function name.
2. Read its “What it does” entry here.
3. Open the listed line.
4. Follow the first project function in “calls.”
5. Ignore common built-ins such as `map`, `filter`, `String`, and `Math.round` until you understand the main project flow.

This index covers named project functions. Small anonymous callbacks inside `map`, `filter`, event handlers, and Promise chains are explained by the surrounding named function and now appear as readable multi-line code after formatting.

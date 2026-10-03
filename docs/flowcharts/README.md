# KnightCode system flowchart

Open **KnightCode-System-Flowchart.pdf** in Edge or any PDF reader. No local server is needed. The PDF has selectable text and sharp vector shapes. It uses A3 landscape pages; choose A3 landscape for a large printed copy, or Fit to paper for smaller paper.

## Read it in this order

1. Page 1 is the whole-system overview. Start at the top left. Follow login into the correct student, teacher or admin area. Each task box is a list of choices, not a sequence of required steps. All three roles send requests to server code, which checks access before reading or changing records.
2. Page 2 expands the student game path. The left side shows the lesson, game and attempt. The right side shows how the server checks and saves it. The session record and the total progress record are different records.
3. Diamonds ask questions; follow the named branch. Rounded shapes start or finish a path. Boxes are actions. Matching lettered circles continue the same path elsewhere. Dashed arrows show data transfer or background work. On page 1, R returns to the role menu; on page 2, S carries the same game event into the server flow.

The chart groups related features to keep it readable. It is a functional overview based on the current source, not a drawing of every HTTP request or every database column. The shared request steps represent separate checks in the actual actions, pages, APIs and database functions. Opening protected pages also checks the signed-in account. Some administrative operations require extra confirmations that are grouped into request validation here.

Game saving runs in the background. A student may keep playing while a save is pending. A queued event is not the same as a confirmed database save. Page 2 shows the successful save path and the rejection / duplicate paths; it does not imply that browser queues survive closing the page. Progress screens and reports read stored results when loaded; the arrows do not claim that every screen updates live without a new request.

## Edit the chart

**KnightCode-System-Flowchart.drawio** is the editable copy, containing two diagram pages. Open it in diagrams.net or a compatible draw.io editor. It contains separate shapes, text and arrows, not a screenshot. Editing this copy does not automatically regenerate the PDF; export a new PDF from the editor after making changes.

## Main source files behind the chart

Paths below are relative to the KnightCodeNext folder.

| Part of the flow | Source |
| --- | --- |
| Account and role checks | `src/lib/auth.ts`; `src/app/actions/auth.ts`; `src/app/api/teacher/login/route.ts`; `src/app/api/admin/login/route.ts` |
| Student assignments, active lessons and unlock order | `src/lib/student-data.ts` |
| Student pages | `src/app/(student)/` |
| Teacher pages and data reads | `src/app/(teacher)/`; `src/lib/teacher-data.ts` |
| Teacher changes, account emails and imports | `src/app/actions/teacher.ts`; `src/app/actions/teacher-import.ts`; `src/lib/mail.ts` |
| Admin pages and data reads | `src/app/(admin)/`; `src/lib/admin-data.ts` |
| Admin changes, imports, restore and clear operations | `src/app/actions/admin.ts`; `src/app/actions/admin-import.ts`; `src/app/actions/admin-data.ts` |
| Backup generation and encryption | `src/lib/admin-backup.ts` |
| Unity loading and cleanup | `src/components/unity-player.tsx` |
| Browser game-event queue and retries | `public/assets/js/performance-bridge.js` |
| Game-event API | `src/app/api/progress/route.ts` |
| Database tables and initial access rules | `supabase/migrations/202609270001_student_foundation.sql` |
| Current game-session and lifetime progress save function | `supabase/migrations/202609270002_student_runtime_fixes.sql` |
| Teacher tables and access rules | `supabase/migrations/202609280001_teacher_foundation.sql` |
| Admin tables and access rules | `supabase/migrations/202609300001_admin_foundation.sql` |

Prepared from local source on 2 October 2026. Creating these documents did not change application code, database records, the original PHP site or Unity project. The diagrams document behavior in the source; they are not a new end-to-end test report.

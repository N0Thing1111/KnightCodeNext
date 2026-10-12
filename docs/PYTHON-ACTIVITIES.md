# Python activities and teacher Run review

## What this adds

Each of the seven existing lessons gets one Python activity. Students practice the same programming logic in ordinary Python after the game. The teacher can inspect the code they ran, the answers they typed, output, errors, earlier versions, and submitted work.

The seven topics are sequence, `if`, `if/else`, changing values, `for`, `while`, and combining/debugging a program. Small Python explanations, starter code, three example situations, and an optional extension are supplied for each activity.

## Where to open it

- Student: open an assigned lesson, finish its available game levels, then use **Start Python** below the game levels. The workspace is inside the student portal at /lesson/LESSON_ID/python, with the same sidebar, colors, and layout.
- Teacher and administrator: open **Session Results**, then **Python runs**. The existing Game sessions view remains available. Search by student name/ID/email and filter by section and activity.
- Administrator: open **Lessons → Edit** for an existing lesson. Its Python content form appears below the lesson editor.

There is no separate Python assignment form or sidebar section. Assigning a **whole lesson** to a student or their section automatically includes its Python activity. Assigning one individual game level does not assign the whole lesson activity. Old activity URLs redirect to the lesson or Session Results for compatibility.

## How students use it

1. A teacher assigns a whole lesson using the existing Assignments page. This includes its Python activity automatically.
2. The student completes the available, active game levels in that lesson. Coming Soon levels do not block Python. If no games are available yet, Python is accessible immediately. Previously started Python work stays accessible if new games are later released; the whole-lesson completion count still includes those newly available games.
3. The student opens the activity and reads its instructions and short Python explanation.
4. **Save draft** saves unfinished code. **Run Python** saves that exact source code before executing anything. It also updates the draft.
5. Python loads in the browser. When `input()` asks for something, an answer field appears beside the terminal output. The program waits for that answer; students do not have to provide every input ahead of time.
6. Printed output and errors appear in the terminal. After a successful execution, the same source runs against the activity's example situations.
7. **Submit this Run** sends the saved Run for teacher review. Running alone is practice, not a submission or a passing grade. A submission completes the Python part of the lesson assignment; the teacher's review and scores remain separate. Changing the editor requires another Run before submission.
8. Students may revise and submit another Run. Earlier Runs, submissions, original instructions, and reviews remain available.

**Stop** ends execution. Endless loops are stopped after ten seconds of active execution; downloading Python and waiting for answers do not use that budget. Each Run starts a new worker. Reloading/closing during execution can leave the saved source marked **Result pending**. That means the source was recorded but no final result arrived; it does not mean zero mistakes or successful completion.

If saving a finished result fails, the page offers **Retry saving result**. Unsaved edits and pending results also have a recovery copy in sessionStorage, scoped to the student and activity. Reloading the same browser tab can recover that work. A warning appears before closing/reloading with unsaved work or following a page link. Browser Back may not show the link warning, but the tab recovery copy remains. This copy is not a database backup: closing the tab, clearing browser storage, using another device, or blocked storage can lose it. Save draft or retry the result before closing. Draft saving to Supabase remains manual.

## How teachers review improvement

Search by student name, ID, or email; filter by section and activity. The Run table has horizontal scrolling rather than squeezing numbers and headings into tiny columns.

Open **Review Run** to see:

- The original activity instructions and revision used for that Run.
- Previous and current source code side by side.
- Input answers in order, printed output, errors, and active execution time.
- The example checks reported by the browser.
- Whether the Run was submitted, and its feedback history.

For a submitted Run, mark **Reviewed**, **Needs revision**, or **Passed**. Score logic, application, and correctness from 0 to 4 each and write feedback. The student gets an in-app notification pointing to that Run. Scores do not automatically change game XP or game achievements.

Look at whether the student selected the right condition, updated values correctly, used repetition appropriately, and corrected the cause of a mistake. Extra Runs or taking longer do not by themselves mean poor performance. Browser checks are feedback, not tamper-proof examination grades; teacher review supplies the evaluation.

Current section membership controls teacher access. A transferred student's new teacher can see their history; their former teacher loses access. Old assignments from the former teacher do not unlock new work after transfer. Administrators can search history for students who no longer belong to a section.

## Enabling it safely

**On October 11, 2026, the three migrations below were applied to the connected shared Supabase project. Do not run them again there.** Existing account, section, and game-session counts stayed unchanged when the initial migrations were applied. Browser verification adds clearly labeled Python smoke-test records to the signed-in test student; it does not reset game progress. Localhost and the deployed site share this database. Website files remain local until you push/deploy them.

For a different deployment, apply them once in this order after the earlier project migrations:

1. `supabase/migrations/202610110001_python_activities.sql`
2. `supabase/migrations/202610110002_python_backup_restore.sql`
3. `supabase/migrations/202610110003_python_lesson_flow.sql`

The first creates only new Python tables, permission checks, and seven activities matched to existing lesson order numbers 1–7. It does not replace existing lesson text, game results, accounts, or passwords. It requires the earlier project migrations, including the single-section membership migration.

The second updates the atomic restore function so Python data is restored with the rest of the school data. **It does not run a restore or delete current records.** All three scripts are transactions. The third uses existing lesson assignments for activity access, enforces game completion, retires separate Python assignment permissions, and points feedback notifications to the lesson workspace. It preserves historical Python grants and runs. Do not rerun the first script after it has been applied successfully; it creates new tables.

Until the first migration is applied, the new hub displays “Python activities are not enabled yet.” Once the migrations are applied, download a **new** `.knightsave` using this version of the application. Verify its decrypted payload contains all six Python tables (empty history is normal before anyone runs code).

### Backup compatibility change

Backups from Python-enabled databases use payload version **3**, with these six additional tables:

- `python_activities`: current activity content.
- `python_grants`: legacy Python grants retained for backup compatibility; these no longer unlock activities.
- `python_drafts`: each student's current draft.
- `python_runs`: source snapshots and results.
- `python_submissions`: which Runs students submitted.
- `python_reviews`: scores and feedback history.

The outer encrypted file envelope remains version 2; this is separate from the decrypted school-data version.

**After the second migration, old version 1/2 saves are rejected before preparing accounts or changing records.** They do not contain Python history, so accepting them as a full replacement could silently erase that history. Keep old saves for recovery, but do not use them for routine restore after this upgrade. A legacy recovery would need a separately reviewed conversion/recovery procedure; this feature does not silently invent the missing records.

A version 3 restore replaces all backed-up school records, including Python records, as one database transaction. A bad row rolls back the database-record changes. Existing authentication-account preparation and post-success credential emails keep their existing behavior. Supabase Auth operations are outside the SQL transaction; that existing limitation still applies.

The existing **clear progress** action also clears Python drafts, Runs, submissions, and reviews. **Clear school data** additionally clears Python assignments. Activity definitions remain curriculum content. Clearing data remains intentionally destructive; no live clear/restore was performed during implementation.

## Browser/runtime requirements

Python uses Pyodide 0.27.7 from the pinned jsDelivr URL, in a dedicated Web Worker. No Python server, paid interpreter service, Unity script change, or Unity rebuild is required for this feature.

Interactive input uses a shared memory buffer. The activity page has cross-origin isolation headers; open it with the provided full-page activity link. Use current desktop Edge/Chrome over HTTPS or localhost. A browser without this capability displays a message rather than pretending to run. The first runtime download needs internet access and can take time. This is not an offline feature.

The worker has a restrictive Content Security Policy and disables browser storage, extra workers, and network APIs after Pyodide loads. This classroom runner uses the built-in Python library; arbitrary package installation, file uploads, and internet access from student programs are not supported. Python results come from the student's browser and are not server-verified grades. Memory exhaustion can still end a browser worker/tab; the pre-saved Run source remains in the database.

Other site pages and the Unity game do not receive the Python page's isolation headers.

Official runtime references: [Pyodide workers](https://pyodide.org/en/0.27.7/usage/webworker.html), [Pyodide input/output](https://pyodide.org/en/0.27.7/usage/streams.html).

## How the files communicate

```mermaid
flowchart TD
  Teacher[Teacher assigns lesson] --> Assignment[Existing assignment workflow]
  Assignment --> Lesson[Lesson and game levels]
  Lesson -->|All required levels complete| Page[Lesson Python workspace]
  Forms[python-forms.tsx] --> API[/api/python]
  Page --> Editor[python-editor.tsx]
  Editor -->|Save source first| API
  Editor -->|Execute Python / answer input| Worker[public/python/runtime-worker.js]
  Worker -->|Output / errors / practice checks| Editor
  Editor -->|Save result / submit| API
  API -->|Authenticated checked functions| DB[(Supabase Python tables)]
  DB --> Hub[python-hub.tsx]
  Hub --> Review[Teacher sees previous and current code]
  Review --> Forms
  DB --> Backup[admin-backup.ts / admin-restore.ts]
```

| File | Responsibility |
| --- | --- |
| `src/lib/python-contract.ts` | Data types and request validation |
| `src/lib/python-data.ts` | Activity and authorized student/section loading |
| `src/components/python-hub.tsx` | Lists, filters, code comparison, submission and review history |
| `src/components/python-editor.tsx` | Code editor, worker lifecycle, interactive answers, draft/Run/submit requests |
| `src/components/python-forms.tsx` | Administrator content and teacher feedback forms |
| `src/components/python.module.css` | Scoped Python page layout and theme colors |
| `src/app/api/python/route.ts` | Same-origin, authenticated requests to database functions |
| `public/python/runtime-worker.js` | Isolated browser execution and practice cases |
| `supabase/python-content/activities.json` | Readable seed activity content; editing it alone does not update existing database content |
| The three new SQL migrations | Tables, access rules, immutable Run snapshots, and extended restore |
| `next.config.ts` | Python-only headers; optional separate build output via `KC_BUILD_DIR` |

Administrators edit installed activity content under **Lessons → Edit → Lesson Python activity**. Editing content creates a new revision; existing Runs retain their own original snapshot. Newly created lessons beyond the initial seven do not automatically receive an activity: adding further activity definitions requires a later content/migration update. Additional game levels within existing lessons use the existing lesson relationship and completion gate.

## Checklist to test before the defense

Use a test student and the teacher responsible for that student's section. Do not restore or clear live data just to test this feature.

1. Open the student's Lessons page. There should be no separate Python Activities sidebar link.
2. Open a lesson with unfinished available game levels. Its Python card should be locked. Opening the workspace URL directly must also remain locked.
3. Open a lesson whose available game levels are all complete. Its Python card should show Ready to code without another assignment.
4. Choose Start Python. Check that the normal student sidebar, header, colors, and footer remain visible.
5. Read the task, Python help, and example inputs/outputs. Enter a small solution. Tab adds four spaces; Shift+Tab leaves the editor.
6. Save draft, reload, and check that the code remains.
7. Run Python. Enter each answer when requested. Check output and practice checks. Waiting for input should not time out.
8. Run code with a syntax error. It should save the source and the error so the teacher can review it.
9. Run an endless loop and press Stop. The page should remain usable. If left running, the active execution limit should stop it.
10. Fix the code, rerun, and submit. Each Run should remain in the history; changing code should require rerunning before submission.
11. Teacher: open Session Results → Python runs. Search the student ID, choose the section, and open Review Run. Verify the source, input answers, output/error, prior source, and submission status.
12. Teacher: review a test submission with feedback. Student: open the feedback notification and check that it opens the matching lesson/run. Try Run again from that page to verify input still works.
13. Teacher/admin: switch Session Results back to Game sessions. Existing results and Review Runs should still open normally.
14. Admin: edit a lesson's Python activity; reload it to verify the update. Earlier Runs must retain the earlier activity instructions. Use a test content change you can undo.
15. After the code is deployed, repeat a short Run → input → submit → teacher review check on the deployed domain. CDN access and runtime headers must work there too.
16. Download a fresh version-3 school save from the updated app and keep it safely. **Do not perform a destructive restore test on the shared school database.** Restore behavior is covered by isolated tests.

## Verification recorded during implementation

- Isolated database tests: automatic individual/section lesson access, game completion gate, old override rejection, current-teacher isolation, immutable/idempotent runs, submission/review, transfer behavior, revision snapshots, restore rollback/roundtrip, and recreated-ID remapping passed.
- Production build and TypeScript validation passed after the lesson integration.
- Browser: completed Lesson 1 showed Start Python automatically. Interactive inputs 3 and 120 produced total 105 and change 15; all three example checks passed. The source/result saved and submitted successfully.
- Browser: the teacher's Game sessions view still displayed all 39 existing sessions, and Python runs appeared within the same Session Results page.
- No Unity files, original PHP files, passwords, existing game progress, or deployed website code were changed for this feature. SQL migrations are already on the shared database; frontend changes have not been pushed.

Remaining deployment caveat: the live website still uses its old code until you push these changes. Since restore SQL is upgraded, use fresh backups from the updated app; the old deployed restore code may reject the new readiness version until deployment catches up.

## UI check (October 11, 2026)

The Python workspace now uses a solid Run button, plain secondary buttons, an outlined Submit button, and a quiet Reset action. Code and output panels use the current account theme. Tables have readable headings, separate date/time lines, clear status badges, and horizontal scrolling on smaller screens. Student history stays within its lesson and no longer shows an unnecessary activity filter.

Additional checks: switch between Light and Dark in Profile, open a lesson's Python workspace, and check the editor, output, disabled buttons, input prompt, run table, and teacher review. The three integration smoke-test runs are identifiable by their source comments; do not confuse them with student assessment evidence.

## Priority update (October 12, 2026)

The availability/atomic-operation migration is now installed on the shared Supabase database. Account-role hardening is prepared but must be installed after the new website code is deployed. See [PRIORITY-FIXES.md](PRIORITY-FIXES.md) for exact rollout order, checks, resolved audit items, and the final testing checklist. The earlier verification section describes the October 11 integration.

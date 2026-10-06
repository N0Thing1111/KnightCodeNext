# Reviewing a student's coding process

## What is new

A **session** is a visit to a level recorded by the existing progress system.
A **Run** is one submitted program. An **attempt** in the existing statistics
means a start/restart, not a press of the Run button. These remain separate.

Each Run saves the submitted code, its sequence number, code mode, reset count,
starting and ending knight position, execution duration, and final result.
The code is captured before the editor clears it. A Run that finishes without
reaching the goal is not automatically a failure: the student may be building
a solution in parts. For example, `move(right)` and then `move(up)` remain two
separate entries in the same session.

The teacher decides what the student's work shows. There is no quiz, automatic
pass/fail grade, or grade based simply on speed or using fewer Runs.

## Where to look

1. Sign in as a teacher.
2. Open Monitoring and select a student.
3. Find **Level Sessions** and choose **Review Runs**.
4. Open a Run to read its code, result, position, reset count, and warning.
5. Expand **Compare with Run ...** to see both submissions side by side.
6. Use **Compare sessions for this level** to open another recent visit.
   The student's Level Sessions list has pages for older visits.

Administrators can also open **Session Results > Review Runs**.

The Run list loads 50 entries at a time. On later pages, the first Run can still
be compared with the preceding Run from the previous page. Code panels scroll
and expand on demand, rather than filling the main monitoring dashboard.

## What the results mean

- **Finished normally:** the submitted instructions finished; reaching the goal
  is not required for this result.
- **Reached the goal:** the knight reached the exit during this Run.
- **Finished with a warning:** execution produced a game warning or stopped
  because of a runtime condition; read the warning and code together.
- **Could not execute:** the submission was rejected, such as invalid syntax,
  an incomplete guided slot, or insufficient code fuel.
- **Interrupted:** the game reported an interruption, such as restarting from
  the pause menu during execution.
- **Final result not received:** the start was saved but no final result arrived.
  Closing the browser, leaving during a Run, or a connection failure can cause
  this. It must not be treated as proof that the student failed.

Positions use the Unity world's coordinates, not row/column puzzle labels.
Execution duration is time spent running the submission; session play time also
includes thinking time. Existing play time excludes paused game time, and the
updated tracker skips time while the application is unfocused. It is not an
attention detector. Repeated code can be valid when it starts at a new position.

## Saving and storage

`TerminalManager.cs` captures each submission and its outcome.
`LevelPerformanceTracker.cs` creates its numbered event.
`KnightCodeBridge.jslib` passes it to the browser.
`public/assets/js/performance-bridge.js` queues progress and Run events together.
`src/components/unity-player.tsx` sends them to `/api/executions`.
The route validates them and calls Supabase's `record_code_execution` function.
The function saves them in `student_code_executions`, linked to the existing
`student_level_sessions` record.

Start and finish events update one Run record; retries do not create duplicates.
The receiver does not award XP or change completion rules. Only authenticated
students with an assigned level and an existing permitted session can submit.
Teacher and admin pages check access before using the server database client.
Students cannot directly change or delete saved history rows.

Only submitted programs are stored, not every keypress or every loop iteration.
A saved submission is limited to 32,768 characters and its warning to 500.
Truncated submissions are clearly marked. The history does not automatically
expire. Backups include the new table and fetch records in batches, including
records after the first 1,000. Old backups open with an empty Run history.
Deleting a session, level, or student cascades to its linked Run records;
the existing admin clear/restore paths also include the table.

Normal in-site navigation waits for queued saves. Failed saves remain in the
current page for Retry saving. This is not offline storage: forced closure,
refresh, crashes, or loss of the connection can still lose unsent events.

## Test before committing

1. Use the updated local website and WebGL build. Refresh a game page that was
   already open before the build changed.
2. Play an already available level in two or more Runs. Confirm each submitted
   program remains visible in the teacher's session review.
3. Try invalid syntax in free/hint mode and an incomplete slot in guided mode.
   Confirm the rejected source and useful warning are recorded.
4. Reset the level and submit another program. Check the Run number continues
   and the reset count increases.
5. Complete the level. Check completion, existing XP/achievement behavior, and
   the Run marked Reached the goal.
6. Leave for the dashboard and return. Check the new visit is distinguishable
   from the previous session and the old code remains available.
7. View a session played before this update. It should explain that no submitted
   code was saved, while retaining its original summary statistics.

Use a separate browser profile/InPrivate session for the teacher account so
signing in as a teacher does not replace the student account's browser session.
The automated tests are documented in `supabase/tests/README.md`.

## Unity rebuilds and future levels

The shared scripts apply to future scenes that use the same TerminalManager,
LevelPerformanceTracker, LevelExit, and pause/restart components. Add each new
scene to Unity's build settings and add/assign its matching website level.
A new scene with a custom input system must call the shared tracking methods.

`Assets/Editor/KnightCodeWebGLBuild.cs` adds **KnightCode > Build WebGL for website**
in Unity. By default it writes `Builds/game_build`; an automated build may set
`KNIGHTCODE_WEBGL_OUTPUT`. It uses enabled scenes and produces the uncompressed
filenames used by the website. Copy the finished build into
`KnightCodeNext/public/game_build` and update the game URL version in
`src/components/unity-player.tsx` so browsers fetch the new assets.

Unity source changes live in the Unity project. They are not automatically
included in a Git commit made inside the separate KnightCodeNext repository.
The original PHP project is not part of this change.

## Verification completed on October 6, 2026

- The Supabase migration was applied, and the updated Unity WebGL build was
  copied into the local website.
- Automated database, permissions, retry ordering, and backup checks passed.
  TypeScript, lint checks on changed TypeScript files, and an isolated Next.js
  production build passed.
- A real game session saved three distinct Runs: one movement command, an
  invalid command with its syntax warning, and a five-line program that reached
  the goal. Supabase retained each original source and its correct result.
- The signed-in teacher review displayed all three Runs, the rejected-command
  warning, the full winning program, and the side-by-side code comparison.
  The same-level session selector displayed links to earlier visits.
- Returning from the completed game to the student dashboard succeeded after
  saving. The earlier test session's Run was also still present after reopening
  the browser. Old sessions were checked for their explanatory empty state.

Live backup restoration and data deletion were not exercised against school
records. Reset/interruption and retry edge cases have automated coverage;
include the manual game checks above in your own acceptance testing. The changes
have not been committed, pushed, or deployed by this update.

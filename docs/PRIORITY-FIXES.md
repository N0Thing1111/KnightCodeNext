# Audit fixes and test guide — updated October 13, 2026

## What changed

- Coming Soon levels no longer block lesson Python activities. Only active levels included in the current game build are prerequisites. If none are available, an assigned lesson's published Python activity can be opened immediately.
- Whole-lesson assignments include Python automatically. Completion means: finish the available games and click **Submit this Run** for Python. Merely clicking Run does not count as submitting. Teacher feedback, scores, and passing status are separate.
- The teacher assignment form explains this rule. The challenge dropdown follows the selected lesson and disables Coming Soon challenges. Assigning an individual game challenge does not assign Python.
- Student lesson progress, assignment status, teacher assignment counts, and whole-lesson completion reports use the same calculation. A hidden/missing assigned item shows Unavailable instead of crashing the assignments page.
- **Admin → Levels → Edit → Included in the current game build** is the availability control. Enable it only after the scene is included in the exported and deployed Unity build. It does not create or publish a Unity scene. Historical available level numbers were seeded as 1–7 and 13. Future levels start unavailable.
- Previously started Python work remains accessible when additional games are released. Newly available games still count toward whole-lesson completion, so an earlier completed lesson may become incomplete until those games are finished.
- Python warns about unsaved work when following page links or closing/reloading. A tab-local recovery copy keeps edits and pending results across reloads. This is best-effort browser recovery, not permanent storage; use Save draft/Retry saving result before closing the tab. Browser Back can bypass the link confirmation but keeps the recovery copy in that tab.
- New-app backup capture reads all 22 saved tables while holding database locks, preventing a save assembled from mismatched moments. Lock failures return an error rather than an incomplete backup.
- New-app clear operations use a single database transaction, including account deletion for school clears. Failure rolls back the transaction. Learning clears reset XP, streaks, and last-activity date as well as history. No actual clear or restore was performed on the shared database during these checks.
- Account creation now writes the intended role to server-controlled app metadata. A prepared trigger change will ignore roles supplied by public signup requests. See rollout below before applying it.

Game-only summary widgets (XP, attempts, levels, play time) remain game statistics. Python submissions do not grant game XP. Monitoring and reporting received the additional fixes listed below. Monitoring labels are prompts for teacher review, not automatic grades.

## Database and deployment status

1. **Already applied to the shared Supabase project:** `supabase/migrations/202610120001_priority_workflows.sql`. This creates the availability column and updates gate/backup/clear functions. Do not rerun it; its column addition is not repeatable.
2. **Not committed or pushed:** the local website changes. Review and test them, then commit/push when satisfied. Wait for the Vercel production deployment to succeed.
3. **After that deployment only**, apply `supabase/migrations/202610120002_trusted_account_roles.sql` in Supabase. It is tested locally but is deliberately **not installed yet**. The old live account-creation code does not provide trusted app metadata; applying this first could create new intended staff accounts with a student role. Existing accounts and passwords are unaffected.
4. Also already installed in shared Supabase: `202610120003_python_history_and_revision.sql`, `202610120004_import_password_retention.sql`, and `202610120005_backup_transfers.sql`. They add revision checks, preserve private historical feedback, remove cached import passwords, and configure a private 32 MB temporary-transfer bucket. The revision-function migration is not repeatable; do not rerun already-applied files. There were no retained import-password batches when migration 004 was installed.
5. Once step 3 is applied, use the updated deployed app and updated admin-creation script for new accounts. Do not run older copies of account-creation code.

Public Supabase signup was enabled. On October 13, it was disabled and verified after reloading Authentication → Sign In / Providers. School-managed creation/import/restore uses the server admin API; existing sign-in stays enabled. This closes direct public signup immediately. Keep it disabled. Migration 002 is still required after deployment so role assignment also ignores untrusted signup metadata.

The shared database update affects localhost and live database behavior immediately. Frontend/form and new backup/clear endpoint behavior reaches Vercel only after deployment. In particular, the old live clear code is still the old implementation until the push is deployed.

## Verification

- TypeScript check and optimized Next.js production build passed.
- Isolated PostgreSQL/PGlite tests passed: available-game gating, zero-available-game access, prior-work access, student/teacher permissions, snapshot contents, older version-3 save compatibility, forced clear failure rollback, XP/streak reset, admin/curriculum preservation, and trusted-role creation.
- Existing restore tests passed, including recreated account mapping, no resets of existing passwords, result emails, and legacy-save preflight protection.
- Backup encryption/validation tests passed using more than 1,000 run records; database reads now use one snapshot RPC.
- Pure lesson-completion tests passed: games alone versus submitted Python, another student's submission, Coming Soon games, empty lessons, and game-only lessons.
- All seven Python activities passed isolated runtime checks, including interactive input and error capture.
- Shared database pre/post installation counts: 5 profiles, 2 sections, 7 assignments, 39 game sessions, 4 Python Runs. These counts were unchanged after installing the migration.
- Local student Lesson 7 (both games Coming Soon) showed Ready to code and opened its Python workspace without a Run or submission. The unsaved-work link warning appeared during a temporary unsaved-edit check.
- Local teacher Assignment form displays automatic Python inclusion and Coming Soon challenge options; the existing Lesson 1 assignment includes its submitted Python Run in completion.

These checks do not simulate every Vercel/network/browser condition. Destructive tests used an isolated database, not the shared school data.

## Quick checks you can do

1. Student: open Lesson 7 (all games Coming Soon). Python should be available without playing those unfinished game scenes.
2. Student: open a lesson with an available, unfinished game and no prior Python Run. Python should stay locked until those available games are complete.
3. Teacher: select a whole lesson in Assignments. Read the inclusion/completion note. Choosing an individual challenge changes the note to game-only.
4. Run Python without submitting: the Python part remains pending. Submit that saved Run: it counts as done without waiting for teacher feedback. Refresh the teacher Assignment tracker.
5. Type a temporary Python edit without saving. Follow a sidebar link and cancel the warning; the edit stays. Reload and recover the edit. Restore your intended code and save it. This exercise changes only your own test draft if you choose Save.
6. After deployment, check one Python Run/submission and one teacher review on Vercel. Do not clear or restore real records just to retest.

## Remaining-item resolution

| Original item | Result | What changed |
| --- | --- | --- |
| 4 | Public signup blocked; final migration waits for deployment | Public self-registration is OFF in Supabase. Updated account creation writes trusted app metadata. Apply migration 002 only after the updated website deploys. |
| 7 | Fixed locally | Monitoring counts earlier attempts within each session. Ten successful one-attempt replays count as zero earlier attempts, not nine failures. An unfinished first attempt is not treated as a known failure. UI says “earlier attempts”; teachers still interpret the history. |
| 9 | Fixed; database part installed | Starting Python sends the displayed revision. The server rejects an outdated workspace before creating a Run, with instructions to keep the code and reload. The activity row is locked while checking/snapshotting. |
| 10 | Fixed; database part installed | A student with previous Runs can open that unpublished activity’s history and feedback. New work stays disabled. Other students cannot use this exception to see someone else’s private work. |
| 11 | Fixed; private bucket installed | Download/upload moves encrypted bytes directly through private signed Storage URLs. Application requests carry small metadata. The same encrypted save format is retained. Both export/import enforce 32 MB encrypted and 128 MB expanded limits. |
| 12 | Fixed locally for audited reports/context | Teacher/admin context and student curriculum/progress reads fetch successive ordered pages. Report activity is no longer silently cut to 100 records. Last activity considers Python Runs and game-progress updates. No-playable-game students are not automatically flagged for zero game progress. |
| 13 | Fixed locally; original wording corrected | The missing email was the ADMIN reset of a TEACHER password. Student reset already sent email. Teacher reset now sends the matching reset message, and checks the target role before changing a password. |
| 14 | Fixed locally; historical cleanup installed | New bulk-import temporary passwords appear only in the immediate result and outgoing email. Stored batch results retain account/email-delivery information without passwords. If sending fails, copy the immediate password or use password reset later. |
| 15 | Fixed locally | The old profile picture is removed only after the replacement is saved. Rejected password/profile changes clean up the new upload while preserving the old picture. |
| 16 | Fixed locally | Student Contact & Support opens /support. Admin → Profile & Settings has school-specific contact, email, phone, hours, and instructions. Empty settings show an honest “ask your teacher” fallback. |

Two related inconsistencies were also fixed: the teacher’s student-detail completed-lesson count includes the submitted Python part, and the Data Management preview lists Python drafts/Runs/submissions/reviews plus code execution records that the reset actually affects.

## Additional verification

- TypeScript, ESLint, and an isolated optimized production build passed. The temporary production-build folder was removed afterward; the running development build was preserved.
- Isolated database tests cover stale-revision rejection without a partial Run, matching revisions, retry identity, unpublished-history ownership, cached-password redaction, and the private bucket settings.
- Isolated JavaScript tests cover successful replays, unfinished attempts, more than 1,000 records, paginated ID batches, database errors, backup ownership/expiration/size checks, cleanup across multiple storage pages, failed profile updates, teacher-reset email/role guards, and one-time import credentials when email fails.
- Existing restore and lesson-completion tests passed, including rollback, account remapping, preservation of existing passwords, and emails only after successful restore.
- Encryption round-trip passed for a file larger than 4.5 MB; oversize input was rejected.
- A real 5 MB signed Storage upload/download passed using RANDOM TEST BYTES ONLY. The bytes matched exactly; an unsigned download was denied. That exact temporary object was removed. No school backup was restored or real account password reset for testing.
- During installation on October 12, before/after totals were unchanged: 5 profiles, 2 sections, 7 assignments, 39 game sessions, 4 Python Runs. User activity after installation can increase these normally.
- The local student footer opened the styled support page. Teacher Python history remained readable with existing Runs and submissions.

## What still needs your action

1. Test the LOCAL updated app using the checklist below. The live app still runs the older code until you push and Vercel finishes deploying.
2. Set the actual school’s support details under Admin → Profile & Settings. No contact person/email was invented.
3. Commit/push when satisfied. This work did not commit, push, or deploy.
4. After Vercel successfully deploys the updated code, apply ONLY migration 002 (trusted_account_roles), which is deliberately pending for compatibility. Existing accounts/passwords are unaffected. Do not reapply migrations 001, 003, 004, or 005.
5. Check one normal login and Python Run/submission/review on the deployed app. A successful local build cannot prove that Vercel environment variables, SMTP delivery, and every browser/network condition are correct.

## Focused test checklist

Use dedicated test accounts for actions that change passwords or import students. Localhost and live share this database.

- [ ] Log in as student, teacher, and admin in separate profiles/private sessions as needed. Navigate between several pages without unexpected logout.
- [ ] Teacher: assign a whole lesson and check that the form says Python is included. A specific game assignment stays game-only. Confirm the selected section filters the student list.
- [ ] Student: a lesson containing only Coming Soon games opens Python immediately when assigned. A lesson with unfinished available games still gates new Python work.
- [ ] Student: run Python, save the result, then submit it. Running alone must not mark the Python part submitted. Teacher assignment completion and student progress should agree after submitting.
- [ ] Teacher: Session Results → Python runs → search/filter by student and section → Review Run. Check source, inputs, output, earlier Runs, and submission status. Save feedback for a test submission; confirm the student can read it.
- [ ] Student: try normal output, input(), a Python error, and Stop. Your code should remain available. Test the same workspace in light mode and dark mode.
- [ ] Teacher: replay counts should no longer label every successful replay as a failed attempt. “Earlier attempts” describes retries within sessions; it is not a score or proof of poor logic.
- [ ] Admin: on a TEST activity, open its student workspace, then edit the activity. The old workspace should ask for a reload before starting another Run. Keep a copy of unsaved code first. Restore the intended activity content afterward.
- [ ] Admin: temporarily unpublish that TEST activity. Its prior student can still open existing history/feedback, but cannot start new work. Republish it afterward.
- [ ] Admin: reset only a TEST teacher password. The result should show the temporary password and email status. Check the recipient inbox/spam folder. Do not reset a real teacher merely to test.
- [ ] Teacher: bulk-import a dedicated test row. Check immediate credentials and email status. Reopening completed import history must not reveal stored temporary passwords.
- [ ] Student: try an invalid replacement photo/short password; the old photo must remain. A valid saved replacement should appear after refresh.
- [ ] Admin: enter real school support details. Student footer → Contact & Support should show them and open the configured email link.
- [ ] Admin: download an encrypted backup and confirm the .knightsave file was saved. Do not clear/restore real data merely to repeat a destructive test. The rollback/restore cases were tested in an isolated database.
- [ ] Admin: inspect Data Management’s affected-record list without pressing reset. Python records and game code executions should be included.
- [ ] After pushing: wait for Vercel deployment success, then check normal login, a lesson, an available Unity level, and a Python Run/submission/review on the live site.

## Capacity and operational notes

Temporary backup objects are encrypted and private. Normal successful transfers attempt immediate cleanup. If a tab closes or a request is interrupted, that administrator’s expired transfers are removed on their next transfer after two hours; this is not a scheduled background deletion. Download links last five minutes. Avoid sharing signed links. Backup transfers need free Supabase Storage space and count toward bandwidth use. Larger saves need a database-level backup rather than a truncated application export.

Full report reads now fetch all relevant rows rather than silently dropping old records; very large schools may eventually need reports moved to database aggregation for speed. Visible recent-notification/recent-activity widgets still intentionally show a short recent list. These are not full-history exports.

No software check guarantees zero future bugs. The audit items above have concrete fixes and regression coverage; the remaining deployment and configuration steps are explicitly identified.

References: [Vercel function limits](https://vercel.com/docs/functions/limitations), [Supabase signed uploads](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl), [Supabase account creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

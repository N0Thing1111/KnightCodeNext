# Manual Run history cleanup

## Installation status

Applied to the connected KnightCode Supabase project on 2026-10-15. All six categories returned successfully in a read-only 30-day preview (zero eligible records at that cutoff). No cleanup was executed. TypeScript and focused ESLint checks passed; browser workflow and deletion testing remain for the project owner. The website changes still need to be committed/deployed by the owner.

## Enable it on another database

Apply `supabase/migrations/202610150001_run_history_cleanup.sql` in the project's Supabase SQL Editor, then deploy the website changes. The migration installs the cleanup function and adds a nullable Python unlock-history field. **Applying the migration does not clear any history.** Local and deployed sites share this database; apply it once. No Unity rebuild is needed for this feature.

The application displays a migration-needed message if the cleanup function is absent. The existing school reset/restore tools remain separate.

## Admin → Data Management → Run history

| Category | What is removed | What is protected |
| --- | --- | --- |
| Python: old unsuccessful practice | Unsubmitted error, stopped, and timeout Runs | Finished Runs, all submissions and reviews, Runs still awaiting results |
| Python: finished, not submitted | Finished unsubmitted Runs | Submitted Runs and their reviews |
| Python: clear submitted code/output | Stored source, input answers, output, errors, and practice-check details | Run identity/status/timing/activity snapshot, submission, ratings, written reviews, assignment completion |
| Game: unfinished sessions | Sessions with no recorded completion and their command history | Completed sessions and earned progress |
| Game: completed sessions | Completed sessions and their command history | Unfinished sessions and earned progress |
| Game: unfinished and completed | Both categories and their command history | Earned progress |

Finished Python means execution ended normally, not that checks passed or the teacher awarded a passing mark. Submitted Runs are protected from both unsubmitted cleanup categories regardless of their execution status.

1. Download a save file if you may need the original history again.
2. Select a category, cutoff date, section, and/or student. Section uses current membership. All sections includes students without a section.
3. Preview the matching count and sample. The batch contains at most 500 records, oldest first; the preview shows the first 10.
4. Enter `CLEAR RUN HISTORY` and the administrator password. Password verification does not replace the browser session.
5. Check the outcome and Audit history. For more than 500 records, preview and confirm another batch; no automatic repeated deletion occurs.

The cutoff is exclusive: before midnight on the chosen date in Philippine time. Last activity includes game telemetry/commands or Python submission/review dates. It must be at least 24 hours ago. Python Runs with a heartbeat within the last 24 hours are protected. Pending Runs with no heartbeat for over 24 hours appear as unfinished/connection lost and are eligible only for unsuccessful-practice cleanup, subject to the selected cutoff. Closing the activity normally records a stopped Run; a crash or lost connection uses the heartbeat fallback. No automatic retention job is installed.

Previews expire after 15 minutes and are bound to the administrator and filters. Changing filters removes the preview. Database execution locks the same tables as backup/restore, recomputes the selection, and rejects a changed batch. Writes and the audit entry commit together. On interrupted connections, inspect Audit history before retrying.

## Data that stays

- Game aggregate progress, XP, achievements, streaks, assignments, and earned completion.
- Telemetry deduplication counters, preventing old saves from awarding progress twice. These small counters are deliberately not cleared with session history.
- Python drafts and an unlock-history timestamp, so removing the last practice Run does not lock previously started work.
- Submitted Python records and teacher reviews, including assignment completion based on submission. Clear-details actions cannot delete these records.
- Original activity snapshots on submitted Runs. Existing drafts and earlier downloaded backups can still contain code; this is history maintenance, not a purge of every copy.

Cleared submissions remain visible with a “Code/output cleared” notice and their feedback. The normal review form is hidden because the original evidence is gone. Previously deleted practice Runs cannot be compared or submitted; students can execute a new Run from their preserved draft. History-based session counts reflect retained history, while aggregate progress stays intact. Earlier-attempt counts from deleted game sessions are preserved in the progress summary, so cleanup does not improve or worsen teacher attention labels. Version-3 backups carry this summary and Python heartbeat timestamps; older version-3 saves use defaults for missing fields.

An unfinished game session means no completion was recorded for that visit. It is not a presence indicator. Reopening or restarting can legitimately produce separate unfinished sessions; cleanup does not merge distinct visits.

The existing **Learning records reset** and **School data reset** are intentionally broader: they can remove submissions, reviews, and progress. Use **Run history** for this preservation behavior.

## Manual checks (use records you are willing to remove)

- Preview each category with dates/section/student filters; verify the count and sample before confirming. Nothing changes on Preview.
- Confirm unsuccessful-practice cleanup excludes finished and submitted Runs. Confirm finished cleanup excludes submissions, even when their status is `finished`.
- Clear submitted details: open the same Run as student/teacher; verify the notice, existing feedback/ratings, and assignment completion remain. Preview again: it should not match a second time.
- Clear unfinished game sessions and verify completed sessions remain. Separately check completed and combined cleanup, and verify level completion/XP remain unchanged.
- Check the admin remains signed in. Wrong passwords, changed filters, expired previews, and empty selections must not clear history.
- Verify a student's Python activity stays accessible and draft remains after its last old unsubmitted Run is deleted.
- Check a fresh save/restore retains the cleared-details notice, reviews, submissions, and unlock history. Do not reset live school data merely to test this; use an isolated database for destructive restore testing.

No cleanup was executed against school data while implementing this feature. Browser testing is left to the project owner as requested.


## Priority fixes (15 October 2026)

Apply `202610150002_priority_run_fixes.sql` before deploying the matching website changes. It was installed in the shared Supabase project on 15 October 2026. Installation does not delete history. No Unity rebuild is needed.

- Progress and command history accept longer cumulative sessions; invalid game records no longer block later saves. Network/authentication failures remain retryable, and a rejected-record warning stays visible.
- The Python activity sends a heartbeat every minute while executing or waiting for input. Normal page exit attempts to record a stopped Run. If that request cannot arrive, the 24-hour heartbeat rule protects recent/live work while allowing manual cleanup of abandoned practice. Existing pending Runs receive a 24-hour grace period from migration installation. Finished/submitted cleanup categories remain separate.
- Manual game cleanup moves earlier-attempt counts into the preserved progress summary. Reopening a long-lived game after its old detail row was cleared uses the saved telemetry baseline, avoiding duplicate counts.
- Summary preservation applies going forward; it cannot reconstruct detailed sessions already deleted before installation. Older version-3 backups that lack the new fields remain supported.

Verified with the isolated SQL suite (including cleanup selection, ownership, stale-preview rejection, repeat safety, assessment preservation, resumed sessions, and backup/restore), offline regression suites, TypeScript and ESLint. No live cleanup or restore was performed.

## Remaining audit fixes (15 October 2026)

`202610150003_history_read_summaries.sql` was installed successfully in the shared Supabase project on 15 October 2026. It adds indexes and read-only summaries; it does not delete or rewrite school records. Deploy the matching website changes after this migration. No Unity rebuild is needed.

- Archived lessons and their levels no longer inflate teacher progress totals. Student and teacher overall assigned-work progress use the same available-game plus Python-submission calculation. A direct level assignment does not add a Python requirement.
- Admin/teacher account creation compensates for profile or section setup failures by removing only the Auth account created by that request. Failed cleanup gives explicit recovery instructions; existing accounts are never removed by this compensation.
- Dashboards use recent feeds, daily counts, and per-student summaries instead of loading full histories. Audit history is paginated. Student detail loads a limited recent feed. Data-reset previews use exact counts.
- Activity report exports still load all matching records for the selected students and date range. Summary reads preserve teacher roster isolation and Python submission row-level security.

Validation passed: TypeScript, ESLint, whitespace checks, offline regression suites, and the isolated SQL suite. Regression coverage includes over 1,000 history records, report completeness/date boundaries, account rollback failures, archived assignments, shared progress, access isolation, and earlier cleanup/backup/restore behavior. The local teacher roster loaded successfully after installation. No live account creation, email, cleanup, or restore was performed for testing.

Suggested manual checks after deployment:

1. Compare the same student's dashboard/progress percentage with the teacher roster/monitoring percentage. Complete games then submit Python for a whole-lesson assignment; both summaries should agree.
2. Archive a disposable example lesson and check that it no longer contributes to assigned-work totals. Confirm direct-level assignments do not require Python.
3. Create one disposable student/teacher normally and verify the profile and section membership. Failure and rollback cases were tested in isolation.
4. Open teacher dashboard, student detail, admin overview/audit/data-management previews, and export an Activity report for a known date range. Check that exports include older matching records even though dashboard feeds are short.

The four remaining findings from this audit are addressed. Passing these checks does not guarantee the absence of unrelated defects.

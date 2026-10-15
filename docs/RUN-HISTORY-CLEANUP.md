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

The cutoff is exclusive: before midnight on the chosen date in Philippine time. Last activity includes game telemetry/commands or Python submission/review dates. It must be at least 24 hours ago. Python Runs with pending results are excluded, even if old. No automatic retention job is installed.

Previews expire after 15 minutes and are bound to the administrator and filters. Changing filters removes the preview. Database execution locks the same tables as backup/restore, recomputes the selection, and rejects a changed batch. Writes and the audit entry commit together. On interrupted connections, inspect Audit history before retrying.

## Data that stays

- Game aggregate progress, XP, achievements, streaks, assignments, and earned completion.
- Telemetry deduplication counters, preventing old saves from awarding progress twice. These small counters are deliberately not cleared with session history.
- Python drafts and an unlock-history timestamp, so removing the last practice Run does not lock previously started work.
- Submitted Python records and teacher reviews, including assignment completion based on submission. Clear-details actions cannot delete these records.
- Original activity snapshots on submitted Runs. Existing drafts and earlier downloaded backups can still contain code; this is history maintenance, not a purge of every copy.

Cleared submissions remain visible with a “Code/output cleared” notice and their feedback. The normal review form is hidden because the original evidence is gone. Previously deleted practice Runs cannot be compared or submitted; students can execute a new Run from their preserved draft. History-based session counts reflect retained history, while aggregate progress stays intact.

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

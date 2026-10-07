# Safe school restore and recovery

## Recover the October 7 save

The original encrypted file is intact. Its read-only inspection found 1 class,
2 memberships, 7 assignments, 4 level-progress rows, 33 sessions, 8 code Runs,
145 activities, 2 earned achievements, 2 teachers and 2 students.

1. Use the updated local site at http://localhost:3000/admin/backup.
2. Select the original KnightCode-2026-10-07T04-00-45.362Z.knightsave file.
3. Enter its backup password, type RESTORE SAVE FILE, and enter your current
   administrator password. Ask other users to leave the game first.
4. Submit once. Wait for the verified record counts on the page.
5. Confirm the counts above. Open Classes and Session Results and review a Run.
   Restored numeric session IDs are kept, so Session ID 27 should be searchable.
6. Check the recreated-account email statuses. Copy passwords for any unsent
   emails before leaving the page and share them with the account owners. Accounts
   matched by email keep their CURRENT passwords (not their pre-incident passwords).

The database migration 202610070001_atomic_school_restore.sql was installed in
Supabase on October 7. Installing the function did not restore or delete records.
The website changes remain local until committed/pushed and deployed. Do not use
an older deployed restore form: it still contains the unsafe restore implementation.

## What changed

- Existing Auth accounts are never deleted by restore and their passwords are
  not reset. Changed UUIDs from the previous failed restore are matched by email.
- Missing student and teacher accounts are created with new temporary passwords.
  After the database restore succeeds, those passwords are automatically emailed
  to the saved account addresses, with the appropriate student/teacher login link.
  Passwords and per-account email status are also shown in the successful action
  response. No credentials are stored in a large cookie.
- Existing accounts keep their passwords and receive no restore password email.
  A failed or unconfirmed restore sends no emails. Email failure after a successful
  restore does not undo the restored data or hide the new credentials.
- All public school-record replacement occurs in one PostgreSQL transaction.
  Invalid links, unknown columns, or failed inserts roll back its record changes.
- Nullable fields (individual versus class assignments, optional activity levels,
  and school-wide announcements) are preserved rather than filtering rows out.
- Numeric IDs and timestamps are retained. Identity sequences are advanced so
  new records do not collide with restored IDs. Auth-linked UUIDs are remapped.
- Every restored table's count is checked before success and recorded in the
  admin audit log. A restore cannot silently skip rows.
- Accounts absent from the save, administrator accounts, administrator settings,
  and audit history are preserved. Pending teacher import batches are cleared
  because their class data has been replaced. Uploaded image bytes are NOT in
  these saves; image paths alone cannot recover deleted storage files.

Auth account creation is a separate service operation, not part of the PostgreSQL
transaction. If preparation fails, school records are not replaced, but a newly
prepared account may remain. Manage/reset its password under Teachers/Students.
If the connection fails after submission, check the admin audit history and
counts before retrying: the server may have committed despite a lost response.

The current browser upload limit is 4 MB (the application runs on Vercel). Larger
saves need a separate large-file import workflow; they are rejected before restore.
This restore path does not promise to recover data created after the save date.

## Verification

- Production build, TypeScript, and changed-file lint checks passed.
- supabase/tests/atomic-restore.mjs runs the real SQL migrations in isolated
  in-memory PostgreSQL (PGlite), with synthetic data only. It covers all table
  contents, nullable links, changed Auth UUIDs, password preservation, repeated
  restoration, identity sequences, legacy saves, permissions, and rollback after
  a deliberately broken late Run insertion.
- scripts/tests/admin-restore.mjs checks the real TypeScript restore coordinator,
  including account pagination, matching, missing-account creation, migration
  preflight, rejected links, and errors without deleting/resetting existing users.
- supabase/tests/backup-history.mjs covers backup pagination and encryption.
- The updated local admin restore form was inspected in Edge. The user's actual
  encrypted file still requires the user to enter its password and submit it;
  synthetic test success is not a claim that live recovery has already occurred.

Commands from KnightCodeNext:

```powershell
node supabase/tests/atomic-restore.mjs "$env:TEMP/knightcode-achievement-check"
node scripts/tests/admin-restore.mjs
node supabase/tests/backup-history.mjs
```

## WHERE-clause correction (October 7)

Migration 202610070002_restore_safeupdate.sql adds explicit record filters to
all restore DELETE statements. Supabase's safeupdate protection remains enabled.
The fix was applied to the connected Supabase project after the reported
DELETE requires a WHERE clause error.

Localhost currently uses the same hosted Supabase project as the live incident;
it is not a separate test database. A successful restore from the updated local
website will change that shared database and make the recovered records available
to the deployed site. The original save file still needs to be imported by you.

The corrected installed function also completed a synthetic restore against
temporary copies of the hosted Supabase table structures. The test transaction
was rolled back and school records were not changed. The SQL editor did not
permit explicitly loading the safeupdate library for a negative-control test;
its WHERE requirement is checked in the regression test, and the actual
safeguard was not disabled. The original backup still needs user import.

## One-section membership update

The section update keeps the existing save-file table names. A valid old save with one section membership per student can still be restored; legacy class and section names become one display name. The student profile section label is derived from the restored roster. A backup assigning a student to multiple sections is rejected before account preparation, with no school records replaced. See [SECTIONS-UPDATE.md](SECTIONS-UPDATE.md) for transfer behavior and the test checklist.

## Recreated-account emails

Restore uses the same SMTP settings as normal account-creation emails. It sends only after the school-record transaction succeeds, with at most five SMTP sends running at once. The results show Sent or Not sent for each recreated account and a sent/failed summary. Sent means the configured mail service accepted the message; recipients should also check their spam folder.

Do not repeat a restore merely to resend an email. The recreated accounts already exist on a second restore, so their passwords are preserved and no new email is sent. If sending fails, copy the displayed password and share it manually. If the result page is lost, use account management to reset that account's password. A connection loss or server timeout can still hide a completed restore response: check audit history and restored counts before attempting another restore.

This email update requires no additional SQL migration or Unity export. Deploy the website code and retain the existing SMTP environment settings. Mocked tests cover both account roles, matching temporary passwords, no emails for existing accounts or failed restores, no repeat emails on a second restore, email-failure results, and the concurrency limit. No real emails or production restores were performed for these tests.

# Achievement regression checks

`achievement-awards.mjs` creates a temporary, in-memory PostgreSQL database using
PGlite. It never reads `.env.local` or connects to Supabase. All account records
are synthetic and disappear when the test process finishes.

From the KnightCodeNext folder in PowerShell:

```powershell
npm.cmd install --prefix "$env:TEMP/knightcode-achievement-check" --no-audit --no-fund --ignore-scripts @electric-sql/pglite
node supabase/tests/achievement-awards.mjs "$env:TEMP/knightcode-achievement-check"
```

This keeps the test dependency outside the application and its deployment.
The harness supplies minimal Supabase Auth/Storage schemas and omits the
`pgcrypto` extension declaration; it runs the actual foundation, runtime-fix,
and achievement migrations against PostgreSQL.

Checks cover unfinished attempts, first completion, retries and replays,
XP and completion thresholds, active levels, empty courses, both streak badges,
restoring previously earned badges, duplicate notifications, assignment checks,
and the private helper's access permissions. Rerunning the migration must not
create duplicate awards or notifications.

The new migration is `202610050001_achievement_awards.sql`. Existing eligible
students receive missing awards when it runs. These awards use the repair time
as their earned timestamp because the original award time was never recorded.
Existing earned badges are permanent, and the saved longest streak can restore
a badge even if the current streak has since reset.

## Session Run history checks

```powershell
node supabase/tests/execution-history.mjs "$env:TEMP/knightcode-achievement-check"
node supabase/tests/backup-history.mjs
```

The first test runs the actual `202610050002_code_execution_history.sql`
migration in PGlite along with its prerequisites. It checks chronological
multi-part solutions, duplicate network deliveries, immutable saved code,
rejected and interrupted Runs, resets, student permissions, session deletion,
existing XP behavior, queue order, and navigation save retries.

The backup test uses the real backup code with an in-memory database substitute.
It checks pagination beyond 1,000 records, encryption/decryption, old backup
compatibility, password rejection, and exclusion of admin accounts. It does not
clear or restore the live school's data or send account emails.

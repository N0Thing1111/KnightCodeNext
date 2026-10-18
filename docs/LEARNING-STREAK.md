# Learning streak and daily practice time

Updated 18 October 2026. Migrations 202610180002_learning_streak.sql and 202610180003_streak_run_and_daily_time.sql are applied to the shared Supabase project. Website presentation changes require deployment.

## Streak rules

- A new nonblank game code Run counts, including rejected code. Opening, idling or restarting a game does not count. Finishing/retrying an existing Run on a later day does not earn another day.
- A Python run saved as finished/error counts. Stopped/timed-out runs do not earn a streak day.
- Multiple qualifying events on the same Philippine calendar day count once. A streak ending yesterday stays active until today ends; missing a full day expires the current count. The next qualifying day starts at one.
- Monday-Sunday circles use the same saved learning dates. Streaks can extend across weeks.
- Current Unity builds already send code execution events; no rebuild is required. Legacy builds without execution events can count newly reported code lines. No historical streaks or badges are removed: older records cannot always distinguish a game opening from code use.

## Daily saved practice time

- Profiles retain one day's game seconds and Python execution milliseconds. Accepted game telemetry contributes only its new time delta; Python final results contribute elapsed execution time once. Network retries do not double-count.
- The dashboard reads that bounded summary, not the latest 30 activity entries. Python typing and waiting for input are not measured. Focused game time can accumulate without a code Run; time tracking and streak qualification are separate.
- Deltas are assigned to the Philippine day they reach the server. Delayed/offline saves may therefore count on the day received. The installation-day baseline uses all retained same-day game session summaries and Python results; older missing detail and sessions spanning midnight cannot be reconstructed exactly. Subsequent saved deltas are tracked directly.
- Normal run cleanup preserves the summary. Full learning-history clearing resets it. New backups include it; restoring older saves resets missing daily totals rather than retaining data earned after the backup.
- Private helpers are called by validated receivers; students cannot invoke them directly.

## Timezone consistency

Date/time displays use Asia/Manila (UTC+8), including audit history, monitoring, notifications, assignments and reports. New assignment due dates entered in the teacher form are interpreted as Philippine time regardless of server location. Existing stored timestamps are unchanged; already-created incorrectly timed deadlines should be reviewed separately.

## Validation

Isolated database tests cover actual code Runs, initial game opens, idle telemetry, restarts, blank source, duplicate/next-day events, 35 time updates, Python durations, migration reruns, permissions, cleanup, backup/restore (including older saves), and full history clearing. JavaScript tests cover three host timezones, midnight/week rollover and actual assignment creation. Test fixtures never use the live school database.

Manual checks after deployment: open a game without running code on an uncounted day, then execute code and check the streak; refresh after further Runs to confirm it counts only once. Check saved practice time and compare an audit/session time with Philippine local time.

# Programming-logic lessons

Rebuilt on 4 October 2026. The learning target is programming logic through explanations and the KnightCode game. Python appears once per lesson as a short comparison, not as a separate language course or a set of game commands.

## What students learn

| Lesson | Main reasoning skill |
| --- | --- |
| 1. Movement & Sequence | Separate a goal from a plan; trace order and position; find the first mismatch. |
| 2. Making Decisions with If | Distinguish a question from an action; trace true and false; understand block boundaries. |
| 3. Choosing Between Two Actions | Choose one branch; justify the alternative; compare can and blocked. |
| 4. When Actions Change the Situation | Track state; order dependencies; keep necessary conditions true. |
| 5. Repeating Instructions | Find repeated groups; separate actions from repetitions; place one-time actions correctly. |
| 6. Repeating While Something Is True | Recheck conditions; trace zero/one/many passes; explain why a loop stops. |
| 7. Plan, Try, and Improve | Break a problem into smaller goals; combine structures; test, debug and justify changes. |

Each lesson has 11 or 12 sections and roughly 1,200-1,450 words including examples and labels. The sections cover explanations, worked traces, predictions, debugging, student practice, explained answers and links to the existing game challenges. Terms such as state, iteration and decomposition are explained where first used. Examples state their assumptions and are not presented as complete solutions to actual game levels.

The practice questions are reading and reasoning exercises with written answers. This revision does not add scored quizzes or claim to measure mastery automatically.

## Where to edit

- The seven `.html` files in this directory contain the lesson bodies. Keep code indentation and HTML escaping inside `<pre><code>` blocks.
- `lessons.json` contains the stable lesson IDs and titles, revised descriptions, learning objectives and HTML filenames.
- `../../scripts/lib/lesson-content.mjs` reads and validates this source.
- `../../scripts/generate-seed.mjs` combines this source with the original reference data when generating `../seed.sql`.
- `../reference-curriculum.json` remains the original imported reference. The generator overlays only these revised lesson descriptions, objectives and bodies.
- `../migrations/202610040001_programming_logic_lessons.sql` is the content-only SQL revision for existing databases.

From the KnightCodeNext folder, regenerate the fresh-install seed with:

```powershell
node scripts/generate-seed.mjs
```

This regenerates a file; it does not contact Supabase. For later edits, prepare a new content-only update for the existing database, or edit the corresponding lesson through the admin page and reconcile the local HTML source afterwards. Do not assume pushing these source files to GitHub automatically updates existing Supabase lesson records.

Use the full seed for initial setup. It also includes level and achievement definitions, so it is not the appropriate tool just to publish a lesson-text edit to an existing database.

## Current database status

The revised descriptions, objectives and content were applied to the seven existing Supabase lesson rows on 4 October 2026, then read back and compared against these files. This was a data update through the API, not a schema change or a Supabase CLI migration-history operation. The SQL file supplies the equivalent transactional update for other setups and can reapply this content version; do not replay it over newer lesson edits unless that is intended.

Lesson IDs, titles, ordering, active flags and other lesson fields were preserved. No assignment, level definition, game build, student performance or account record was changed by the content update. The original PHP and Unity sources were read for reference and were not edited.

An old page may retain text it has already loaded. Reload it to fetch the revised content. A Next.js rebuild is not required for the database text update. Local and deployed applications pointing at the same Supabase project read the same lessons.

The previous lesson records are backed up outside the repository under:

`C:\Users\Ryzen 3\AppData\Local\KnightCode\backups\lessons-before-2026-10-03T20-11-30-425Z.json`

The filename uses UTC; the local update date was 4 October 2026. To restore, use the saved description, learning_objective and content for each original lesson ID; do not replace whole records or reset related tables.

## Checks performed

- Checked all seven lesson bodies for balanced, allowed HTML and corrupted characters.
- Checked all 36 code blocks; game examples use the commands and nesting supported by the existing Unity parser.
- Executed the seven standalone Python examples and verified their described outputs.
- Traced eleven representative game examples in a small reasoning model, including both decision outcomes and zero/one/several loop passes. This model checks the written examples; it is not a substitute for replaying every Unity level.
- Verified that regenerated level and achievement SQL remained exactly the same.
- Read all seven updated Supabase rows back and verified the new text and preserved lesson fields.
- Opened the revised first and final lessons in the signed-in student site; visually checked the first lesson's explanation, code and answer layout. Reading those pages uses the site's normal lesson-view activity tracking.

No Git commit, GitHub push or Vercel deployment was performed for this content revision.

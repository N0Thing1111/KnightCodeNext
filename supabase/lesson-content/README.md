# Programming logic through Python

Revised on 18 October 2026 for KnightCode: A Gamified Course for Teaching Programming Logic. Python is the language used to express and test programming logic; the Unity game gives visual practice with the same ideas.

## Curriculum alignment

| Lesson | Python reasoning | Game connection | Assigned activity |
| --- | --- | --- | --- |
| 1. Movement & Sequence | Variables, integer input, calculations, ordered output | Ordered movement and route tracing | Plan a purchase |
| 2. Making Decisions with If | Comparisons, indentation, optional actions, boundaries | Guard movement with can() | Check the fuel warning |
| 3. Choosing Between Two Actions | if/else, equality, branch-specific calculations | Choose and justify alternative routes | Can I afford the notebook? |
| 4. When Actions Change the Situation | Update state before a decision | Buttons, crates and held pressure plates | Track a changing balance |
| 5. Repeating Instructions | for/range, accumulation, zero/one/many passes | repeat() and one-time actions after a loop | Total several items |
| 6. Repeating While Something Is True | while, changing conditions, counting, termination | Recheck a corridor after every move | Save until the target |
| 7. Plan, Try, and Improve | Nested decisions, decomposition, boundary tests, debugging | Combine route planning and mechanism dependencies | Repair the ticket counter |

Each lesson teaches Python syntax alongside the logic, provides worked examples and traces, connects to the existing game levels, and prepares students for its existing Python activity. Game snippets are explicitly distinguished from Python. Worked Python examples use different scenarios from the assigned activity. Students should trace these examples; running them in an activity editor may not match that activity's practice checks.

The activity instructions and sample input/output are aligned to the seven current activities. Output-format checks are guidance, not a substitute for teacher evaluation of reasoning. No activity starter code, practice case, scoring, unlock rule or interpreter behavior is changed.

## Files and publishing

- The seven HTML files contain the lesson bodies using the existing lesson styles.
- lessons.json holds stable IDs/titles and revised descriptions/objectives.
- ../../scripts/lib/lesson-content.mjs validates and reads these files.
- ../../scripts/generate-seed.mjs overlays the lessons onto ../reference-curriculum.json to produce ../seed.sql.
- ../python-content/activities.json contains the default activity specifications. Admin edits live in Supabase, so compare both sources before future content changes.
- ../migrations/202610180001_python_logic_lesson_content.sql provides a transactional content-only update for existing databases, guarded by standard lesson IDs and titles.

Run node scripts/generate-seed.mjs from the project root after source edits. This only regenerates a file. A Git push does not publish lesson text to existing Supabase records. Do not run the full seed just to update lesson text: it also upserts levels and achievements. Historical lesson migrations contain historical content; do not replay an older revision over this one.

The content-only update changes description, learning_objective and content for lessons 1-7. Titles, order, availability, levels, assignments, accounts, student progress, Python activities and reviews are preserved. Custom lessons are outside its scope. The shared Supabase database supplies both localhost and the deployed site. Reload a lesson to fetch updated text.

## Recovery and verification

A pre-update curriculum copy is stored outside the repository at:

C:/Users/Ryzen 3/AppData/Local/KnightCode/backups/curriculum-before-python-lessons-2026-10-18.json

Restore only description, learning_objective and content for the intended lesson IDs if needed; do not replace whole records or related tables. The copy also contains level/activity definitions for comparison, not account or student data.

Published to the shared Supabase database on 18 October 2026 through narrowly scoped API updates to the three content fields. Each update checked the lesson ID, title and previous updated_at value to avoid overwriting a concurrent edit. This was a data publication, not a migration-history operation; the SQL file supplies the equivalent transaction for other deployments.

Verification completed:
- All seven live lesson bodies, descriptions and objectives were read back and matched the source.
- Other lesson fields were preserved (apart from the normal update timestamp). Live level and Python activity records matched their pre-update snapshots.
- Eleven worked Python examples passed 25 executions covering their documented output and additional boundary/zero/one/multiple cases.
- HTML structure, sequential headings and each activity sample input/output matched the current activity definitions.
- The SQL update was run in an isolated temporary database; renamed/partial curriculum guards, empty initialization and custom-lesson preservation passed.
- Regenerated seed level and achievement statements remained byte-for-byte equivalent after line-ending normalization.

No website or Unity implementation files were changed. No browser workflow or student submission was executed for this content-only revision. No Git commit, push or Vercel deployment was performed.

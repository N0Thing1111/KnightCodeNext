# Sections: what changed and how to check it

KnightCode now uses one current section per student. Each section has one assigned teacher. A teacher can manage several sections. Subject remains an editable label; it does not create another membership or teacher relationship.

## Screens

- Admin Classes and teacher My Classes are now Sections and My Sections.
- Create/Edit Section has one Section name, Subject, School year, and Description. Admins also choose the assigned teacher.
- Edit Student has a Section dropdown instead of a typed Class Section. The options identify the teacher and school year.
- A student profile shows the actual enrolled section as a read-only value.
- Assignment selectors, student lists, monitoring, reports, and session filters use the same membership and section name.
- Existing combined names are preserved: for example, old Name `SHS Demo` and Section `Senior High` become `SHS Demo - Senior High`. You can rename that section normally.

## Enrollment and transfers

- Creating/linking a student from a teacher's section page enrolls them in that section.
- Bulk student imports enroll every accepted row into the section selected for the import. Old CSV Section columns are ignored. The sample CSV no longer asks for one.
- An import cannot silently move a student out of another section. Conflicting rows report an enrollment error.
- Teachers can use Move to Section for students already in another of their own sections.
- A teacher cannot claim a student belonging to another teacher. An admin performs that transfer using Edit Student or Add / transfer student on a section roster.
- Transfers replace the old membership in one database transaction. They do not delete progress, achievements, sessions, or Run history.
- Old assignments remain stored as history. A previous teacher's assignments no longer grant the transferred student access to lessons or games. The new teacher should assign the relevant lessons.
- Accounts may remain unassigned while awaiting enrollment. They have no current teacher. A typed old profile label is not treated as proof of enrollment.
- School year is a label on the section. There is one current membership, not a separate membership for each year.

## Suggested checks on localhost

1. Open Admin > Sections > Create. Confirm there is one Section name field and Subject is still there. Create two sections with suitable test teachers.
2. Edit a test student and select Section A. Save, then check the roster, student profile, teacher student list, and assignment/student filters.
3. Edit that same student and select Section B. Confirm they disappear from A's current roster and appear once in B. Check that session and Run history still exist as admin.
4. Sign in as A's teacher and try to link/import that student. Expect an error explaining that another teacher already owns their membership.
5. Import a new test student into B. Confirm B is used even if an older CSV contains a different Section text. Use an email you control if checking password delivery.
6. Rename B. Confirm the student's profile and filters display the new name without separately editing the student.
7. Open a student profile. Confirm Section cannot be typed or changed by the student.
8. Open existing session results and Review Runs. Confirm existing records remain available within the authorized teacher scope and to admin.

Localhost and the deployed site use the same Supabase database. Changing real membership in these checks also changes it on the live site; use designated test accounts.

## Database and deployment

Migration: `supabase/migrations/202610070003_single_section_membership.sql`.
The migration keeps the existing database table names (`classes`, `class_students`) and route paths so old links and save-file formats remain usable. A unique membership constraint and a server-only enrollment function enforce the new rule. The old profile label is maintained automatically from membership.

Backups with one membership per student remain supported, including old names and optional fields. A save containing multiple memberships for one student is rejected before account preparation; no membership is silently discarded. Database restore errors continue to roll back the school-record changes.

The migration has been applied through the shared Supabase SQL Editor. Do not run it a second time. Push the website changes when ready and wait for Vercel to finish deploying; Git push alone does not run SQL migrations. Test the new screens locally before deployment, rather than the old deployed screens. In particular, the old student profile form submits the now read-only section field and needs the new code before saving profiles on the deployed site.

## Verification

- TypeScript and focused ESLint checks passed.
- Production Next.js build passed in an isolated build folder.
- PostgreSQL tests cover one membership, transfers, cross-teacher rejection, section-name synchronization, read-only student membership, preserved sessions, old-teacher assignment access, archived-target rejection, and duplicate preflight rejection.
- Full atomic restore regression passed with this migration installed: table contents, changed Auth IDs, existing passwords, Run history, rollback, repeat restore, and legacy saves.
- Email and session-filter regression checks passed.
- No Git commit, push, or Vercel deployment was performed.

Shared database verification after applying the migration: membership rules version 1; 1 section; 1 membership; 33 sessions; 8 code executions; 0 mismatched profile section labels; 0 unassigned students. Session and execution counts matched the pre-migration check. These are counts at verification time, not limits.

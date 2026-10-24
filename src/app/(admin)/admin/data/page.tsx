import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { clearAdminData } from "@/app/actions/admin-data";
import { AdminHero, Alerts } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getPythonRoster } from "@/lib/python-data";
import { RunHistoryCleanup } from "@/components/run-history-cleanup";
// Request-time defaults for this authenticated server page.
const phDate = (daysAgo: number) => new Date(Date.now() + 8 * 3600000 - daysAgo * 86400000).toISOString().slice(0, 10);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const admin = await requireAdmin();
  if (!q.scope || q.scope === "history") {
    const roster = await getPythonRoster(admin);
    return <>
      <AdminHero title="Data Management" description="Manage retained Run history separately from school resets and backups." />
      <Alerts q={q} />
      <section className="teacher-card">
        <div className="admin-tabs">
          <Link className="teacher-btn primary" href="?scope=history" aria-current="page">Run history</Link>
          <Link className="teacher-btn" href="?scope=learning">Learning records reset</Link>
          <Link className="teacher-btn" href="?scope=school">School data reset</Link>
        </div>
        <Link className="teacher-btn" href="/admin/backup">Save or restore school data</Link>
        <p className="admin-note">Run history cleanup preserves learning progress and feedback. The reset tabs have a wider effect and can erase those records.</p>
      </section>
      <RunHistoryCleanup
        students={roster.students.map(({ id, name, student_id, class_id }) => ({ id, name, student_id, class_id }))}
        sections={roster.sections.map(({ id, name }) => ({ id, name }))}
        defaultBefore={phDate(30)} maxBefore={phDate(1)}
      />
    </>;
  }
  const scope = q.scope === "school" ? "school" : "learning",
    tables =
      scope === "learning"
        ? [
            "python_reviews",
            "python_submissions",
            "python_runs",
            "python_drafts",
            "student_code_executions",
            "student_level_sessions",
            "student_telemetry_runs",
            "student_level_progress",
            "student_activity",
            "student_achievements",
            "student_notifications",
            "teacher_notifications",
          ]
        : [
            "python_reviews",
            "python_submissions",
            "python_runs",
            "python_drafts",
            "student_code_executions",
            "student_level_sessions",
            "student_telemetry_runs",
            "student_level_progress",
            "student_activity",
            "student_achievements",
            "student_notifications",
            "teacher_notifications",
            "teacher_import_batches",
            "announcements",
            "assignments",
            "class_students",
            "classes",
            "profiles",
          ];
  const counts = Object.fromEntries(await Promise.all(tables.map(async table => {
    let query = createAdminClient().from(table).select("*", { count: "exact", head: true });
    if (table === "profiles") query = query.neq("role", "admin");
    const result = await query;
    if (result.error) throw Error("Could not count records affected by reset.");
    return [table, result.count || 0];
  })));
  return (
    <>
      <AdminHero
        title="Data Management"
        description="Create a recovery point, clear test data, or prepare this deployment for a new school term."
      />
      <Alerts q={q} />
      <section className="teacher-card">
        <h3>Make a save point before you test</h3>
        <p className="admin-note">
          Download a password-protected save of school records. Supabase
          passwords cannot be exported. Existing accounts keep their current
          passwords when restored; only missing accounts get temporary
          passwords.
        </p>
        <Link className="teacher-btn primary" href="/admin/backup">
          Save or restore school data →
        </Link>
      </section>
      <section className="teacher-card">
        <h2>Choose what to clear</h2>
        <div className="admin-tabs">
          <Link className="teacher-btn" href="?scope=history">Run history</Link>
          <Link
            className={"teacher-btn " + (scope === "learning" ? "primary" : "")}
            href="?scope=learning"
          >
            Learning records only
          </Link>
          <Link
            className={"teacher-btn " + (scope === "school" ? "primary" : "")}
            href="?scope=school"
          >
            All school operational data
          </Link>
        </div>
        <p className="admin-note">
          {scope === "learning"
            ? "Clears game performance, Python drafts, Runs, submissions, reviews, activity, earned achievements, and notifications. Resets game XP and streaks. Accounts, sections, assignments, lessons, and levels remain."
            : "Also removes teacher/student accounts, sections, enrolments, assignments, and announcements. Administrator access, settings, lessons, and levels remain."}
        </p>
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Records affected</th>
                <th>Current count</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t}>
                  <td>{t.replaceAll("_", " ")}</td>
                  <td>
                    {counts[t]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="teacher-card admin-danger">
        <h3>Confirm permanent reset</h3>
        <form action={clearAdminData} className="admin-form">
          <input type="hidden" name="scope" value={scope} />
          <label>
            Type{" "}
            {scope === "school" ? "CLEAR SCHOOL DATA" : "CLEAR LEARNING DATA"}
            <input name="confirmation" required autoComplete="off" />
          </label>
          <label>
            Your administrator password
            <input type="password" name="admin_password" required />
          </label>
          <button className="teacher-btn">
            Clear selected data permanently
          </button>
        </form>
      </section>
    </>
  );
}

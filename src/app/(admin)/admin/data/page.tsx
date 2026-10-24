import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { AdminDataNavigation } from "@/components/admin-data-navigation";
import { clearAdminData } from "@/app/actions/admin-data";
import { Alerts } from "@/components/admin-ui";
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
    return <div className="admin-data-management">
      <AdminDataNavigation active="history" />
      <Alerts q={q} />
      <RunHistoryCleanup
        students={roster.students.map(({ id, name, student_id, class_id }) => ({ id, name, student_id, class_id }))}
        sections={roster.sections.map(({ id, name }) => ({ id, name }))}
        defaultBefore={phDate(30)} maxBefore={phDate(1)}
      />
    </div>;
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
    <div className="admin-data-management">
      <AdminDataNavigation active={scope} />
      <Alerts q={q} />
      <section className="teacher-card">
        <h2>{scope === "learning" ? "Learning records reset" : "School data reset"}</h2>
        <p className="admin-note">
          {scope === "learning"
            ? "Clears game performance, Python drafts, Runs, submissions, reviews, activity, earned achievements, and notifications. Resets game XP and streaks. Accounts, sections, assignments, lessons, and levels remain."
            : "Also removes teacher/student accounts, sections, enrolments, assignments, and announcements. Administrator access, settings, lessons, and levels remain."}
        </p>
        <p className="admin-note">
          <Link href="/admin/backup">Download a password-protected save</Link> before resetting.
          Supabase passwords cannot be exported. Existing accounts keep their current
          passwords when restored; only missing accounts get temporary passwords.
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
    </div>
  );
}

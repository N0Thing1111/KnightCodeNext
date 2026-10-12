import { createAdminClient } from "@/lib/supabase/admin";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getAdminContext } from "@/lib/admin-data";
import { clearAdminData } from "@/app/actions/admin-data";
import { AdminHero, Alerts } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [q, ctx] = await Promise.all([searchParams, getAdminContext()]),
    scope = q.scope === "school" ? "school" : "learning",
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
            "python_grants",
            "teacher_import_batches",
            "announcements",
            "assignments",
            "class_students",
            "classes",
            "profiles",
          ];
  const additional = tables.filter(t => !(t in ctx));
  const extraCounts = Object.fromEntries(await Promise.all(additional.map(async t => {
    const { count, error } = await createAdminClient().from(t).select("*", { count: "exact", head: true });
    if (error) throw Error("Could not count records affected by reset.");
    return [t, count ?? 0];
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
                    {t === "profiles"
                      ? ctx.profiles.filter((p) => p.role !== "admin").length
                      : (extraCounts[t] ?? (ctx as any)[t]?.length ?? 0)}
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

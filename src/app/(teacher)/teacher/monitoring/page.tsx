import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { avatar, getTeacherContext, teacherStudents } from "@/lib/teacher-data";
import { Hero } from "@/components/teacher-ui";
import { MonitoringGuide, MonitoringOutcomes } from "@/components/monitoring-outcomes";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    t = await requireTeacher(),
    ctx = await getTeacherContext(t.id);
  let rows = teacherStudents(ctx);
  if (q.q) {
    const x = q.q.toLowerCase();
    rows = rows.filter((s) =>
      (s.name + s.student_id).toLowerCase().includes(x),
    );
  }
  if (q.class_id)
    rows = rows.filter((s) =>
      ctx.memberships.some(
        (m) => String(m.class_id) === q.class_id && m.student_id === s.id,
      ),
    );
  if (q.status) rows = rows.filter((s) => s.status === q.status);
  return (
    <>
      <Hero
        eyebrow="LEARNING ACTIVITY ONLY"
        title="Student Monitoring"
        description="Monitor learning activity generated inside KnightCode — lessons, challenges, progress, XP, streaks, and achievements."
      />
      <p>
        <Link className="teacher-btn" href="/teacher/results">
          Search session results →
        </Link>
      </p>
      <p className="teacher-note">Assigned progress covers available assigned games plus Python activities attached to whole-lesson assignments. A Python submission counts as completion; teacher review is separate. Python Runs also update Last Activity. Status labels help you choose what to review; they are not grades.</p>
      <MonitoringGuide />
      <div className="monitor-legend">
        {[
          "Active",
          "Recently Active",
          "On Track",
          "Needs Attention",
          "Inactive",
        ].map((x) => (
          <span
            key={x}
            className={"status-badge " + x.toLowerCase().replaceAll(" ", "-")}
          >
            {x}
          </span>
        ))}
      </div>
      <section className="teacher-card monitoring-list">
        <form className="teacher-filterbar">
          <label>
            Search
            <input
              name="q"
              defaultValue={q.q}
              placeholder="Student name or ID"
            />
          </label>
          <label>
            Section
            <select name="class_id" defaultValue={q.class_id || ""}>
              <option value="">All sections</option>
              {ctx.classes
                .filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {sectionLabel(c)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={q.status || ""}>
              <option value="">All statuses</option>
              {[
                "Active",
                "Recently Active",
                "On Track",
                "Needs Attention",
                "Inactive",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <button className="teacher-btn primary">Apply</button>
        </form>
        <p className="monitor-table-hint">Expand a run count for outcomes or a status for its reason.</p>
        <div className="teacher-table-wrap" role="region" aria-label="Student monitoring results" tabIndex={0}>
          <table className="teacher-table monitoring-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Progress</th>
                <th>Game runs</th>
                <th>Python runs</th>
                <th>Streak</th>
                <th>Last Activity</th>
                <th>Status</th>
                <th><span className="monitor-sr-only">Student details</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="table-person">
                        <span className="teacher-avatar">
                          {avatar(s.avatar_key)}
                        </span>
                        <span>
                          <strong>{s.name}</strong>
                          <small>{s.student_id}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-progress">
                        <span
                          style={{ width: Math.min(100, s.progress_pct) + "%" }}
                        />
                      </div>
                      <small>{Math.round(s.progress_pct)}%</small>
                      <small className="monitor-cell-note">{s.completed_levels}/{s.total_levels} games completed</small>
                    </td>
                    <td>
                      <MonitoringOutcomes outcomes={s.game_outcomes} compact />
                      <small className="monitor-cell-note" title="Level starts and restarts; separate from code runs">{s.attempts} level attempts</small>
                    </td>
                    <td>
                      <MonitoringOutcomes outcomes={s.python_outcomes} compact />
                    </td>
                    <td>🔥 {s.streak}</td>
                    <td>
                      {s.last_activity
                        ? new Date(s.last_activity).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
                        : "Never"}
                    </td>
                    <td>
                      <details className="monitor-status-details">
                        <summary aria-label={`${s.status}: show reason for ${s.name}`}>
                          <span className={"status-badge " + s.status.toLowerCase().replaceAll(" ", "-")}>
                            {s.status}
                          </span>
                        </summary>
                        <p>{s.status_reason}</p>
                      </details>
                    </td>
                    <td>
                      <Link
                        prefetch={false}
                        className="table-link"
                        href={"/teacher/student/" + s.id}
                      >
                        Monitor
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="teacher-empty">No students found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

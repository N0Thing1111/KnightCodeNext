import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { avatar, getTeacherContext, teacherStudents } from "@/lib/teacher-data";
import { Hero } from "@/components/teacher-ui";
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
      <section className="teacher-card">
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
            Class
            <select name="class_id" defaultValue={q.class_id || ""}>
              <option value="">All classes</option>
              {ctx.classes
                .filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.section}
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
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Progress</th>
                <th>Lessons / Challenges</th>
                <th>Attempts</th>
                <th>Streak</th>
                <th>Last Activity</th>
                <th>Status</th>
                <th />
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
                    </td>
                    <td>
                      {s.completed_levels} / {s.total_levels}
                    </td>
                    <td>
                      {s.attempts} <small>({s.failed_attempts} failed)</small>
                    </td>
                    <td>🔥 {s.streak}</td>
                    <td>
                      {s.last_activity
                        ? new Date(s.last_activity).toLocaleString()
                        : "Never"}
                    </td>
                    <td>
                      <span
                        className={
                          "status-badge " +
                          s.status.toLowerCase().replaceAll(" ", "-")
                        }
                      >
                        {s.status}
                      </span>
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

import { getAdminContext } from "@/lib/admin-data";
import { AdminHero } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [q, ctx] = await Promise.all([searchParams, getAdminContext()]),
    student = q.student || "",
    level = q.level || "",
    status = q.status || "";
  const rows = ctx.student_level_sessions.filter(
    (s) =>
      (!student || s.student_id === student) &&
      (!level || String(s.level_id) === level) &&
      (!status || (status === "completed" ? s.completed : !s.completed)),
  );
  return (
    <>
      <AdminHero
        title="Session Results"
        description="Review individual game sessions, attempts, mistakes, submitted lines, and completion time."
      />
      <section className="teacher-card">
        <form className="teacher-filterbar admin-result-filters">
          <label>
            Student
            <select name="student" defaultValue={student}>
              <option value="">All students</option>
              {ctx.profiles
                .filter((p) => p.role === "student")
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Level
            <select name="level" defaultValue={level}>
              <option value="">All levels</option>
              {ctx.levels.map((l) => (
                <option value={l.id} key={l.id}>
                  #{l.level_number} · {l.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={status}>
              <option value="">Any status</option>
              <option value="completed">Completed</option>
              <option value="started">In progress</option>
            </select>
          </label>
          <button className="teacher-btn">Filter</button>
        </form>
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Student</th>
                <th>Level</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Mistakes</th>
                <th>Time</th>
                <th>Lines</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((s) => {
                  const p = ctx.profiles.find((x) => x.id === s.student_id),
                    l = ctx.levels.find((x) => x.id === s.level_id);
                  return (
                    <tr key={s.id}>
                      <td>{new Date(s.started_at).toLocaleString()}</td>
                      <td>
                        {p?.name}
                        <small>{p?.student_id}</small>
                      </td>
                      <td>
                        #{l?.level_number} · {l?.title}
                      </td>
                      <td>
                        <span
                          className={
                            "status-badge " + (s.completed ? "on" : "muted")
                          }
                        >
                          {s.completed ? "Completed" : "In progress"}
                        </span>
                      </td>
                      <td>{s.attempts}</td>
                      <td>{s.mistakes}</td>
                      <td>{s.play_time_seconds}s</td>
                      <td>{s.completed_lines ?? s.lines_used}</td>
                      <td>{s.code_mode || "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="teacher-empty">No matching sessions.</div>
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { avatar, getTeacherContext, teacherStudents } from "@/lib/teacher-data";
import { MonitoringGuide } from "@/components/monitoring-outcomes";
import styles from "@/components/teacher-worklists.module.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    t = await requireTeacher(),
    ctx = await getTeacherContext(t.id);
  const students = teacherStudents(ctx);
  let rows = [...students];
  if (q.q) {
    const x = q.q.toLowerCase();
    rows = rows.filter((s) =>
      [s.name, s.username, s.email].join(" ").toLowerCase().includes(x),
    );
  }
  if (q.class_id)
    rows = rows.filter((s) =>
      ctx.memberships.some(
        (m) => String(m.class_id) === q.class_id && m.student_id === s.id,
      ),
    );
  if (q.status) rows = rows.filter((s) => s.status === q.status);
  if (q.level) rows = rows.filter((s) => String(s.level) === q.level);
  const min = Number(q.min_progress || 0);
  rows = rows.filter((s) => s.progress_pct >= min);
  const sort = q.sort || "name";
  rows.sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : sort === "activity"
        ? String(b.last_activity).localeCompare(String(a.last_activity))
        : Number((b as any)[sort === "progress" ? "progress_pct" : sort] || 0) -
          Number((a as any)[sort === "progress" ? "progress_pct" : sort] || 0),
  );
  return (
    <>
      <header className={styles.heading}>
        <div>
          <h2>Students</h2>
          <p>
            Explore each student&apos;s progress, activity, and learning stats.
          </p>
        </div>
        <Link className="teacher-btn" href="/teacher/monitoring">
          Review submissions
        </Link>
      </header>
      <MonitoringGuide statusesOnly />
      <section className="teacher-card">
        <Filter
          q={q}
          classes={ctx.classes}
          levels={[...new Set(students.map((s) => s.level))].sort(
            (a, b) => a - b,
          )}
        />
        <div
          className="teacher-table-wrap"
          role="region"
          aria-label="Student progress and stats"
          tabIndex={0}
        >
          <table
            className={`teacher-table student-roster-table ${styles.roster}`}
          >
            <thead>
              <tr>
                <th>Student</th>
                <th>Section</th>
                <th>Level / XP</th>
                <th>Progress</th>
                <th>Activity</th>
                <th>Status</th>
                <th>Action</th>
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
                          <small>
                            {s.email}
                            {s.username ? " · @" + s.username : ""}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>{s.classes}</td>
                    <td>
                      Lv. {s.level}
                      <small className={styles.secondary}>
                        {s.xp.toLocaleString()} XP
                      </small>
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
                      {s.last_activity
                        ? new Date(s.last_activity).toLocaleString("en-PH", {
                            timeZone: "Asia/Manila",
                          })
                        : "Never"}
                      <small className={styles.secondary}>
                        {s.streak}-day streak
                      </small>
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
                      <p className="teacher-note">{s.status_reason}</p>
                    </td>
                    <td className={styles.actionCell}>
                      <Link
                        prefetch={false}
                        className="teacher-btn"
                        href={"/teacher/student/" + s.id}
                      >
                        View student
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="teacher-empty">
                      No students match your filters.
                    </div>
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
function Filter({
  q,
  classes,
  levels,
}: {
  q: Record<string, string | undefined>;
  classes: any[];
  levels: number[];
}) {
  return (
    <form className={`teacher-filterbar ${styles.rosterFilters}`}>
      <label>
        Search
        <input
          name="q"
          defaultValue={q.q}
          placeholder="Name, username, or email"
        />
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
      <label>
        Level
        <select name="level" defaultValue={q.level || ""}>
          <option value="">All levels</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>
      </label>
      <label>
        Progress
        <select name="min_progress" defaultValue={q.min_progress || "0"}>
          <option value="0">Any progress</option>
          <option value="50">50%+</option>
          <option value="75">75%+</option>
          <option value="90">90%+</option>
        </select>
      </label>
      <label>
        Section
        <select name="class_id" defaultValue={q.class_id || ""}>
          <option value="">All sections</option>
          {classes
            .filter((c) => c.status === "active")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {sectionLabel(c)}
              </option>
            ))}
        </select>
      </label>
      <label>
        Sort
        <select name="sort" defaultValue={q.sort || "name"}>
          <option value="name">Name</option>
          <option value="progress">Progress</option>
          <option value="xp">XP</option>
          <option value="level">Level</option>
          <option value="activity">Recent activity</option>
        </select>
      </label>
      <div className={styles.filterActions}>
        <button className="teacher-btn primary">Filter</button>
        <Link prefetch={false} className="teacher-btn" href="/teacher/students">
          Reset
        </Link>
      </div>
    </form>
  );
}

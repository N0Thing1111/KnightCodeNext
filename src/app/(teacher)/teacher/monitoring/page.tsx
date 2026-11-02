import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { getTeacherContext } from "@/lib/teacher-data";
import {
  teacherAttention,
  type AttentionStatus,
} from "@/lib/teacher-attention";
import { sectionLabel } from "@/lib/section-label";
import { formatSchoolDateTime } from "@/lib/school-time";
import styles from "@/components/teacher-worklists.module.css";

const tabs: { id: AttentionStatus; label: string; empty: string }[] = [
  {
    id: "awaiting_review",
    label: "Awaiting review",
    empty: "No Python submissions awaiting review.",
  },
  {
    id: "needs_revision",
    label: "Needs revision",
    empty: "No Python activities currently need revision.",
  },
  {
    id: "passed",
    label: "Passed",
    empty: "No Python activities have been passed yet.",
  },
  {
    id: "overdue",
    label: "Overdue assignments",
    empty: "No incomplete assignments are overdue.",
  },
];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    teacher = await requireTeacher(),
    ctx = await getTeacherContext(teacher.id);
  const tab = tabs.find((t) => t.id === q.tab) || tabs[0];
  const search = (q.q || "").trim().toLowerCase();
  const items = teacherAttention(ctx).filter(
    (item) =>
      (!q.class_id || item.sectionId === q.class_id) &&
      (!search ||
        [item.student, item.username, item.email, item.title]
          .join(" ")
          .toLowerCase()
          .includes(search)),
  );
  const rows = items.filter((item) => item.status === tab.id);
  if (tab.id === "passed")
    rows.sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) ||
        a.student.localeCompare(b.student),
    );
  const link = (id: string) =>
    "/teacher/monitoring?" +
    new URLSearchParams({
      tab: id,
      ...(q.q ? { q: q.q } : {}),
      ...(q.class_id ? { class_id: q.class_id } : {}),
    });
  return (
    <>
      <header className={styles.heading}>
        <div>
          <h2>Monitoring</h2>
          <p>Track Python assessments and follow up on overdue assignments.</p>
        </div>
        <Link className="teacher-btn" href="/teacher/students">
          Student progress &amp; stats
        </Link>
      </header>
      <section className="teacher-card">
        <form className={`teacher-filterbar ${styles.monitorFilters}`}>
          <input type="hidden" name="tab" value={tab.id} />
          <label>
            Search
            <input
              name="q"
              defaultValue={q.q}
              placeholder="Student or activity"
            />
          </label>
          <label>
            Section
            <select name="class_id" defaultValue={q.class_id || ""}>
              <option value="">All active sections</option>
              {ctx.classes
                .filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {sectionLabel(c)}
                  </option>
                ))}
            </select>
          </label>
          <div className={styles.filterActions}>
            <button className="teacher-btn primary">Filter</button>
            <Link
              className="teacher-btn"
              href={"/teacher/monitoring?tab=" + tab.id}
            >
              Reset
            </Link>
          </div>
        </form>
        <nav
          className={styles.tabs}
          aria-label="Assessment and assignment status"
        >
          {tabs.map((t) => (
            <Link
              key={t.id}
              className={"teacher-btn" + (tab.id === t.id ? " primary" : "")}
              aria-current={tab.id === t.id ? "page" : undefined}
              href={link(t.id)}
            >
              {t.label}{" "}
              <span className={styles.count}>
                {items.filter((i) => i.status === t.id).length}
              </span>
            </Link>
          ))}
        </nav>
        <p className={styles.explanation}>
          {tab.id === "overdue"
            ? "Past-due assignments with unfinished games, missing Python work, or requested revisions. Work only awaiting review is excluded."
            : tab.id === "passed"
              ? "Accepted Python activities. A passed activity does not mean the whole lesson assignment is complete; check Student progress for remaining games."
              : "One entry per student and Python activity. Resubmissions move to Awaiting review; accepted work moves to Passed."}
        </p>
        <div
          className="teacher-table-wrap"
          role="region"
          aria-label={tab.label}
          tabIndex={0}
        >
          <table className={`teacher-table ${styles.queue}`}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Section</th>
                <th>
                  {tab.id === "overdue" ? "Assignment" : "Python activity"}
                </th>
                <th>
                  {tab.id === "overdue"
                    ? "Due date"
                    : tab.id === "needs_revision"
                      ? "Revision requested"
                      : tab.id === "passed"
                        ? "Reviewed"
                        : "Submitted"}{" "}
                  (UTC+8)
                </th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <strong>{item.student}</strong>
                      <small className={styles.secondary}>
                        {item.username ? "@" + item.username : item.email}
                      </small>
                    </td>
                    <td>{item.section}</td>
                    <td>{item.title}</td>
                    <td>
                      <time dateTime={item.date}>
                        {formatSchoolDateTime(item.date)}
                      </time>
                    </td>
                    <td>
                      <span
                        className={
                          "status-badge " +
                          (item.status === "passed"
                            ? "on-track"
                            : item.status === "awaiting_review"
                              ? "recently-active"
                              : "needs-attention")
                        }
                      >
                        {item.status === "overdue" ? "Overdue" : tab.label}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <Link
                        prefetch={false}
                        className="teacher-btn"
                        href={item.href}
                      >
                        {item.status === "awaiting_review"
                          ? "Review submission"
                          : item.status === "overdue"
                            ? "View progress"
                            : "View feedback"}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="teacher-empty">
                      {tab.empty}
                      {(q.q || q.class_id) && " Try changing your filters."}
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

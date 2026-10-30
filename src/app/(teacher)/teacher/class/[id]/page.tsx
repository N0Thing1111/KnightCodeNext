import { ClassEnrollment } from "@/components/class-enrollment";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import {
  assignmentCounts,
  avatar,
  getTeacherContext,
  teacherStudents,
} from "@/lib/teacher-data";
import {
  addExistingStudent,
  removeStudent,
} from "@/app/actions/teacher";
import { Alerts, Hero } from "@/components/teacher-ui";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, q, t, jar] = await Promise.all([
      params,
      searchParams,
      requireTeacher(),
      cookies(),
    ]),
    ctx = await getTeacherContext(t.id),
    cls = ctx.classes.find((c) => String(c.id) === id);
  if (!cls) notFound();
  const all = teacherStudents(ctx),
    ids = new Set(
      ctx.memberships
        .filter((m) => m.class_id === cls.id)
        .map((m) => m.student_id),
    ),
    students = all.filter((s) => ids.has(s.id)),
    available = all.filter((s) => !ids.has(s.id)),
    avg = students.length
      ? Math.round(
          (students.reduce((n, s) => n + s.progress_pct, 0) / students.length) *
            10,
        ) / 10
      : 0,
    active = students.filter((s) =>
      ["Active", "Recently Active", "On Track"].includes(s.status),
    ).length,
    needs = students.filter((s) => s.status === "Needs Attention").length,
    assignments = ctx.assignments
      .filter((a) => a.class_id === cls.id)
      .slice(0, 8);
  let flash: any = null;
  try {
    flash = JSON.parse(jar.get("kc_teacher_flash")?.value || "null");
  } catch {}
  return (
    <>
      <Hero
        eyebrow="SECTION"
        title={<>{sectionLabel(cls)}</>}
        description={
          cls.subject + " · " + (cls.school_year || "") + " · " + cls.status
        }
      >
        {cls.status !== "archived" && <div className="hero-actions">
          <Link
            prefetch={false}
            className="teacher-btn"
            href="#enrollment"
          >
            Invite Students
          </Link>
          <Link
            prefetch={false}
            className="teacher-btn primary"
            href={"/teacher/assignments?class_id=" + cls.id}
          >
            Assign Lesson
          </Link>
        </div>}
      </Hero>
      <Alerts searchParams={q} />
      {flash && (
        <div className="teacher-alert success">
          ✓ {flash.message}
          {flash.password && (
            <>
              {" "}
              <strong>{flash.password}</strong>{" "}
              <span className="teacher-note">
                {flash.emailSent
                  ? "The temporary password was also emailed to the student."
                  : "Email delivery failed or is not configured. Copy and share this password securely."}
              </span>
            </>
          )}
        </div>
      )}
      <div className="teacher-metric-grid four">
        <Metric label="Students" value={students.length} />
        <Metric label="Active" value={active} />
        <Metric label="Avg Progress" value={avg + "%"} />
        <Metric label="Needs Attention" value={needs} warning />
      </div>
      <div className="teacher-grid two">
        <section className="teacher-card">
          <Head eyebrow="SECTION ROSTER" title="Students" />
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {students.length ? (
                  students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="table-person">
                          <span className="teacher-avatar">
                            {avatar(s.avatar_key)}
                          </span>
                          <span>
                            <strong>{s.name}</strong>
                            <small>{s.username || s.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>{Math.round(s.progress_pct)}%</td>
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
                      <td>
                        <div className="class-card-actions">
                          <Link
                            prefetch={false}
                            className="table-link"
                            href={"/teacher/student/" + s.id}
                          >
                            Open
                          </Link>
                          <form action={removeStudent}>
                            <input
                              type="hidden"
                              name="class_id"
                              value={cls.id}
                            />
                            <input
                              type="hidden"
                              name="student_id"
                              value={s.id}
                            />
                            <button className="table-danger">Remove</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="teacher-empty">
                        No students in this section.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="teacher-card">
          <Head eyebrow="ADD STUDENTS" title="Build this roster" />
          {cls.status === "archived" ? <p className="teacher-note">This section is archived. Restore it before accepting enrollment requests.</p> : <>
          <p className="teacher-note">
            Students belong to one section. Moving a student removes the
            previous membership but keeps their learning history. Transfers from
            another teacher must be made by an administrator.
          </p>
          {available.length > 0 && (
            <form action={addExistingStudent} className="teacher-form">
              <input type="hidden" name="class_id" value={cls.id} />
              <label>
                Move a student from another of your sections
                <select name="student_id" required defaultValue="">
                  <option value="" disabled>
                    Choose student
                  </option>
                  {available.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name} · {s.username || s.email}
                    </option>
                  ))}
                </select>
              </label>
              <button className="teacher-btn">Move to Section</button>
            </form>
          )}
          <div style={{ height: 14 }} />
          <ClassEnrollment classId={cls.id} />
          </>}
        </section>
      </div>
      <div className="teacher-grid two">
        <section className="teacher-card">
          <Head eyebrow="ASSIGNMENTS" title="Recent section assignments" />
          <div>
            {assignments.length ? (
              assignments.map((a) => {
                const counts = assignmentCounts(ctx, a),
                  lesson = ctx.lessons.find((l) => l.id === a.lesson_id);
                return (
                  <div className="assignment-row" key={a.id}>
                    <div>
                      <strong>{a.title}</strong>
                      <small>{lesson?.title ?? "KnightCode"}</small>
                    </div>
                    <span>
                      {counts.done} / {counts.target}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="teacher-empty">No assignments yet.</div>
            )}
          </div>
        </section>
        <section className="teacher-card">
          <Head eyebrow="ABOUT" title="Section details" />
          <p className="teacher-prose">
            {cls.description || "No description provided."}
          </p>
        </section>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  warning,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div className={"teacher-metric " + (warning ? "warning" : "")}>
      <span>{warning ? "!" : "◉"}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
function Head({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="teacher-card-head">
      <div>
        <span className="teacher-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
    </div>
  );
}

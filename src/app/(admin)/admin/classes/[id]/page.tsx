import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/admin-data";
import { saveRoster } from "@/app/actions/admin";
import { AdminHero, Alerts } from "@/components/admin-ui";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, q, ctx] = await Promise.all([
      params,
      searchParams,
      getAdminContext(),
    ]),
    cls = ctx.classes.find((c) => String(c.id) === id);
  if (!cls) notFound();
  const ids = new Set(
      ctx.class_students
        .filter((x) => x.class_id === cls.id)
        .map((x) => x.student_id),
    ),
    students = ctx.profiles.filter(
      (p) => p.role === "student" && ids.has(p.id),
    ),
    available = ctx.profiles.filter(
      (p) => p.role === "student" && p.active && !ids.has(p.id),
    ),
    teacher = ctx.profiles.find((p) => p.id === cls.teacher_id);
  return (
    <>
      <Link className="admin-back" href="/admin/manage/classes">
        ← Back to sections
      </Link>
      <AdminHero
        title={sectionLabel(cls)}
        description={cls.subject + " · " + (teacher?.name || "No teacher")}
      />
      <Alerts q={q} />
      <div className="teacher-grid two">
        <section className="teacher-card">
          <h3>Add or transfer a student</h3>
          {available.length ? (
            <form action={saveRoster} className="teacher-form">
              <input type="hidden" name="class_id" value={cls.id} />
              <input type="hidden" name="roster_action" value="add" />
              <label>
                Student
                <select name="student_id" required defaultValue="">
                  <option value="" disabled>
                    Choose student
                  </option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.student_id} -{" "}
                      {ctx.classes.find((c) =>
                        ctx.class_students.some(
                          (m) => m.student_id === s.id && m.class_id === c.id,
                        ),
                      )?.name || "Unassigned"}
                    </option>
                  ))}
                </select>
              </label>
              <button className="teacher-btn primary">
                Add / transfer student
              </button>
            </form>
          ) : (
            <div className="teacher-empty">
              All active students are already in this section.
            </div>
          )}
        </section>
        <section className="teacher-card">
          <h3>{students.length} enrolled students</h3>
          <p className="teacher-note">
            Selecting a student from another section transfers them here. Their
            progress and session history are preserved.
          </p>
        </section>
      </div>
      <section className="teacher-card">
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Section</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <small>{s.student_id}</small>
                  </td>
                  <td>{s.email}</td>
                  <td>{sectionLabel(cls)}</td>
                  <td>
                    <form action={saveRoster}>
                      <input type="hidden" name="class_id" value={cls.id} />
                      <input type="hidden" name="student_id" value={s.id} />
                      <input
                        type="hidden"
                        name="roster_action"
                        value="remove"
                      />
                      <button className="teacher-btn danger">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

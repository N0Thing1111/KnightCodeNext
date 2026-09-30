import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { getTeacherContext } from "@/lib/teacher-data";
import { Alerts, Hero } from "@/components/teacher-ui";
import { saveClass, setClassStatus } from "@/app/actions/teacher";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    t = await requireTeacher(),
    ctx = await getTeacherContext(t.id),
    edit = q.edit ? ctx.classes.find((c) => String(c.id) === q.edit) : null,
    show = q.action === "new" || !!edit;
  return (
    <>
      <Hero
        eyebrow="CLASSROOM MANAGEMENT"
        title="My Classes"
        description="Create classes, import students, and monitor class performance."
      >
        <Link
          prefetch={false}
          className="teacher-btn primary"
          href="/teacher/classes?action=new"
        >
          + New Class
        </Link>
      </Hero>
      <Alerts searchParams={q} />
      {show && (
        <section className="teacher-card teacher-form-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">CLASS DETAILS</span>
              <h3>{edit ? "Edit Class" : "Create Class"}</h3>
            </div>
            <Link prefetch={false} href="/teacher/classes">
              Cancel
            </Link>
          </div>
          <form action={saveClass} className="teacher-form">
            <input type="hidden" name="id" value={edit?.id ?? 0} />
            <div className="teacher-form-grid">
              <label>
                Class name
                <input
                  name="name"
                  required
                  defaultValue={edit?.name ?? ""}
                  placeholder="BSIS Programming"
                />
              </label>
              <label>
                Section
                <input
                  name="section"
                  required
                  defaultValue={edit?.section ?? ""}
                  placeholder="BSIS-C2"
                />
              </label>
              <label>
                Subject
                <input
                  name="subject"
                  defaultValue={edit?.subject ?? "Programming"}
                />
              </label>
              <label>
                School year
                <input
                  name="school_year"
                  defaultValue={edit?.school_year ?? "2026-2027"}
                />
              </label>
              <label className="full">
                Description
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={edit?.description ?? ""}
                  placeholder="Optional class description"
                />
              </label>
            </div>
            <button className="teacher-btn primary">Save Class</button>
          </form>
        </section>
      )}
      <section className="teacher-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">YOUR CLASSES</span>
            <h3>
              {ctx.classes.length} class{ctx.classes.length === 1 ? "" : "es"}
            </h3>
          </div>
        </div>
        <div className="teacher-class-grid">
          {ctx.classes.length ? (
            ctx.classes.map((c) => {
              const count = ctx.memberships.filter(
                (m) => m.class_id === c.id,
              ).length;
              return (
                <article
                  key={c.id}
                  className={
                    "teacher-class-card " +
                    (c.status === "archived" ? "archived" : "")
                  }
                >
                  <div className="class-card-top">
                    <span className="class-icon">▦</span>
                    <span
                      className={
                        "status-badge " +
                        (c.status === "active" ? "on" : "muted")
                      }
                    >
                      {c.status}
                    </span>
                  </div>
                  <h3>{c.name}</h3>
                  <p>
                    {c.section} · {c.subject}
                  </p>
                  <div className="class-card-meta">
                    <span>👥 {count} students</span>
                    <span>📅 {c.school_year}</span>
                  </div>
                  <div className="class-card-actions">
                    <Link
                      prefetch={false}
                      className="teacher-btn small"
                      href={"/teacher/class/" + c.id}
                    >
                      Open
                    </Link>
                    <Link
                      prefetch={false}
                      className="teacher-btn small"
                      href={"/teacher/classes?edit=" + c.id}
                    >
                      Edit
                    </Link>
                    <Link
                      prefetch={false}
                      className="teacher-btn small"
                      href={"/teacher/classes?import=" + c.id}
                    >
                      Import
                    </Link>
                    <form action={setClassStatus}>
                      <input type="hidden" name="id" value={c.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={c.status === "active" ? "archived" : "active"}
                      />
                      <button className="teacher-btn small danger">
                        {c.status === "active" ? "Archive" : "Restore"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="teacher-empty">No classes created yet.</div>
          )}
        </div>
      </section>
      {q.import && <ImportBox classId={q.import} />}
    </>
  );
}
function ImportBox({ classId }: { classId: string }) {
  return (
    <section className="teacher-card">
      <div className="teacher-card-head">
        <div>
          <span className="teacher-eyebrow">IMPORT STUDENTS</span>
          <h3>Upload student list</h3>
        </div>
        <a
          className="teacher-btn small"
          href="/teacher/sample-students-import.csv"
          download
        >
          Download Sample CSV
        </a>
      </div>
      <form
        action="/api/teacher/import"
        method="post"
        encType="multipart/form-data"
        className="teacher-import-box"
      >
        <input type="hidden" name="class_id" value={classId} />
        <div className="upload-drop">
          <strong>Drop a CSV or XLSX file here</strong>
          <span>or choose a file from your device · maximum 5 MB</span>
          <input type="file" name="student_file" accept=".csv,.xlsx" required />
        </div>
        <div className="import-columns">
          <strong>Required columns</strong>
          <span>Student ID</span>
          <span>First Name + Last Name (or Name)</span>
          <span>Email</span>
          <span>Optional: Username, Section</span>
        </div>
        <button className="teacher-btn primary">
          Validate &amp; Preview →
        </button>
      </form>
    </section>
  );
}

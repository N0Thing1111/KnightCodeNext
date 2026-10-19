import { SectionArchiveButton } from "@/components/section-archive-button";
import { sectionLabel } from "@/lib/section-label";
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
        eyebrow="SECTION MANAGEMENT"
        title="My Sections"
        description="Create sections, import students, and monitor section performance."
      >
        <Link
          prefetch={false}
          className="teacher-btn primary"
          href="/teacher/classes?action=new"
        >
          + New Section
        </Link>
      </Hero>
      <Alerts searchParams={q} />
      {show && (
        <section className="teacher-card teacher-form-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">SECTION DETAILS</span>
              <h3>{edit ? "Edit Section" : "Create Section"}</h3>
            </div>
            <Link prefetch={false} href="/teacher/classes">
              Cancel
            </Link>
          </div>
          <form
            key={edit?.id ?? "new"}
            action={saveClass}
            className="teacher-form"
          >
            <input type="hidden" name="id" value={edit?.id ?? 0} />
            <div className="teacher-form-grid">
              <label>
                Section name
                <input
                  name="name"
                  required
                  defaultValue={edit ? sectionLabel(edit) : ""}
                  placeholder="Grade 11 - ICT A"
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
                  placeholder="Optional section description"
                />
              </label>
            </div>
            <button className="teacher-btn primary">Save Section</button>
          </form>
        </section>
      )}
      <section className="teacher-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">YOUR SECTIONS</span>
            <h3>
              {ctx.classes.length} section{ctx.classes.length === 1 ? "" : "s"}
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
                  <h3>{sectionLabel(c)}</h3>
                  <p>{c.subject}</p>
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
                    {c.status === "active" && <Link
                      prefetch={false}
                      className="teacher-btn small"
                      href={"/teacher/classes?import=" + c.id}
                    >
                      Import
                    </Link>}
                    <form action={setClassStatus}>
                      <input type="hidden" name="id" value={c.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={c.status === "active" ? "archived" : "active"}
                      />
                      <SectionArchiveButton archived={c.status === "archived"} name={sectionLabel(c)} className="teacher-btn small danger" />
                    </form>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="teacher-empty">No sections created yet.</div>
          )}
        </div>
      </section>
      {q.import && (ctx.classes.some(c => String(c.id) === q.import && c.status === "active") ? <ImportBox classId={q.import} /> : <p className="teacher-note">Restore the section before importing students.</p>)}
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
          <p>
            All rows are enrolled in the selected section. Any Section column in
            an older file is ignored.
          </p>
          <strong>Required columns</strong>
          <span>Student ID</span>
          <span>First Name + Last Name (or Name)</span>
          <span>Email</span>
          <span>Optional: Username</span>
        </div>
        <button className="teacher-btn primary">
          Validate &amp; Preview →
        </button>
      </form>
    </section>
  );
}

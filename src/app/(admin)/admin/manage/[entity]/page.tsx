import { AdminRecordActions } from "@/components/admin-record-actions";
import { GamePreviewButton } from "@/components/game-preview-button";
import { SectionArchiveButton } from "@/components/section-archive-button";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { LessonEditor } from "@/components/lesson-editor";
import { getPythonActivities } from "@/lib/python-data";
import { PythonActivitySettings } from "@/components/python-forms";
import pythonStyles from "@/components/python.module.css";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getAdminContext, displayStatus } from "@/lib/admin-data";
import {
  saveAdminEntity,
  setAdminEntityStatus,
  resetManagedPassword,
  deleteAdminEntity,
} from "@/app/actions/admin";
import { sectionLabel } from "@/lib/section-label";
import { AdminHero, Alerts } from "@/components/admin-ui";
const configs: any = {
  teachers: {
    label: "Teachers",
    description:
      "Create accounts, edit details, or archive access while preserving history.",
    fields: ["teacher_id", "name", "email"],
  },
  students: {
    label: "Students",
    description:
      "Create accounts, edit details, or archive access while preserving history.",
    fields: [
      "name",
      "email",
      "username",
      "class_id",
    ],
  },
  classes: {
    label: "Sections",
    description:
      "Organize your school’s learning environment and assign an active teacher.",
    fields: ["name", "subject", "school_year", "description", "teacher_id"],
  },
  lessons: {
    label: "Lessons",
    description:
      "Create and edit lessons, archive them while preserving history, or permanently delete an unused lesson.",
    fields: [
      "title",
      "description",
      "learning_objective",
      "content",
      "order_number",
    ],
  },
  levels: {
    label: "Levels",
    description:
      "Manage lesson placement, descriptions, difficulty, visibility, and starter code. Delete unused levels or archive levels with history. Playable maps remain in Unity.",
    fields: [
      "lesson_id",
      "level_number",
      "order_in_lesson",
      "title",
      "description",
      "difficulty",
      "active",
      "build_available",
    ],
  },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ entity }, q, ctx, jar] = await Promise.all([
      params,
      searchParams,
      getAdminContext(),
      cookies(),
    ]),
    config = configs[entity];
  if (!config) notFound();
  const sections = [...ctx.classes].sort((a, b) =>
    sectionLabel(a).localeCompare(sectionLabel(b)),
  );
  const teachers = ctx.profiles.filter((p) => p.role === "teacher")
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const schoolYears = [...new Set<string>(sections
    .map((section) => String(section.school_year || ""))
    .filter(Boolean))].sort().reverse();
  const sectionFilter = ["students", "teachers"].includes(entity) &&
    (q.section === "assigned" || q.section === "unassigned" ||
      sections.some((section) => String(section.id) === q.section))
    ? q.section! : "all";
  const teacherFilter = entity === "classes" &&
    (q.teacher === "unassigned" || teachers.some((teacher) => String(teacher.id) === q.teacher))
    ? q.teacher! : "all";
  const yearFilter = entity === "classes" &&
    (q.year === "unspecified" || schoolYears.includes(q.year || ""))
    ? q.year! : "all";
  const hasExtraFilters = sectionFilter !== "all" || teacherFilter !== "all" || yearFilter !== "all";
  const studentSections = new Map<string, Set<string>>();
  for (const membership of ctx.class_students) {
    const studentId = String(membership.student_id);
    const assigned = studentSections.get(studentId) || new Set<string>();
    assigned.add(String(membership.class_id));
    studentSections.set(studentId, assigned);
  }
  const teacherSections = new Map<string, Set<string>>();
  for (const section of sections) {
    if (!section.teacher_id) continue;
    const teacherId = String(section.teacher_id);
    const assigned = teacherSections.get(teacherId) || new Set<string>();
    assigned.add(String(section.id));
    teacherSections.set(teacherId, assigned);
  }
  const role =
      entity === "teachers"
        ? "teacher"
        : entity === "students"
          ? "student"
          : null,
    all = role
      ? ctx.profiles.filter((p) => p.role === role)
      : (ctx as any)[entity],
    supportsStatusFilter = ["teachers", "students", "classes"].includes(entity),
    statusFilter = supportsStatusFilter
      ? q.status === "archived" || q.status === "all"
        ? q.status
        : "active"
      : "all",
    term = (q.search || "").trim().toLowerCase(),
    rows = all.filter((r: any) => {
      if (statusFilter !== "all" && displayStatus(r, entity) !== statusFilter) return false;
      if (term && !Object.values(r).some((v) =>
        String(v ?? "").toLowerCase().includes(term),
      )) return false;
      if (sectionFilter !== "all") {
        const assigned = (entity === "students" ? studentSections : teacherSections).get(String(r.id));
        if (sectionFilter === "assigned" && !assigned?.size) return false;
        if (sectionFilter === "unassigned" && assigned?.size) return false;
        if (!["assigned", "unassigned"].includes(sectionFilter) && !assigned?.has(sectionFilter)) return false;
      }
      if (teacherFilter === "unassigned" && r.teacher_id) return false;
      if (!["all", "unassigned"].includes(teacherFilter) && String(r.teacher_id) !== teacherFilter) return false;
      if (yearFilter === "unspecified" && r.school_year) return false;
      if (!["all", "unspecified"].includes(yearFilter) && String(r.school_year) !== yearFilter) return false;
      return true;
    }),
    editing = q.edit
      ? q.edit === "new"
        ? {}
        : all.find((r: any) => String(r.id) === q.edit)
      : null;
  const pythonActivity =
    entity === "lessons" && editing?.id
      ? (await getPythonActivities())?.find((a) => a.lesson_id === editing.id)
      : null;
  let flash: any = null;
  try {
    flash = JSON.parse(jar.get("kc_admin_flash")?.value || "null");
  } catch {}
  return (
    <>
      <AdminHero title={config.label} description={config.description}>
        <div className="admin-hero-actions">
          {entity === "students" && (
            <Link className="teacher-btn" href="/admin/import/students">
              Import students
            </Link>
          )}
          {entity === "teachers" && (
            <Link className="teacher-btn" href="/admin/import">
              Import teachers
            </Link>
          )}
          <Link
            className="teacher-btn primary"
            href={"/admin/manage/" + entity + "?edit=new"}
          >
            Create{" "}
            {entity === "classes" ? "Section" : config.label.slice(0, -1)}
          </Link>
        </div>
      </AdminHero>
      <Alerts q={q} />
      {flash && (
        <div className="teacher-alert success">
          ✓ {flash.message}{" "}
          {flash.password && (
            <>
              <strong className="admin-secret">{flash.password}</strong>{" "}
              <span>
                {flash.emailSent
                  ? "Emailed successfully."
                  : "Copy it now; automatic email was not sent."}
              </span>
            </>
          )}
        </div>
      )}
      {editing && (
        <Editor entity={entity} config={config} record={editing} ctx={ctx} />
      )}
      {entity === "lessons" && editing && !editing.id && (
        <p className="teacher-alert">Save the lesson first, then open Edit to add its Python activity.</p>
      )}
      {entity === "lessons" && editing?.id && (
        <div className={pythonStyles.root}>
          <section className={pythonStyles.card}>
            <h2>Lesson Python activity</h2>
            <p>
              A published activity is included when this lesson is assigned and
              unlocks after its available game levels. Coming Soon levels do not
              block access. Earlier Runs keep their original instructions.
            </p>
            {pythonActivity ? (
              <PythonActivitySettings
                key={pythonActivity.id + ":" + pythonActivity.revision}
                activity={pythonActivity}
              />
            ) : (
              <>
                <p>This lesson has no Python activity yet. Add its instructions, starter code, and practice examples below.</p>
                <PythonActivitySettings key={"new:" + editing.id} lessonId={editing.id} />
              </>
            )}
          </section>
        </div>
      )}
      <section className="teacher-card">
        <form
          key={JSON.stringify([entity, statusFilter, sectionFilter, teacherFilter, yearFilter, q.search])}
          className="teacher-filterbar"
          method="get"
          action={"/admin/manage/" + entity}
        >
          <label>
            Search {config.label.toLowerCase()}
            <input
              name="search"
              defaultValue={q.search || ""}
              placeholder="Search by name, ID, email, or title"
            />
          </label>
          {supportsStatusFilter && (
            <label>
              Status
              <select name="status" defaultValue={statusFilter}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All records</option>
              </select>
            </label>
          )}
          {["students", "teachers"].includes(entity) && (
            <label>
              Section assignment
              <select name="section" defaultValue={sectionFilter}>
                <option value="all">All assignments</option>
                <option value="assigned">Has a section</option>
                <option value="unassigned">No section assigned</option>
                {sections.map((section) => (
                  <option key={section.id} value={String(section.id)}>
                    {sectionLabel(section)}{section.school_year ? " - " + section.school_year : ""}
                    {section.status === "archived" ? " (archived)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {entity === "classes" && (
            <>
              <label>
                Assigned teacher
                <select name="teacher" defaultValue={teacherFilter}>
                  <option value="all">All teachers</option>
                  <option value="unassigned">No teacher assigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={String(teacher.id)}>
                      {teacher.name}{teacher.teacher_id ? " - " + teacher.teacher_id : ""}
                      {!teacher.active ? " (archived)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                School year
                <select name="year" defaultValue={yearFilter}>
                  <option value="all">All school years</option>
                  <option value="unspecified">Not specified</option>
                  {schoolYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button type="submit" className="teacher-btn">
            {supportsStatusFilter ? "Apply filters" : "Search"}
          </button>
          {(q.search || hasExtraFilters || (supportsStatusFilter && statusFilter !== "active")) && (
            <Link className="teacher-btn" href={"/admin/manage/" + entity}>
              Clear
            </Link>
          )}
        </form>
        <div className="teacher-table-wrap">
          <table className={"teacher-table admin-record-table" + (entity === "levels" ? " admin-level-table" : "")}>
            <thead>
              <tr>
                <th>Name / Title</th>
                <th>{entity === "levels" ? "Lesson" : "Details"}</th>
                <th>Status</th>
                {entity === "levels" && <th>Game</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r: any) => (
                  <RecordRow key={r.id} entity={entity} row={r} ctx={ctx} />
                ))
              ) : (
                <tr>
                  <td colSpan={entity === "levels" ? 5 : 4}>
                    <div className="teacher-empty">
                      {supportsStatusFilter
                        ? "No records match these filters. Change your filters or use Clear to reset them."
                        : "No records found."}
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
function Editor({
  entity,
  config,
  record,
  ctx,
}: {
  entity: string;
  config: any;
  record: any;
  ctx: any;
}) {
  return (
    <section className="teacher-card admin-form-section">
      <div className="teacher-card-head">
        <div>
          <span className="teacher-eyebrow">RECORD DETAILS</span>
          <h3>
            {record.id ? "Edit" : "Create"}{" "}
            {entity === "classes" ? "Section" : config.label.slice(0, -1)}
          </h3>
        </div>
        <Link href={"/admin/manage/" + entity}>Cancel</Link>
      </div>
      {/* Reset uncontrolled fields whenever the selected record changes. */}
      <form
        key={`${entity}:${record.id ?? "new"}`}
        action={saveAdminEntity}
        className="admin-form"
      >
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={record.id || ""} />
        {config.fields.map((field: string) => (
          <Field
            key={field}
            field={field}
            entity={entity}
            value={
              field === "class_id"
                ? ctx.class_students.find(
                    (m: any) => m.student_id === record.id,
                  )?.class_id
                : field === "name" && entity === "classes" && record.name
                  ? sectionLabel(record)
                  : record[field]
            }
            ctx={ctx}
            editing={!!record.id}
          />
        ))}
        {entity === "levels" && (
          <fieldset className="wide">
            <legend>Starter code</legend>
            <label className="admin-check">
              <input
                type="checkbox"
                name="starter_code_enabled"
                value="1"
                defaultChecked={record.starter_code_enabled}
              />{" "}
              Use starter code for this level
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                name="starter_code_locked"
                value="1"
                defaultChecked={record.starter_code_locked ?? true}
              />{" "}
              Lock supplied starter code
            </label>
            <label>
              Code template
              <textarea
                className="admin-level-code"
                name="starter_code_template"
                defaultValue={record.starter_code_template || ""}
                placeholder={"if {{condition}}:\n    {{body}}"}
              />
              <small>
                Students receive this directly in the original game terminal.
              </small>
            </label>
          </fieldset>
        )}
        <button className="teacher-btn primary">Save changes</button>
      </form>
    </section>
  );
}
function Field({
  field,
  entity,
  value,
  ctx,
  editing,
}: {
  field: string;
  entity: string;
  value: any;
  ctx: any;
  editing: boolean;
}) {
  const label =
      field === "name" && entity === "classes"
        ? "Section name"
        : field === "teacher_id" && entity === "classes"
          ? "Assigned teacher"
          : field === "level_number"
            ? "Unity scene number"
            : field
                .replaceAll("_", " ")
                .replace(/\b\w/g, (x) => x.toUpperCase()),
    wide = ["content", "description", "learning_objective"].includes(field);
  if (field === "build_available") return <label><input type="checkbox" name={field} value="1" defaultChecked={value === true} />Included in the current game build<small>Enable only after deploying this Unity scene. Otherwise it shows Coming Soon and does not block Python.</small></label>;
  if (field === "class_id")
    return (
      <label>
        Section
        <select name="class_id" defaultValue={value || ""}>
          <option value="">Not assigned to a section</option>
          {ctx.classes
            .filter(
              (c: any) =>
                c.id === value ||
                (c.status === "active" &&
                  ctx.profiles.some(
                    (p: any) =>
                      p.id === c.teacher_id && p.active && p.role === "teacher",
                  )),
            )
            .map((c: any) => (
              <option key={c.id} value={c.id}>
                {sectionLabel(c)} -{" "}
                {ctx.profiles.find((p: any) => p.id === c.teacher_id)?.name ||
                  "No teacher"}
                {c.school_year ? ` (${c.school_year})` : ""}
              </option>
            ))}
        </select>
        <small>
          One section and one teacher per student. Changing this transfers the
          student and preserves learning history.
        </small>
      </label>
    );
  if (field === "teacher_id" && entity === "classes")
    return (
      <label key={field}>
        {label}
        <select name={field} required defaultValue={value || ""}>
          <option value="">Choose teacher</option>
          {ctx.profiles
            .filter((p: any) => p.role === "teacher" && p.active)
            .map((p: any) => (
              <option value={p.id} key={p.id}>
                {p.name} · {p.teacher_id}
              </option>
            ))}
        </select>
      </label>
    );
  if (field === "lesson_id")
    return (
      <label>
        {label}
        <select name={field} required defaultValue={value || ""}>
          <option value="">Choose lesson</option>
          {ctx.lessons.map((l: any) => (
            <option value={l.id} key={l.id}>
              {l.order_number}. {l.title}
            </option>
          ))}
        </select>
      </label>
    );
  if (field === "difficulty")
    return (
      <label>
        {label}
        <select name={field} defaultValue={value || "Beginner"}>
          {["Beginner", "Intermediate", "Advanced"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
    );
  if (field === "active")
    return (
      <label className="admin-check">
        <input
          type="checkbox"
          name="active"
          value="1"
          defaultChecked={value ?? true}
        />{" "}
        Visible to learners
      </label>
    );
  if (entity === "lessons" && field === "content") return <LessonEditor initialContent={String(value || "")} />;
  if (wide)
    return (
      <label className="wide">
        {label}
        <textarea
          name={field}
          rows={field === "content" ? 14 : 4}
          defaultValue={value || ""}
        />
        {field === "content" && (
          <small>
            Safe headings, paragraphs, lists, tables, and code markup are
            supported. Scripts and attributes are removed.
          </small>
        )}
      </label>
    );
  const numeric = ["order_number", "level_number", "order_in_lesson"].includes(
    field,
  );
  return (
    <label>
      {label}
      <input
        name={field}
        type={field === "email" ? "email" : numeric ? "number" : "text"}
        min={numeric ? 1 : undefined}
        defaultValue={
          value ?? ""
        }
        readOnly={field === "level_number" && editing}
        required={
          ![
            "username",
            "class_id",
            "subject",
            "school_year",
            "description",
          ].includes(field)
        }
      />
    </label>
  );
}
function RecordRow({
  entity,
  row,
  ctx,
}: {
  entity: string;
  row: any;
  ctx: any;
}) {
  const name = entity === "classes" ? sectionLabel(row) : row.name || row.title,
    identifier =
      entity === "classes"
        ? [row.subject, row.school_year].filter(Boolean).join(" - ")
        : row.teacher_id ||
          (entity === "students" ? row.username || row.email : null) ||
          (entity === "lessons"
            ? "Order " + row.order_number
            : "Scene " + row.level_number),
    detail =
      entity === "classes"
        ? ctx.profiles.find((p: any) => p.id === row.teacher_id)?.name ||
          "No teacher"
        : entity === "levels"
          ? ctx.lessons.find((l: any) => l.id === row.lesson_id)?.title ||
            "No lesson"
          : row.email || row.description || "",
    status = displayStatus(row, entity),
    archived = ["archived", "hidden"].includes(status);
  return (
    <tr>
      <td>
        <strong className="admin-record-name">{name}</strong>
        <small className="admin-record-id">{identifier}</small>
      </td>
      <td>
        {entity === "lessons" && detail.length > 140 ? (
          <details className="admin-record-description">
            <summary>{detail.slice(0, 140).trimEnd()}... <span>Read more</span></summary>
            <p>{detail}</p>
          </details>
        ) : detail}
      </td>
      <td>
        <span className={"admin-status " + (archived ? "is-archived" : "")}>
          {status}
        </span>
      </td>
      {entity === "levels" && <td className="admin-level-preview"><GamePreviewButton level={row} /></td>}
      <td>
        <div className="admin-actions admin-record-actions">

          <Link
            className="teacher-btn admin-edit"
            href={"/admin/manage/" + entity + "?edit=" + row.id}
          >
            Edit
          </Link>
          {entity === "classes" && (
            <Link className="teacher-btn" href={"/admin/classes/" + row.id}>
              Roster
            </Link>
          )}
          {entity !== "levels" && (<form action={setAdminEntityStatus}>
            <input type="hidden" name="entity" value={entity} />
            <input type="hidden" name="id" value={row.id} />
            <input
              type="hidden"
              name="restore"
              value={archived ? "1" : "0"}
            />
            {entity === "classes" ? <SectionArchiveButton archived={archived} name={String(name)} className="teacher-btn" /> : <button className="teacher-btn">{archived ? "Restore" : "Archive"}</button>}
          </form>)}
          {["teachers", "students", "classes", "lessons", "levels"].includes(entity) && (
            <AdminRecordActions name={String(name)}>
                {entity === "levels" && (
                  <form action={setAdminEntityStatus}>
                    <input type="hidden" name="entity" value={entity} />
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="restore" value={archived ? "1" : "0"} />
                    <button className="teacher-btn">{archived ? "Restore" : "Archive"}</button>
                  </form>
                )}
                {["teachers", "students"].includes(entity) && (
                  <details>
                    <summary>Reset password</summary>
                    <form action={resetManagedPassword} className="admin-form">
                      <input type="hidden" name="entity" value={entity} />
                      <input type="hidden" name="id" value={row.id} />
                      <button className="teacher-btn">
                        Generate temporary password
                      </button>
                    </form>
                  </details>
                )}
                {["teachers", "students", "classes", "lessons", "levels"].includes(entity) && (
                  <details>
                    <summary>Delete permanently</summary>
                    <form
                      action={deleteAdminEntity}
                      className="admin-form admin-confirm"
                    >
                      <input type="hidden" name="entity" value={entity} />
                      <input type="hidden" name="id" value={row.id} />
                      <small>
                        {entity === "lessons"
                          ? "Only unused lessons can be deleted. Linked levels, assignments, Python activities, or recorded lesson visits block deletion. Archive the lesson to preserve these records."
                          : entity === "levels"
                            ? "Only unused levels can be deleted. Level or whole-lesson assignments and student history block deletion. Archive the level to preserve these records. Deleting this record does not remove its Unity scene."
                            : entity === "teachers"
                              ? "Teachers with sections, assignments, announcements, Python reviews, or other linked records cannot be deleted. Archive the account to preserve these records."
                              : "This also removes linked records."}
                      </small>
                      {["lessons", "levels", "teachers"].includes(entity) && (
                        <label className="admin-check">
                          <input type="checkbox" name="confirm_delete" value="1" required />
                          Permanently delete this unused {entity === "teachers" ? "teacher account" : entity === "levels" ? "level" : "lesson"}
                        </label>
                      )}
                      <button className="teacher-btn admin-delete">
                        Confirm delete
                      </button>
                    </form>
                  </details>
                )}
            </AdminRecordActions>
          )}
        </div>
      </td>
    </tr>
  );
}

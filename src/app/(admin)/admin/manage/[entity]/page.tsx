/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getAdminContext, displayStatus } from "@/lib/admin-data";
import {
  saveAdminEntity,
  setAdminEntityStatus,
  resetManagedPassword,
  deleteAdminEntity,
} from "@/app/actions/admin";
import { AdminHero, Alerts } from "@/components/admin-ui";
const configs: any = {
  teachers: {
    label: "Teachers",
    description:
      "Create accounts, edit details, or archive access while preserving history.",
    fields: ["teacher_id", "name", "email", "school_code"],
  },
  students: {
    label: "Students",
    description:
      "Create accounts, edit details, or archive access while preserving history.",
    fields: [
      "student_id",
      "name",
      "email",
      "username",
      "school_code",
      "class_section",
    ],
  },
  classes: {
    label: "Classes",
    description:
      "Organize your school’s learning environment and assign an active teacher.",
    fields: [
      "name",
      "section",
      "subject",
      "school_year",
      "description",
      "teacher_id",
    ],
  },
  lessons: {
    label: "Lessons",
    description:
      "Shape the programming curriculum without changing the Unity game build.",
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
      "Manage lesson placement, descriptions, difficulty, visibility, and starter code. Playable maps remain in Unity.",
    fields: [
      "lesson_id",
      "level_number",
      "order_in_lesson",
      "title",
      "description",
      "difficulty",
      "active",
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
  const role =
      entity === "teachers"
        ? "teacher"
        : entity === "students"
          ? "student"
          : null,
    all = role
      ? ctx.profiles.filter((p) => p.role === role)
      : (ctx as any)[entity],
    term = (q.search || "").toLowerCase(),
    rows = term
      ? all.filter((r: any) =>
          Object.values(r).some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(term),
          ),
        )
      : all,
    editing = q.edit
      ? q.edit === "new"
        ? {}
        : all.find((r: any) => String(r.id) === q.edit)
      : null;
  let flash: any = null;
  try {
    flash = JSON.parse(jar.get("kc_admin_flash")?.value || "null");
  } catch {}
  return (
    <>
      <AdminHero title={config.label} description={config.description}>
        <div className="admin-hero-actions">
          {entity === "teachers" && (
            <Link className="teacher-btn" href="/admin/import">
              Import teachers
            </Link>
          )}
          <Link
            className="teacher-btn primary"
            href={"/admin/manage/" + entity + "?edit=new"}
          >
            Create {entity === "classes" ? "Class" : config.label.slice(0, -1)}
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
      <section className="teacher-card">
        <form className="teacher-filterbar">
          <label>
            Search {config.label.toLowerCase()}
            <input
              name="search"
              defaultValue={q.search || ""}
              placeholder="Search by name, ID, email, or title"
            />
          </label>
          <button className="teacher-btn">Search</button>
          {q.search && (
            <Link className="teacher-btn" href={"/admin/manage/" + entity}>
              Clear
            </Link>
          )}
        </form>
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Name / Title</th>
                <th>Details</th>
                <th>Status</th>
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
                  <td colSpan={4}>
                    <div className="teacher-empty">No records found.</div>
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
            {entity === "classes" ? "Class" : config.label.slice(0, -1)}
          </h3>
        </div>
        <Link href={"/admin/manage/" + entity}>Cancel</Link>
      </div>
      <form action={saveAdminEntity} className="admin-form">
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={record.id || ""} />
        {config.fields.map((field: string) => (
          <Field
            key={field}
            field={field}
            entity={entity}
            value={record[field]}
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
      field === "level_number"
        ? "Unity scene number"
        : field.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase()),
    wide = ["content", "description", "learning_objective"].includes(field);
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
          value ?? (field === "school_code" ? "KNIGHTCODE-DEMO" : "")
        }
        readOnly={field === "level_number" && editing}
        required={
          !["username", "class_section", "school_year", "description"].includes(
            field,
          )
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
  const name = row.name || row.title,
    identifier =
      row.teacher_id ||
      row.student_id ||
      (entity === "classes"
        ? row.section
        : entity === "lessons"
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
      <td>{detail}</td>
      <td>
        <span className={"admin-status " + (archived ? "is-archived" : "")}>
          {status}
        </span>
      </td>
      <td>
        <div className="admin-actions">
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
          {entity !== "lessons" && (
            <form action={setAdminEntityStatus}>
              <input type="hidden" name="entity" value={entity} />
              <input type="hidden" name="id" value={row.id} />
              <input
                type="hidden"
                name="restore"
                value={archived ? "1" : "0"}
              />
              <button className="teacher-btn">
                {archived ? "Restore" : "Archive"}
              </button>
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
          {["teachers", "students", "classes"].includes(entity) && (
            <details>
              <summary>Delete permanently</summary>
              <form
                action={deleteAdminEntity}
                className="admin-form admin-confirm"
              >
                <input type="hidden" name="entity" value={entity} />
                <input type="hidden" name="id" value={row.id} />
                <small>This also removes linked records.</small>
                <button className="teacher-btn admin-delete">
                  Confirm delete
                </button>
              </form>
            </details>
          )}
        </div>
      </td>
    </tr>
  );
}

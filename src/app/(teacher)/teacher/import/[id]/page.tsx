/* eslint-disable @typescript-eslint/no-explicit-any */
import { sectionLabel } from "@/lib/section-label";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { issues, type ImportRow } from "@/lib/import-utils";
import { cancelImport, confirmImport } from "@/app/actions/teacher-import";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, q, t] = await Promise.all([
      params,
      searchParams,
      requireTeacher(),
    ]),
    admin = createAdminClient(),
    { data: batch } = await admin
      .from("teacher_import_batches")
      .select("*,sections(name,section)")
      .eq("id", id)
      .eq("teacher_id", t.id)
      .maybeSingle();
  if (!batch || new Date(batch.expires_at) < new Date()) notFound();
  const result = batch.result as any;
  if (q.done && result)
    return (
      <>
        <section className="teacher-page-hero compact">
          <div>
            <span className="teacher-eyebrow">IMPORT COMPLETE</span>
            <h2>Students added successfully</h2>
            <p>
              {result.created.length} new accounts created and{" "}
              {result.existing.length} existing accounts linked.
            </p>
          </div>
          <a className="teacher-btn primary" href="/teacher/classes">
            Back to Sections
          </a>
        </section>
        <section className="teacher-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">ONE-TIME CREDENTIALS</span>
              <h3>New student accounts</h3>
            </div>
          </div>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Temporary Password</th>
                  <th>Email Sent</th>
                </tr>
              </thead>
              <tbody>
                {result.created.map((r: any) => (
                  <tr key={r.student_id}>
                    <td>{r.student_id}</td>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td>
                      <code>{r.temp_password}</code>
                    </td>
                    <td>
                      <span
                        className={
                          "status-badge " + (r.email_sent ? "on" : "muted")
                        }
                      >
                        {r.email_sent ? "Sent" : "Not sent"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="teacher-note">
            Temporary passwords are shown only in this result. For any row
            marked Not sent, share the password securely with that student.
          </p>
        </section>
      </>
    );
  const rows = batch.rows as ImportRow[],
    seen = new Set<string>(),
    preview = rows.map((r, i) => ({
      row: i + 2,
      data: r,
      issues: issues(r, seen),
    }));
  const valid = preview.filter((r) => !r.issues.length).length;
  return (
    <>
      <section className="teacher-page-hero compact">
        <div>
          <span className="teacher-eyebrow">IMPORT PREVIEW</span>
          <h2>Review before creating accounts</h2>
          <p>
            {rows.length} records detected for{" "}
            {batch.classes
              ? sectionLabel(batch.classes as any)
              : "the selected section"}
            .
          </p>
        </div>
      </section>
      <div className="teacher-metric-grid four">
        <Metric label="Total Records" value={rows.length} />
        <Metric label="Valid" value={valid} />
        <Metric
          label="Invalid / Duplicate"
          value={rows.length - valid}
          warning
        />
        <Metric label="Existing Accounts" value="checked on import" />
      </div>
      <section className="teacher-card">
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.row}>
                  <td>{r.row}</td>
                  <td>{r.data.student_id}</td>
                  <td>{r.data.name}</td>
                  <td>{r.data.email}</td>
                  <td>
                    {r.issues.length ? (
                      <span className="status-badge needs">
                        {r.issues.join(" · ")}
                      </span>
                    ) : (
                      <span className="status-badge on">
                        Valid · New or Link
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="teacher-form-actions"
          style={{ justifyContent: "space-between" }}
        >
          <form action={cancelImport}>
            <input type="hidden" name="batch_id" value={id} />
            <button className="teacher-btn">Cancel</button>
          </form>
          {valid > 0 && (
            <form action={confirmImport}>
              <input type="hidden" name="batch_id" value={id} />
              <button className="teacher-btn primary">
                Continue with valid records →
              </button>
            </form>
          )}
        </div>
      </section>
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

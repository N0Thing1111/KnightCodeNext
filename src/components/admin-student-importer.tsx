"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { importAdminStudents } from "@/app/actions/admin-student-import";
import { parseStudentCsv, studentImportIssues, type AdminStudentImportState, type ImportSection } from "@/lib/admin-student-import";
import type { ImportRow } from "@/lib/import-utils";

export function AdminStudentImporter({ sections }: { sections: ImportSection[] }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [state, action, pending] = useActionState<AdminStudentImportState, FormData>(importAdminStudents, {});
  const section = sections.find(row => String(row.id) === sectionId);
  const issues = studentImportIssues(rows, section);
  async function choose(file?: File) {
    setRows([]); setError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 1024 * 1024) { setError("Choose a CSV file no larger than 1 MB."); return; }
    setReading(true);
    try { setRows(parseStudentCsv(await file.text())); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not read CSV."); }
    finally { setReading(false); }
  }
  if (state.result) return <section className="teacher-card">
    <h2>Student import results</h2>
    {state.error && <p className="teacher-alert error" role="alert">{state.error}</p>}
    <p>{state.result.created.length} accounts created; {state.result.existing.length} existing students linked or already enrolled; {state.result.errors.length} errors.</p>
    <p>Copy any undelivered passwords before leaving. They are shown once here and are not stored in the results. Existing accounts keep their passwords.</p>
    {state.result.created.length > 0 && <div className="teacher-table-wrap"><table className="teacher-table">
      <thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Temporary password</th><th>Email status</th></tr></thead>
      <tbody>{state.result.created.map(row => <tr key={row.student_id}><td>{row.student_id}</td><td>{row.name}</td><td>{row.email}</td><td><code>{row.temp_password}</code></td><td>{row.email_sent ? "Sent" : "Not sent — share securely"}</td></tr>)}</tbody>
    </table></div>}
    {state.result.existing.length > 0 && <p>Existing students: {state.result.existing.map(row => `${row.name} (${row.student_id})`).join(", ")}</p>}
    {state.result.errors.map((row, index) => <p className="teacher-alert error" key={index}>{row.student_id}: {row.issue}</p>)}
    <Link href="/admin/manage/students" className="teacher-btn">Back to Students</Link>
  </section>;
  return <>
    <section className="teacher-card">
      <h2>Import students from CSV</h2>
      <p>Import up to 100 students into one section. Its assigned teacher will manage these students. Existing accounts keep their passwords, and students in another section will not be moved.</p>
      <p>Required columns: <code>student_id,name,email</code>. Optional: <code>username,section</code>. If provided, the CSV section must match your selection.</p>
      <p><a className="teacher-btn" href="/templates/admin-students.csv" download>Download CSV template</a></p>
      {sections.length === 0 ? <p className="teacher-alert">Create an active section with an active teacher before importing. <Link href="/admin/manage/classes">Manage sections</Link></p> : <>
        <label className="admin-file-label">Section and teacher
          <select value={sectionId} disabled={pending} onChange={event => setSectionId(event.target.value)}>
            <option value="">Choose a section</option>
            {sections.map(row => <option key={row.id} value={row.id}>{row.label} — {row.teacher}</option>)}
          </select>
        </label>
        <label className="admin-file-label">Student CSV
          <input type="file" accept=".csv,text/csv" disabled={pending || reading} onChange={event => choose(event.target.files?.[0])} />
        </label>
      </>}
      {reading && <p role="status">Reading CSV...</p>}
      {error && <p className="teacher-alert error" role="alert">{error}</p>}
    </section>
    {rows.length > 0 && <section className="teacher-card">
      <h3>Review {rows.length} students{section ? ` for ${section.label}` : ""}</h3>
      <div className="teacher-table-wrap"><table className="teacher-table">
        <thead><tr><th>Row</th><th>Student ID</th><th>Name</th><th>Email</th><th>Username</th><th>Validation</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}><td>{index + 2}</td><td>{row.student_id}</td><td>{row.name}</td><td>{row.email}</td><td>{row.username || "—"}</td><td>{issues[index].join("; ") || "Ready"}</td></tr>)}</tbody>
      </table></div>
      <form action={action}>
        <input type="hidden" name="class_id" value={sectionId} />
        <input type="hidden" name="rows" value={JSON.stringify(rows)} />
        <p>Confirming creates new accounts and sends their temporary passwords to the supplied emails.</p>
        <button className="teacher-btn primary" disabled={pending || reading || !section || issues.some(row => row.length > 0)}>{pending ? "Importing students and sending email..." : "Confirm student import"}</button>
        {state.error && <p className="teacher-alert error" role="alert">{state.error}</p>}
      </form>
    </section>}
  </>;
}

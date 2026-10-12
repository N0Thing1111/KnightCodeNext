"use client";
import { useActionState } from "react";
import { confirmImport, type StudentImportState } from "@/app/actions/teacher-import";
export function ImportConfirmForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<StudentImportState, FormData>(confirmImport, {});
  if (state.result) return <section className="teacher-card">
    <h3>Import finished</h3>
    {state.error && <p className="teacher-alert error" role="alert">{state.error}</p>}
    <p>{state.result.created.length} created; {state.result.existing.length} linked; {state.result.errors.length} errors.</p>
    <p>Copy any undelivered passwords before leaving. Passwords appear only here and are not stored in the import results. If you lose one, use the student&apos;s password reset action.</p>
    <div className="teacher-table-wrap"><table className="teacher-table"><thead><tr><th>Student</th><th>Email</th><th>Temporary password</th><th>Email status</th></tr></thead><tbody>
      {state.result.created.map(r => <tr key={r.student_id}><td>{r.name} ({r.student_id})</td><td>{r.email}</td><td><code>{r.temp_password}</code></td><td>{r.email_sent ? "Sent" : "Not sent — share securely"}</td></tr>)}
    </tbody></table></div>
    {state.result.errors.map((r,i) => <p role="alert" key={i}>{r.student_id}: {r.issue}</p>)}
    <a href="/teacher/classes" className="teacher-btn">Back to Sections</a>
  </section>;
  return <form action={action}><input type="hidden" name="batch_id" value={id}/><button className="teacher-btn primary" disabled={pending}>{pending ? "Creating accounts and sending email..." : "Continue with valid records"}</button>{state.error && <p role="alert">{state.error}</p>}</form>;
}

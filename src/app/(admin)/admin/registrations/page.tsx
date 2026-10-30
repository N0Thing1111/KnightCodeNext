import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewTeacher } from "@/app/actions/enrollment";
export default async function Page({searchParams}:{searchParams:Promise<{notice?:string;error?:string}>}) {
 await requireAdmin();const q=await searchParams;const result=await createAdminClient().from("profiles").select("id,name,email,created_at").eq("role","teacher").eq("onboarding_status","pending").order("created_at");
 return <><h1>Teacher registrations</h1><p>Approve verified education-email accounts after confirming that the applicant is a teacher. An education email alone does not prove their role.</p>
 {q.error&&<p className="alert alert-error" role="alert">{q.error}</p>}{q.notice&&<p role="status">{q.notice}</p>}
 <section className="teacher-card">{result.error ? <p>Registration setup is not available yet.</p> : !result.data.length ? <p>No pending registrations.</p> : <div className="teacher-table-wrap"><table className="teacher-table"><thead><tr><th>Name</th><th>Education email</th><th>Decision</th></tr></thead><tbody>{result.data.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.email}</td><td><form action={reviewTeacher} className="admin-actions"><input type="hidden" name="teacher_id" value={p.id}/><button className="teacher-btn" name="decision" value="approve">Approve verified account</button><button className="teacher-btn" name="decision" value="reject">Reject</button></form></td></tr>)}</tbody></table></div>}</section></>;
}

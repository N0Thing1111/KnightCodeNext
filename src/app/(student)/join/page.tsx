import { requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelEnrollment,requestEnrollment } from "@/app/actions/enrollment";
export default async function Page({searchParams}:{searchParams:Promise<{notice?:string;error?:string}>}) {
 const student=await requireStudent();const q=await searchParams;const db=createAdminClient();
 const membership=await db.from("class_students").select("class_id,classes(name)").eq("student_id",student.id).maybeSingle();
 const pending=await db.from("enrollment_requests").select("id,status,classes(name)").eq("student_id",student.id).eq("status","pending").maybeSingle();
 return <section className="panel"><h1>Your class</h1>
 {q.error&&<p className="alert alert-error" role="alert">{q.error}</p>}{q.notice&&<p role="status">{q.notice}</p>}
 {membership.error||pending.error ? <p>Enrollment is temporarily unavailable.</p> : membership.data ? <><p>You are enrolled in {student.class_section || "your assigned class"}.</p><p>You can belong to one class at a time. Contact platform support if you need a transfer.</p></> : pending.data ? <><p>Your enrollment request is waiting for teacher approval.</p><form action={cancelEnrollment}><input type="hidden" name="request_id" value={pending.data.id}/><button className="teacher-btn">Cancel request</button></form></> : <><p>Enter the invitation code supplied by your teacher. You will join the class after the teacher approves your request.</p><form action={requestEnrollment} className="auth-form"><label>Class code<input name="code" required minLength={16} maxLength={16} autoComplete="off"/></label><button className="btn btn-primary">Request to join</button></form></>}
 </section>;
}

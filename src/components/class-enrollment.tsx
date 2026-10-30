import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewEnrollment,rotateClassCode } from "@/app/actions/enrollment";
export async function ClassEnrollment({classId}:{classId:number}) {
 const teacher=await requireTeacher();const db=createAdminClient();
 const cls=await db.from("classes").select("id,status,join_code").eq("id",classId).eq("teacher_id",teacher.id).maybeSingle();
 if(cls.error) return <section className="teacher-form" id="enrollment"><h3>Class invitations</h3><p>Enrollment setup is not available yet.</p></section>;
 if(!cls.data)return null;
 const requests=await db.from("enrollment_requests").select("id,student_id").eq("class_id",classId).eq("status","pending").order("created_at");
 const ids=(requests.data||[]).map(r=>r.student_id);
 const students=ids.length ? (await db.from("profiles").select("id,name,email,username").in("id",ids)).data||[] : [];
 return <section className="teacher-form" id="enrollment"><h3>Invite students</h3><p>Students create their own accounts, verify their email, then enter this code under Your class. Approve only students who belong in your class.</p>
 {cls.data.status!=="active" ? <p>This class is archived. Restore it before accepting students.</p> : <>
 {cls.data.join_code&&<p>Class code: <code>{cls.data.join_code}</code></p>}
 <form action={rotateClassCode}><input type="hidden" name="class_id" value={classId}/><button className="teacher-btn">{cls.data.join_code?"Replace invitation code":"Create invitation code"}</button></form>
 <p>Replacing the code stops new requests using the old code. Existing students and pending requests are unchanged.</p>
 <h3>Enrollment requests</h3>{requests.error?<p>Requests could not be loaded.</p>:!ids.length?<p>No pending requests.</p>:<ul>{requests.data!.map(r=>{const s=students.find(s=>s.id===r.student_id);return <li key={r.id}><p><strong>{s?.name||"Student"}</strong> - {s?.email}</p><form action={reviewEnrollment} className="admin-actions"><input type="hidden" name="class_id" value={classId}/><input type="hidden" name="request_id" value={r.id}/><button className="teacher-btn" name="decision" value="accept">Accept</button><button className="teacher-btn" name="decision" value="reject">Reject</button></form></li>;})}</ul>}
 </>}
 </section>;
}

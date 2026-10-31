"use server";
import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStudent, requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
async function finish(path:string,work:()=>Promise<void>) {
 let message="Saved.",key="notice";
 try { await work(); } catch(e) {key="error";message=e instanceof Error?e.message:"Unable to save.";}
 revalidatePath("/","layout");redirect(path+"?"+key+"="+encodeURIComponent(message));
}
export async function rotateClassCode(form:FormData) {
 const actor=await requireTeacher();const classId=Number(form.get("class_id"));
 await finish("/teacher/class/"+classId,async()=>{
  const r=await createAdminClient().from("classes").update({join_code:randomBytes(8).toString("hex").toUpperCase()}).eq("id",classId).eq("teacher_id",actor.id).eq("status","active").select("id").single();
  if(r.error)throw Error("Only an active class you own can accept invitations.");
 });
}
export async function requestEnrollment(form:FormData) {
 const student=await requireStudent();
 await finish("/join",async()=>{
  const db=createAdminClient();const limit=await db.rpc("consume_registration_limit",{p_key:createHash("sha256").update("enroll:"+student.id).digest("hex"),p_max:10});
  if(limit.error||!limit.data)throw Error("Please wait 15 minutes before trying more class codes.");
  const result=await db.rpc("request_class_enrollment",{p_student:student.id,p_code:String(form.get("code")||"").trim()});if(result.error)throw Error(result.error.message);
 });
}
export async function cancelEnrollment(form:FormData) {
 const student=await requireStudent();
 await finish("/join",async()=>{const r=await createAdminClient().from("enrollment_requests").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",String(form.get("request_id"))).eq("student_id",student.id).eq("status","pending");if(r.error)throw Error(r.error.message);});
}
export async function reviewEnrollment(form:FormData) {
 const teacher=await requireTeacher();const classId=Number(form.get("class_id"));
 await finish("/teacher/class/"+classId,async()=>{const r=await createAdminClient().rpc("review_class_enrollment",{p_actor:teacher.id,p_request:String(form.get("request_id")),p_accept:form.get("decision")==="accept"});if(r.error)throw Error(r.error.message);});
}

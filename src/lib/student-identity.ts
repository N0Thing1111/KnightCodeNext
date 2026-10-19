import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
type StudentIdentity = { id: string; email: string; student_id: string | null; role: string; active: boolean };
export async function findStudentAccount(db: ReturnType<typeof createAdminClient>, email: string, studentId: string, excludeId: string | null = null): Promise<StudentIdentity | null> {
  const result = await db.rpc("find_student_account", { p_email: email.trim().toLowerCase(), p_student_id: studentId.trim(), p_exclude: excludeId });
  if (result.error) throw Error(result.error.code === "PGRST202" ? "Apply the single-school account database update before managing students." : result.error.message);
  return result.data as StudentIdentity | null;
}

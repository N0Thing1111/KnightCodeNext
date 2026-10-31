import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
type StudentIdentity = { id: string; email: string; student_id: string | null; role: string; active: boolean };
export async function findStudentAccount(db: ReturnType<typeof createAdminClient>, email: string, excludeId: string | null = null): Promise<StudentIdentity | null> {
  // Keep the legacy RPC argument for deployed-client compatibility; identity is email-based.
  const result = await db.rpc("find_student_account", { p_email: email.trim().toLowerCase(), p_student_id: "", p_exclude: excludeId });
  if (result.error) throw Error(result.error.code === "PGRST202" ? "Apply the centralized account database update before managing students." : result.error.message);
  return result.data as StudentIdentity | null;
}

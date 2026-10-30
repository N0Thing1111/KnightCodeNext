"use server";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportRow } from "@/lib/import-utils";
export type StudentImportState = { error?: string; result?: { created: (ImportRow & { temp_password: string; email_sent: boolean })[]; existing: ImportRow[]; errors: (ImportRow & { issue: string })[] } };
export async function confirmImport(): Promise<StudentImportState> { await requireTeacher(); return {error:"Teacher imports have been replaced by class invitations. Open your class and share its invitation code."}; }
export async function cancelImport(form: FormData) {
  const teacher = await requireTeacher(),
    id = String(form.get("batch_id") || "");
  await createAdminClient()
    .from("teacher_import_batches")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacher.id);
  redirect("/teacher/classes");
}

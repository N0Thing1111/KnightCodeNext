/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { readTransfer, discardTransfer } from "@/lib/backup-transfer";
import { decryptBackup } from "@/lib/admin-backup";
import { restoreSchoolBackup, type RestoreResult } from "@/lib/admin-restore";
async function verify(admin: any, password: string) {
  const s = await createClient(),
    r = await s.auth.signInWithPassword({ email: admin.email, password });
  if (r.error) throw Error("Administrator password is incorrect.");
}
export async function restoreAdminBackup(
  _previous: RestoreResult,
  f: FormData,
): Promise<RestoreResult> {
  const admin = await requireAdmin();
  let result: RestoreResult;
  const transferPath = String(f.get("uploaded_path") || "");
  try {
    await verify(admin, String(f.get("admin_password") || ""));
    if (String(f.get("confirmation") || "") !== "RESTORE SAVE FILE")
      throw Error("Type RESTORE SAVE FILE to confirm.");
    if (!transferPath) throw Error("Upload the save file using the restore form.");
    const bytes = await readTransfer(transferPath, admin.id);
    const backup = decryptBackup(
      bytes,
      String(f.get("backup_password") || ""),
    );
    result = await restoreSchoolBackup(backup, admin.id);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Restore could not be confirmed. Check audit history before retrying.",
    };
  } finally {
    if (transferPath) await discardTransfer(transferPath, admin.id).catch(() => {});
  }
  revalidatePath("/", "layout");
  return result;
}

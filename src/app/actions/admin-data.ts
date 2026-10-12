/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readTransfer, discardTransfer } from "@/lib/backup-transfer";
import { decryptBackup } from "@/lib/admin-backup";
import { restoreSchoolBackup, type RestoreResult } from "@/lib/admin-restore";
async function verify(admin: any, password: string) {
  const s = await createClient(),
    r = await s.auth.signInWithPassword({ email: admin.email, password });
  if (r.error) throw Error("Administrator password is incorrect.");
}
function go(path: string, key: string, msg: string): never {
  revalidatePath("/admin", "layout");
  redirect(path + "?" + key + "=" + encodeURIComponent(msg));
}
export async function clearAdminData(f: FormData) {
  const admin = await requireAdmin(),
    scope = String(f.get("scope") || "learning");
  try {
    await verify(admin, String(f.get("admin_password") || ""));
    const phrase =
      scope === "school" ? "CLEAR SCHOOL DATA" : "CLEAR LEARNING DATA";
    if (String(f.get("confirmation") || "") !== phrase)
      throw Error("The confirmation text does not match.");
    if (!["learning", "school"].includes(scope)) throw Error("Invalid clear scope.");
    const { error } = await createAdminClient().rpc("clear_school_data", { p_admin: admin.id, p_scope: scope });
    if (error) throw Error("Clear was not confirmed. Database errors roll back all changes; if the connection was interrupted, check audit history before retrying. " + error.message);
  } catch (e) {
    go(
      "/admin/data",
      "error",
      e instanceof Error ? e.message : "Reset failed.",
    );
  }
  go(
    "/admin/data",
    "notice",
    "Selected records cleared. Lessons, levels, administrator access, and audit history were preserved.",
  );
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

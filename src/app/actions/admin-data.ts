/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { decryptBackup } from "@/lib/admin-backup";
import { restoreSchoolBackup, type RestoreResult } from "@/lib/admin-restore";
async function verify(admin: any, password: string) {
  const s = await createClient(),
    r = await s.auth.signInWithPassword({ email: admin.email, password });
  if (r.error) throw Error("Administrator password is incorrect.");
}
async function audit(id: string, action: string, details: any = {}) {
  await createAdminClient()
    .from("admin_audit_log")
    .insert({ admin_id: id, action, entity: "system", details });
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
    const db = createAdminClient();
    const learning: [string, string, "uuid" | "number"][] = [
      ["student_code_executions", "id", "number"],
      ["student_level_sessions", "id", "number"],
      ["student_telemetry_runs", "student_id", "uuid"],
      ["student_level_progress", "student_id", "uuid"],
      ["student_activity", "id", "number"],
      ["student_achievements", "student_id", "uuid"],
      ["student_notifications", "id", "number"],
      ["teacher_notifications", "id", "number"],
    ];
    for (const [table, key, kind] of learning) {
      const query = db.from(table).delete();
      const { error } =
        kind === "number"
          ? await query.gt(key, 0)
          : await query.neq(key, "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    }
    if (scope === "school") {
      for (const [table, key] of [
        ["announcements", "id"],
        ["assignments", "id"],
        ["class_students", "class_id"],
        ["classes", "id"],
      ] as const) {
        const { error } = await db.from(table).delete().gt(key, 0);
        if (error) throw error;
      }
      const { data: users } = await db
        .from("profiles")
        .select("id")
        .in("role", ["student", "teacher"]);
      for (const user of users ?? []) {
        const { error } = await db.auth.admin.deleteUser(user.id);
        if (error) throw error;
      }
    }
    await audit(admin.id, "reset_" + scope);
    go(
      "/admin/data",
      "notice",
      "Selected records cleared. Lessons, levels, administrator access, and audit history were preserved.",
    );
  } catch (e) {
    go(
      "/admin/data",
      "error",
      e instanceof Error ? e.message : "Reset failed.",
    );
  }
}
export async function restoreAdminBackup(
  _previous: RestoreResult,
  f: FormData,
): Promise<RestoreResult> {
  const admin = await requireAdmin();
  let result: RestoreResult;
  try {
    await verify(admin, String(f.get("admin_password") || ""));
    if (String(f.get("confirmation") || "") !== "RESTORE SAVE FILE")
      throw Error("Type RESTORE SAVE FILE to confirm.");
    const upload = f.get("save_file");
    if (
      !(upload instanceof File) ||
      !upload.size ||
      upload.size > 4 * 1024 * 1024
    )
      throw Error("Choose a KnightCode save file smaller than 4 MB.");
    const backup = decryptBackup(
      Buffer.from(await upload.arrayBuffer()),
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
  }
  revalidatePath("/", "layout");
  return result;
}

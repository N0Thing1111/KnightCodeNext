/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BACKUP_TABLES, decryptBackup } from "@/lib/admin-backup";
import { sendStudentPasswordEmail } from "@/lib/mail";
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
export async function restoreAdminBackup(f: FormData) {
  const admin = await requireAdmin();
  try {
    await verify(admin, String(f.get("admin_password") || ""));
    if (String(f.get("confirmation") || "") !== "RESTORE SAVE FILE")
      throw Error("Type RESTORE SAVE FILE to confirm.");
    const upload = f.get("save_file");
    if (
      !(upload instanceof File) ||
      !upload.size ||
      upload.size > 24 * 1024 * 1024
    )
      throw Error("Choose a KnightCode save file smaller than 24 MB.");
    const backup = decryptBackup(
        Buffer.from(await upload.arrayBuffer()),
        String(f.get("backup_password") || ""),
      ),
      db = createAdminClient(),
      oldProfiles = backup.tables.profiles as any[],
      credentials: any[] = [];
    const { data: current } = await db
      .from("profiles")
      .select("id")
      .in("role", ["student", "teacher"]);
    for (const p of current ?? []) await db.auth.admin.deleteUser(p.id);
    for (const table of [...BACKUP_TABLES].reverse()) {
      if (table === "profiles") continue;
      const uuidKey = [
        "student_level_progress",
        "student_achievements",
        "student_telemetry_runs",
      ].includes(table);
      const key =
        table === "class_students" ? "class_id" : uuidKey ? "student_id" : "id";
      const query = db.from(table).delete();
      const deleted = uuidKey
        ? await query.neq(key, "00000000-0000-0000-0000-000000000000")
        : await query.gt(key, 0);
      if (deleted.error) throw deleted.error;
    }
    const userMap = new Map<string, string>();
    for (const p of oldProfiles) {
      const password =
          "KC-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12) + "!",
        created = await db.auth.admin.createUser({
          email: p.email,
          password,
          email_confirm: true,
          user_metadata: {
            role: p.role,
            name: p.name,
            student_id: p.student_id,
            teacher_id: p.teacher_id,
            username: p.username,
            class_section: p.class_section,
          },
        });
      if (created.error || !created.data.user)
        throw Error(created.error?.message || "Could not recreate " + p.email);
      userMap.set(p.id, created.data.user.id);
      const patch = { ...p, id: created.data.user.id };
      delete patch.created_at;
      delete patch.updated_at;
      const updated = await db
        .from("profiles")
        .update(patch)
        .eq("id", created.data.user.id);
      if (updated.error) throw updated.error;
      let sent = false;
      if (p.role === "student")
        sent = await sendStudentPasswordEmail({
          email: p.email,
          name: p.name,
          studentId: p.student_id,
          username: p.username,
          temporaryPassword: password,
          schoolLabel: p.school_code,
          reason: "reset",
        });
      credentials.push({
        name: p.name,
        email: p.email,
        role: p.role,
        password,
        email_sent: sent,
      });
    }
    const idMaps: Record<string, Map<any, any>> = {
      lessons: new Map(),
      levels: new Map(),
      achievements: new Map(),
      classes: new Map(),
    };
    for (const table of ["lessons", "achievements"] as const)
      for (const old of backup.tables[table] as any[]) {
        const row = { ...old };
        delete row.id;
        delete row.created_at;
        delete row.updated_at;
        const ins = await db.from(table).insert(row).select("id").single();
        if (ins.error) throw ins.error;
        idMaps[table].set(old.id, ins.data.id);
      }
    for (const old of backup.tables.levels as any[]) {
      const row = { ...old, lesson_id: idMaps.lessons.get(old.lesson_id) };
      delete row.id;
      delete row.created_at;
      delete row.updated_at;
      const ins = await db.from("levels").insert(row).select("id").single();
      if (ins.error) throw ins.error;
      idMaps.levels.set(old.id, ins.data.id);
    }
    for (const old of backup.tables.classes as any[]) {
      const row = { ...old, teacher_id: userMap.get(old.teacher_id) };
      delete row.id;
      delete row.created_at;
      delete row.updated_at;
      if (!row.teacher_id) continue;
      const ins = await db.from("classes").insert(row).select("id").single();
      if (ins.error) throw ins.error;
      idMaps.classes.set(old.id, ins.data.id);
    }
    const remap = (table: string, old: any) => {
      const r = { ...old };
      delete r.id;

      if ("student_id" in r) r.student_id = userMap.get(r.student_id);
      if ("teacher_id" in r) r.teacher_id = userMap.get(r.teacher_id);
      if ("class_id" in r) r.class_id = idMaps.classes.get(r.class_id);
      if ("lesson_id" in r) r.lesson_id = idMaps.lessons.get(r.lesson_id);
      if ("level_id" in r) r.level_id = idMaps.levels.get(r.level_id);
      if ("achievement_id" in r)
        r.achievement_id = idMaps.achievements.get(r.achievement_id);
      return r;
    };
    for (const table of [
      "class_students",
      "assignments",
      "student_level_progress",
      "student_activity",
      "student_achievements",
      "student_notifications",
      "student_telemetry_runs",
      "student_level_sessions",
      "student_code_executions",
      "announcements",
      "teacher_notifications",
    ]) {
      const rows = (backup.tables[table] as any[])
        .map((x) => remap(table, x))
        .filter(
          (r) =>
            (!("student_id" in r) || r.student_id) &&
            (!("teacher_id" in r) || r.teacher_id) &&
            (!("class_id" in r) || r.class_id),
        );
      if (rows.length) {
        for (let offset = 0; offset < rows.length; offset += 200) {
          const result = await db.from(table).insert(rows.slice(offset, offset + 200));
          if (result.error) throw result.error;
        }
      }
    }
    await audit(admin.id, "restore_backup", {
      backup_created_at: backup.created_at,
    });
    const jar = await cookies();
    jar.set("kc_admin_restore", JSON.stringify(credentials), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/admin/backup",
    });
    go(
      "/admin/backup",
      "notice",
      "Save file restored. New temporary passwords were generated for restored accounts.",
    );
  } catch (e) {
    go(
      "/admin/backup",
      "error",
      e instanceof Error ? e.message : "Restore failed.",
    );
  }
}

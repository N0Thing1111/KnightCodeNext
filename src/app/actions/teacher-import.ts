/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportRow } from "@/lib/import-utils";
import { sendStudentPasswordEmail } from "@/lib/mail";
function password() {
  return "KC-" + crypto.randomUUID().replaceAll("-", "").slice(0, 8) + "!";
}
export async function confirmImport(form: FormData) {
  const teacher = await requireTeacher(),
    id = String(form.get("batch_id") || ""),
    admin = createAdminClient(),
    { data: batch } = await admin
      .from("teacher_import_batches")
      .select("*")
      .eq("id", id)
      .eq("teacher_id", teacher.id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
  if (!batch)
    redirect(
      "/teacher/classes?error=" +
        encodeURIComponent("Import preview expired. Upload the file again."),
    );
  const created: any[] = [],
    existing: any[] = [],
    errors: any[] = [],
    seen = new Set<string>();
  for (const row of batch.rows as ImportRow[]) {
    const key = row.student_id.toLowerCase() + "|" + row.email;
    if (
      seen.has(key) ||
      !row.student_id ||
      !row.name ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)
    ) {
      errors.push({
        ...row,
        issue: seen.has(key)
          ? "Duplicate row"
          : "Missing or invalid required field",
      });
      continue;
    }
    seen.add(key);
    let { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .or(
        "email.eq." +
          row.email +
          ",and(student_id.ilike." +
          row.student_id +
          ",school_code.eq." +
          (teacher.school_code || "") +
          ")",
      )
      .limit(1)
      .maybeSingle();
    if (profile) {
      await admin
        .from("class_students")
        .upsert({ class_id: batch.class_id, student_id: profile.id });
      existing.push(row);
      continue;
    }
    if (row.username) {
      const { data: used } = await admin
        .from("profiles")
        .select("id")
        .ilike("username", row.username)
        .maybeSingle();
      if (used) {
        errors.push({
          ...row,
          issue: "Username is already used by another student",
        });
        continue;
      }
    }
    const temp = password(),
      result = await admin.auth.admin.createUser({
        email: row.email,
        password: temp,
        email_confirm: true,
        user_metadata: {
          role: "student",
          student_id: row.student_id,
          username: row.username || null,
          name: row.name,
          class_section: row.section || null,
        },
      });
    if (result.error || !result.data.user) {
      errors.push({
        ...row,
        issue: result.error?.message || "Could not create account",
      });
      continue;
    }
    const { error: update } = await admin
      .from("profiles")
      .update({
        student_id: row.student_id,
        username: row.username || null,
        name: row.name,
        class_section: row.section || null,
        school_code: teacher.school_code,
      })
      .eq("id", result.data.user.id);
    if (update) {
      await admin.auth.admin.deleteUser(result.data.user.id);
      errors.push({ ...row, issue: update.message });
      continue;
    }
    await admin
      .from("class_students")
      .upsert({ class_id: batch.class_id, student_id: result.data.user.id });
    created.push({ ...row, temp_password: temp, email_sent: false });
  }
  const delivered = await Promise.all(
    created.map(async (row) => ({
      ...row,
      email_sent: await sendStudentPasswordEmail({
        email: row.email,
        name: row.name,
        studentId: row.student_id,
        username: row.username || null,
        temporaryPassword: row.temp_password,
        schoolLabel: teacher.school_code,
        reason: "welcome",
      }),
    })),
  );
  await admin
    .from("teacher_import_batches")
    .update({ result: { created: delivered, existing, errors } })
    .eq("id", id)
    .eq("teacher_id", teacher.id);
  await admin
    .from("teacher_notifications")
    .upsert(
      {
        teacher_id: teacher.id,
        notification_key: "import_" + id,
        type: "import",
        title: "Student import completed",
        message: created.length + " new student accounts were created.",
        link: "/teacher/classes",
      },
      { onConflict: "teacher_id,notification_key" },
    );
  revalidatePath("/teacher", "layout");
  redirect("/teacher/import/" + id + "?done=1");
}
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

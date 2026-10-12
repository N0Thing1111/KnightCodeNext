/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportRow } from "@/lib/import-utils";
import { sendStudentPasswordEmail } from "@/lib/mail";
import { requireSectionMembership, setStudentSection } from "@/lib/sections";
function password() {
  return "KC-" + crypto.randomUUID().replaceAll("-", "").slice(0, 8) + "!";
}
export type StudentImportState = { error?: string; result?: { created: (ImportRow & { temp_password: string; email_sent: boolean })[]; existing: ImportRow[]; errors: (ImportRow & { issue: string })[] } };
export async function confirmImport(_previous: StudentImportState, form: FormData): Promise<StudentImportState> {
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
  if (batch.result) redirect("/teacher/import/" + id + "?done=1");
  await requireSectionMembership();
  const { data: targetSection } = await admin
    .from("classes")
    .select("id")
    .eq("id", batch.class_id)
    .eq("teacher_id", teacher.id)
    .eq("status", "active")
    .maybeSingle();
  if (!targetSection)
    redirect(
      "/teacher/classes?error=" +
        encodeURIComponent(
          "The selected section is no longer active or assigned to you.",
        ),
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
      try {
        await setStudentSection(profile.id, batch.class_id, teacher.id);
        existing.push(row);
      } catch (error) {
        errors.push({
          ...row,
          issue:
            error instanceof Error ? error.message : "Could not enroll student",
        });
      }
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
        app_metadata: { role: "student" },
      user_metadata: {
          role: "student",
          student_id: row.student_id,
          username: row.username || null,
          name: row.name,
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
        school_code: teacher.school_code,
      })
      .eq("id", result.data.user.id);
    if (update) {
      await admin.auth.admin.deleteUser(result.data.user.id);
      errors.push({ ...row, issue: update.message });
      continue;
    }
    try {
      await setStudentSection(result.data.user.id, batch.class_id, teacher.id);
    } catch (error) {
      await admin.auth.admin.deleteUser(result.data.user.id);
      errors.push({
        ...row,
        issue:
          error instanceof Error ? error.message : "Could not enroll student",
      });
      continue;
    }
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
  const saved = await admin
    .from("teacher_import_batches")
    .update({ result: { created: delivered.map(({ temp_password: secret, ...row }) => { void secret; return row; }), existing, errors } })
    .eq("id", id)
    .eq("teacher_id", teacher.id);
  await admin.from("teacher_notifications").upsert(
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
  revalidatePath("/", "layout");
  return { error: saved.error ? "Accounts were processed, but the import history could not be saved. Copy the credentials below and check the student list before importing again." : undefined, result: { created: delivered, existing, errors } };
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

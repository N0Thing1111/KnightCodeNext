"use server";
import { findStudentAccount } from "@/lib/student-identity";
import { getSchoolName } from "@/lib/school-name";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRow, type ImportRow } from "@/lib/import-utils";
import { studentImportIssues, type AdminStudentImportState } from "@/lib/admin-student-import";
import { sectionLabel } from "@/lib/section-label";
import { requireSectionMembership, setStudentSection } from "@/lib/sections";
import { sendStudentPasswordEmail } from "@/lib/mail";

export async function importAdminStudents(_previous: AdminStudentImportState, form: FormData): Promise<AdminStudentImportState> {
  // Never call teacher guards or signUp: account creation must preserve the admin session.
  const actor = await requireAdmin();
  let rows: ImportRow[];
  const sectionId = Number(form.get("class_id"));
  try {
    const raw = String(form.get("rows") || "[]");
    if (raw.length > 300000) throw Error("Import file is too large.");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 100) throw Error("Import between 1 and 100 students.");
    if (parsed.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw Error("Invalid import rows.");
    rows = parsed.map(normalizeRow);
    if (!Number.isSafeInteger(sectionId) || sectionId < 1) throw Error("Choose an active section.");
  } catch (error) { return { error: error instanceof Error ? error.message : "Invalid import preview." }; }
  const db = createAdminClient();
  const result: NonNullable<AdminStudentImportState["result"]> = { created: [], existing: [], errors: [] };
  try {
    await requireSectionMembership();
    const section = await db.from("classes").select("id,name,section,teacher_id").eq("id", sectionId).eq("status", "active").maybeSingle();
    if (section.error) throw Error(section.error.message);
    if (!section.data) throw Error("The selected section is no longer active. Refresh and choose another section.");
    const teacher = await db.from("profiles").select("id").eq("id", section.data.teacher_id).eq("role", "teacher").eq("active", true).maybeSingle();
    if (teacher.error) throw Error(teacher.error.message);
    if (!teacher.data) throw Error("The selected section needs an active teacher.");
    const issues = studentImportIssues(rows, { name: section.data.name, label: sectionLabel(section.data) });
    if (issues.some(row => row.length)) return { error: "Correct the CSV before importing: " + issues.map((row, i) => row.length ? `row ${i + 2}: ${row.join("; ")}` : "").filter(Boolean).join(". ") };
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not validate the section." }; }

  const literalPattern = (value: string) => value.replace(/[\\%_]/g, "\\$&");
  for (const row of rows) {
    let newUserId: string | null = null;
    try {
      const existing = await findStudentAccount(db, row.email, row.student_id);
      if (existing) {
        // No password reset or transfer: the database enforces one section/teacher.
        await setStudentSection(existing.id, sectionId, actor.id, false);
        result.existing.push(row);
        continue;
      }
      if (row.username) {
        const username = await db.from("profiles").select("id").ilike("username", literalPattern(row.username)).maybeSingle();
        if (username.error) throw Error(username.error.message);
        if (username.data) throw Error("Username is already used by another account.");
      }
      const password = "KC-" + crypto.randomUUID().replaceAll("-", "").slice(0, 16) + "!";
      const created = await db.auth.admin.createUser({
        email: row.email, password, email_confirm: true,
        app_metadata: { role: "student" },
        user_metadata: { role: "student", student_id: row.student_id || null, name: row.name, username: row.username || null },
      });
      if (created.error || !created.data.user) throw Error(created.error?.message || "Could not create account.");
      newUserId = created.data.user.id;
      const updated = await db.from("profiles").update({ student_id: row.student_id || null, name: row.name, username: row.username || null, active: true, must_change_password: true }).eq("id", newUserId).select("id").single();
      if (updated.error) throw Error(updated.error.message);
      await setStudentSection(newUserId, sectionId, actor.id, false);
      result.created.push({ ...row, temp_password: password, email_sent: false });
      newUserId = null;
    } catch (error) {
      let issue = error instanceof Error ? error.message : "Could not import student.";
      if (newUserId) {
        const cleanup = await db.auth.admin.deleteUser(newUserId);
        if (cleanup.error) issue += " The newly created account could not be removed; check Students before retrying.";
      }
      result.errors.push({ ...row, issue });
    }
  }
  // Only fully enrolled new accounts receive welcome email. No passwords go into cookies or audit records.
  for (const row of result.created) {
    try {
      row.email_sent = await sendStudentPasswordEmail({ email: row.email, name: row.name, studentId: row.student_id, username: row.username || null, temporaryPassword: row.temp_password, schoolLabel: await getSchoolName(db), reason: "welcome" });
    } catch { row.email_sent = false; }
  }
  const audit = await db.from("admin_audit_log").insert({ admin_id: actor.id, action: "import", entity: "students", details: { section_id: sectionId, created: result.created.length, existing: result.existing.length, errors: result.errors.length } });
  revalidatePath("/", "layout");
  return { result, error: audit.error ? "Import finished, but its audit entry could not be saved. Review the results below before retrying." : undefined };
}

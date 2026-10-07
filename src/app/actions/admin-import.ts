"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendTeacherPasswordEmail } from "@/lib/mail";

type ImportRow = { name: string; email: string };

function temporaryPassword() {
  return "KC-" + crypto.randomUUID().replaceAll("-", "").slice(0, 16) + "!";
}

function teacherId() {
  return (
    "TCH-" +
    new Date().getFullYear() +
    "-" +
    crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()
  );
}

function fail(message: string): never {
  redirect("/admin/import?error=" + encodeURIComponent(message));
}

export async function importTeachers(formData: FormData) {
  const admin = await requireAdmin();
  let rows: ImportRow[];
  try {
    rows = JSON.parse(String(formData.get("rows") || "[]"));
  } catch {
    fail("The import preview is invalid. Choose the CSV again.");
  }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100)
    fail("Import between 1 and 100 teachers.");
  const normalized = rows.map((row) => ({
    name: String(row?.name || "").trim(),
    email: String(row?.email || "")
      .trim()
      .toLowerCase(),
  }));
  const seen = new Set<string>();
  for (const row of normalized) {
    if (
      !row.name ||
      row.name.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ||
      seen.has(row.email)
    )
      fail("Check names, valid emails, and duplicate rows.");
    seen.add(row.email);
  }
  const db = createAdminClient();
  const existing = await db
    .from("profiles")
    .select("email")
    .in(
      "email",
      normalized.map((row) => row.email),
    );
  if (existing.error) fail(existing.error.message);
  if (existing.data?.length)
    fail("An account already uses: " + existing.data[0].email);
  const settings = await db
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "school_code")
    .maybeSingle();
  const schoolCode = settings.data?.setting_value || "KNIGHTCODE-DEMO";
  const credentials: Array<{
    name: string;
    email: string;
    teacher_id: string;
    password: string;
  }> = [];
  for (const row of normalized) {
    const password = temporaryPassword();
    const code = teacherId();
    const created = await db.auth.admin.createUser({
      email: row.email,
      password,
      email_confirm: true,
      user_metadata: { role: "teacher", name: row.name, teacher_id: code },
    });
    if (created.error || !created.data.user) {
      for (const credential of credentials) {
        const profile = await db
          .from("profiles")
          .select("id")
          .eq("email", credential.email)
          .maybeSingle();
        if (profile.data?.id) await db.auth.admin.deleteUser(profile.data.id);
      }
      fail(
        created.error?.message || "Import failed. No partial import was kept.",
      );
    }
    const updated = await db
      .from("profiles")
      .update({
        teacher_id: code,
        school_code: schoolCode,
        active: true,
        must_change_password: true,
      })
      .eq("id", created.data.user.id);
    if (updated.error) {
      await db.auth.admin.deleteUser(created.data.user.id);
      fail(updated.error.message);
    }
    credentials.push({ ...row, teacher_id: code, password });
  }
  await db.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "import",
    entity: "teachers",
    details: { count: credentials.length },
  });
  // Send only after the account-creation batch has finished successfully.
  const delivered = await Promise.all(
    credentials.map(async (row) => ({
      ...row,
      email_sent: await sendTeacherPasswordEmail({
        email: row.email,
        name: row.name,
        teacherId: row.teacher_id,
        temporaryPassword: row.password,
        schoolLabel: schoolCode,
      }),
    })),
  );
  const jar = await cookies();
  jar.set("kc_admin_import", JSON.stringify(delivered), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/admin/import",
  });
  revalidatePath("/admin", "layout");
  redirect(
    "/admin/import?notice=" +
      encodeURIComponent(credentials.length + " teacher accounts created."),
  );
}

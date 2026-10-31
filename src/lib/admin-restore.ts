import { getSchoolName } from "@/lib/school-name";
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { randomBytes } from "node:crypto";
import {
  BACKUP_TABLES,
  PYTHON_BACKUP_TABLES,
  type SchoolBackup,
} from "@/lib/admin-backup";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendStudentPasswordEmail, sendTeacherPasswordEmail } from "@/lib/mail";

export type RestoreResult = {
  error?: string;
  notice?: string;
  counts?: Record<string, number>;
  emailSummary?: { sent: number; failed: number };
  credentials?: {
    name: string;
    email: string;
    role: string;
    password: string;
    emailSent: boolean;
  }[];
};

export function validateRestoreBackup(backup: SchoolBackup) {
  const tables = backup.tables as Record<string, any[]>;
  const requiredTables = [
    ...BACKUP_TABLES,
    ...(backup.version >= 5 ? ["enrollment_requests"] : []),
    ...(backup.version >= 3 ? PYTHON_BACKUP_TABLES : []),
  ];
  const ids = new Map<string, Set<string>>();
  for (const table of requiredTables) {
    if (!Array.isArray(tables[table]))
      throw Error("Save file is missing " + table);
    const found = new Set<string>();
    for (const row of tables[table]) {
      if (!row || typeof row !== "object" || Array.isArray(row))
        throw Error("Invalid record in " + table);
      if ("id" in row) {
        if (row.id == null || found.has(String(row.id)))
          throw Error("Missing or duplicate ID in " + table);
        found.add(String(row.id));
      }
    }
    ids.set(table, found);
  }
  const enrolled = new Set<string>();
  for (const row of tables.class_students) {
    if (enrolled.has(String(row.student_id)))
      throw Error(
        "This save assigns a student to multiple sections. Resolve those memberships before restoring; nothing was changed.",
      );
    enrolled.add(String(row.student_id));
  }
  const emails = new Set<string>();
  const studentIds = new Set<string>();
  for (const p of tables.profiles) {
    if (
      !["teacher", "student"].includes(p.role) ||
      typeof p.email !== "string" ||
      !p.email.includes("@")
    )
      throw Error("Invalid account in save file.");
    if (p.role === "student" && p.student_id != null) {
      if (typeof p.student_id !== "string") throw Error("Invalid student ID in save file.");
      const studentId = p.student_id.trim().toLowerCase();
      if (studentId && studentIds.has(studentId)) throw Error("Duplicate student ID in save file. Student IDs must be unique across this deployment; nothing was changed.");
      if (studentId) studentIds.add(studentId);
    }
    const email = p.email.trim().toLowerCase();
    if (emails.has(email)) throw Error("Duplicate account email in save file.");
    emails.add(email);
  }
  for (const table of requiredTables) {
    if (table === "profiles") continue; // student_id/teacher_id here are business IDs.
    for (const row of tables[table]) {
      for (const [column, target] of [
        ["student_id", "profiles"],
        ["teacher_id", "profiles"],
        ["class_id", "classes"],
        ["lesson_id", "lessons"],
        ["level_id", "levels"],
        ["achievement_id", "achievements"],
        ...(table.startsWith("python_")
          ? [
              ["activity_id", "python_activities"],
              ["run_id", "python_runs"],
              ["submission_id", "python_submissions"],
            ]
          : []),
      ]) {
        if (row[column] != null && !ids.get(target)?.has(String(row[column])))
          throw Error(
            "Broken " +
              column +
              " link in " +
              table +
              ". Nothing was restored.",
          );
      }
    }
  }
}

export async function restoreSchoolBackup(
  backup: SchoolBackup,
  adminId: string,
): Promise<RestoreResult> {
  validateRestoreBackup(backup);
  const db = createAdminClient();
  const ready = await db.rpc("school_restore_version");
  if (ready.error || ![1, 2, 3, 4].includes(ready.data))
    throw Error(
      "Restore is unavailable until migration 202610070001_atomic_school_restore.sql is applied. No platform records were changed.",
    );

  if (
    (backup.version < 3 && ready.data >= 2) ||
    (backup.version >= 3 && ready.data < 2) ||
    (backup.version === 4 && ready.data < 3) ||
    (backup.version >= 5 && ready.data < 4)
  )
    throw Error(
      "This database requires a matching save format. Python-enabled databases require version 3 or later saves; version 5 requires the centralized-platform backup update. Older saves cannot silently replace Python history. No accounts or records were changed. Keep the old file for a separately reviewed recovery.",
    );

  // Read every account, including beyond Supabase's default page size.
  const current: any[] = [];
  for (let from = 0; ; from += 500) {
    const r = await db
      .from("profiles")
      .select("id,email,role,active,onboarding_status")
      .order("id")
      .range(from, from + 499);
    if (r.error) throw Error("Could not verify existing accounts.");
    current.push(...(r.data || []));
    if (!r.data || r.data.length < 500) break;
  }
  // Reconcile a copy: the original encrypted save remains unchanged.
  const profiles = (backup.tables.profiles as any[]).map((profile) => ({ ...profile }));
  const mapping: Record<string, string> = {};
  const missing: any[] = [];
  for (const p of profiles) {
    const byId = current.find((c) => c.id === p.id);
    const byEmail = current.find(
      (c) => c.email.toLowerCase() === p.email.toLowerCase(),
    );
    if (byId && byId !== byEmail)
      throw Error(
        "An account's email changed since this save. Match its email to the save before restoring; no records were replaced.",
      );
    if (byEmail) {
      if (byEmail.role !== p.role)
        throw Error(
          "An account role conflicts with the save file. No records were replaced.",
        );
      mapping[p.id] = byEmail.id;
      if (p.role === "teacher" && p.onboarding_status === "pending") {
        // A pending snapshot must not undo a later archive or rejection.
        if (
          byEmail.onboarding_status === "rejected" ||
          (byEmail.onboarding_status === "approved" && byEmail.active === false)
        ) {
          p.onboarding_status = byEmail.onboarding_status;
          p.active = false;
        } else {
          const account = await db.auth.admin.getUserById(byEmail.id);
          if (account.error || !account.data.user)
            throw Error("Could not verify a restored teacher's email status. No records were replaced.");
          if (account.data.user.email_confirmed_at) {
            p.onboarding_status = "approved";
            p.active = true;
          }
        }
      }
    } else missing.push(p);
  }
  const credentials: NonNullable<RestoreResult["credentials"]> = [];
  for (const p of missing) {
    const password = "KC-" + randomBytes(18).toString("base64url") + "!";
    // Leave unique school identifiers for the atomic transaction, avoiding conflicts
    // with current records before the restore can be validated in PostgreSQL.
    const created = await db.auth.admin.createUser({
      email: p.email,
      password,
      email_confirm: true,
      app_metadata: { role: p.role },
      user_metadata: { role: p.role, name: p.name },
    });
    if (created.error || !created.data.user)
      throw Error(
        "Could not prepare a missing account. School records were not replaced. Any accounts already prepared can be managed under Teachers/Students.",
      );
    mapping[p.id] = created.data.user.id;
    // createUser already confirmed this account. Restoring an old pending
    // status would leave it waiting for a confirmation event that cannot recur.
    if (p.role === "teacher" && p.onboarding_status === "pending") {
      p.onboarding_status = "approved";
      p.active = true;
    }
    credentials.push({
      name: p.name,
      email: p.email,
      role: p.role,
      password,
      emailSent: false,
    });
  }
  const restored = await db.rpc("restore_school_backup", {
    p_backup: { ...backup, tables: { ...backup.tables, profiles } },
    p_user_map: mapping,
    p_admin: adminId,
  });
  if (restored.error) {
    // Never delete prepared Auth accounts: an interrupted response may follow a
    // committed transaction, and deleting an account would cascade-delete its data.
    throw Error(
      "Restore was not confirmed: " +
        restored.error.message +
        " Database validation errors roll back the school-record changes. If the connection was interrupted, check the audit history before retrying. Newly prepared accounts may need a password reset from account management.",
    );
  }
  // Wait for the database transaction to succeed before sending credentials.
  // Only accounts created by this restore are eligible; existing passwords stay private.
  // Limit concurrent SMTP connections when a save contains many missing accounts.
  for (let start = 0; start < credentials.length; start += 5) {
    await Promise.all(
      credentials.slice(start, start + 5).map(async (credential, index) => {
        const profile = missing[start + index];
        const common = {
          email: credential.email,
          name: credential.name,
          temporaryPassword: credential.password,
          schoolLabel: await getSchoolName(db),
          reason: "restore" as const,
        };
        try {
          credential.emailSent =
            profile.role === "teacher"
              ? await sendTeacherPasswordEmail({
                  ...common,
                  teacherId:
                    profile.teacher_id || "Not set; use your email to sign in",
                })
              : await sendStudentPasswordEmail({
                  ...common,
                  studentId:
                    profile.student_id || "Not set; use your email to sign in",
                  username: profile.username,
                });
        } catch {
          // Email problems must never turn a committed restore into a reported failure.
          credential.emailSent = false;
        }
      }),
    );
  }
  const sent = credentials.filter((credential) => credential.emailSent).length;
  return {
    notice:
      "Save restored and record counts verified. Existing accounts kept their current passwords.",
    counts: restored.data as Record<string, number>,
    credentials,
    emailSummary: credentials.length
      ? { sent, failed: credentials.length - sent }
      : undefined,
  };
}

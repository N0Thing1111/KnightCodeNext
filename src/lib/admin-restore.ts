/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { randomBytes } from "node:crypto";
import { BACKUP_TABLES, type SchoolBackup } from "@/lib/admin-backup";
import { createAdminClient } from "@/lib/supabase/admin";

export type RestoreResult = {
  error?: string;
  notice?: string;
  counts?: Record<string, number>;
  credentials?: {
    name: string;
    email: string;
    role: string;
    password: string;
  }[];
};

export function validateRestoreBackup(backup: SchoolBackup) {
  const tables = backup.tables as Record<string, any[]>;
  const ids = new Map<string, Set<string>>();
  for (const table of BACKUP_TABLES) {
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
  for (const p of tables.profiles) {
    if (
      !["teacher", "student"].includes(p.role) ||
      typeof p.email !== "string" ||
      !p.email.includes("@")
    )
      throw Error("Invalid account in save file.");
    const email = p.email.toLowerCase();
    if (emails.has(email)) throw Error("Duplicate account email in save file.");
    emails.add(email);
  }
  for (const table of BACKUP_TABLES) {
    if (table === "profiles") continue; // student_id/teacher_id here are business IDs.
    for (const row of tables[table]) {
      for (const [column, target] of [
        ["student_id", "profiles"],
        ["teacher_id", "profiles"],
        ["class_id", "classes"],
        ["lesson_id", "lessons"],
        ["level_id", "levels"],
        ["achievement_id", "achievements"],
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
  if (ready.error || ready.data !== 1)
    throw Error(
      "Restore is unavailable until migration 202610070001_atomic_school_restore.sql is applied. No school records were changed.",
    );

  // Read every account, including beyond Supabase's default page size.
  const current: any[] = [];
  for (let from = 0; ; from += 500) {
    const r = await db
      .from("profiles")
      .select("id,email,role")
      .order("id")
      .range(from, from + 499);
    if (r.error) throw Error("Could not verify existing accounts.");
    current.push(...(r.data || []));
    if (!r.data || r.data.length < 500) break;
  }
  const profiles = backup.tables.profiles as any[];
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
      user_metadata: { role: p.role, name: p.name },
    });
    if (created.error || !created.data.user)
      throw Error(
        "Could not prepare a missing account. School records were not replaced. Any accounts already prepared can be managed under Teachers/Students.",
      );
    mapping[p.id] = created.data.user.id;
    credentials.push({ name: p.name, email: p.email, role: p.role, password });
  }
  const restored = await db.rpc("restore_school_backup", {
    p_backup: backup,
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
  return {
    notice:
      "Save restored and record counts verified. Existing accounts kept their current passwords.",
    counts: restored.data as Record<string, number>,
    credentials,
  };
}

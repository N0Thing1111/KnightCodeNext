import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_BACKUP_BYTES, MAX_BACKUP_JSON_BYTES } from "@/lib/backup-transfer-rules";
export const BACKUP_TABLES = [
  "profiles",
  "lessons",
  "levels",
  "classes",
  "class_students",
  "assignments",
  "student_level_progress",
  "student_activity",
  "achievements",
  "student_achievements",
  "student_notifications",
  "student_telemetry_runs",
  "student_level_sessions",
  "student_code_executions",
  "announcements",
  "teacher_notifications",
] as const;
export const PYTHON_BACKUP_TABLES = [
  "python_activities",
  "python_drafts",
  "python_runs",
  "python_submissions",
  "python_reviews",
] as const;
export type SchoolBackup = {
  format: "KnightCode Supabase school save";
  version: 1 | 2 | 3 | 4;
  created_at: string;
  tables: Record<string, unknown[]>;
};
export async function captureBackup(adminId: string): Promise<SchoolBackup> {
  const { data, error } = await createAdminClient().rpc("capture_school_backup", { p_admin: adminId });
  if (error) throw Error("Could not capture a consistent save. Apply the priority-workflows migration and try again. " + error.message);
  return data as SchoolBackup;
}
export function encryptBackup(data: SchoolBackup, password: string) {
  if (password.length < 12)
    throw Error("Use a backup password of at least 12 characters.");
  const serialized = Buffer.from(JSON.stringify(data));
  if (serialized.length > MAX_BACKUP_JSON_BYTES) throw Error("Save contents exceed the 128 MB expanded limit.");
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = pbkdf2Sync(password, salt, 210000, 32, "sha256"),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("KnightCode-Supabase-save-v1"));
  const body = Buffer.concat([
    cipher.update(gzipSync(serialized)),
    cipher.final(),
  ]);
  const file = Buffer.from(
    JSON.stringify({
      format: "KnightCode encrypted save",
      version: 2,
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: body.toString("base64"),
    }),
  );
  if (file.length > MAX_BACKUP_BYTES) throw Error("This save exceeds the 32 MB transfer limit; request a database-level backup instead.");
  return file;
}
export function decryptBackup(file: Buffer, password: string): SchoolBackup {
  try {
    if (file.length > MAX_BACKUP_BYTES) throw Error();
    const outer = JSON.parse(file.toString("utf8"));
    if (outer.format !== "KnightCode encrypted save" || outer.version !== 2)
      throw Error();
    const salt = Buffer.from(outer.salt, "base64"),
      iv = Buffer.from(outer.iv, "base64"),
      tag = Buffer.from(outer.tag, "base64"),
      key = pbkdf2Sync(password, salt, 210000, 32, "sha256"),
      decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from("KnightCode-Supabase-save-v1"));
    decipher.setAuthTag(tag);
    const data = JSON.parse(
      gunzipSync(
        Buffer.concat([
          decipher.update(Buffer.from(outer.data, "base64")),
          decipher.final(),
        ]),
        { maxOutputLength: MAX_BACKUP_JSON_BYTES },
      ).toString("utf8"),
    );
    if (
      data.format !== "KnightCode Supabase school save" ||
      ![1, 2, 3, 4].includes(data.version) ||
      !data.tables
    )
      throw Error();
    // Saves made before Run history remain restorable.
    if (data.version === 1 && data.tables.student_code_executions === undefined)
      data.tables.student_code_executions = [];
    for (const t of [
      ...BACKUP_TABLES,
      ...(data.version >= 3 ? PYTHON_BACKUP_TABLES : []),
    ])
      if (!Array.isArray(data.tables[t])) throw Error();
    return data;
  } catch {
    throw Error(
      "Cannot open this save file. Check its password; the file may be damaged or unsupported.",
    );
  }
}

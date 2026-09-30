/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import { createAdminClient } from "@/lib/supabase/admin";
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
  "announcements",
  "teacher_notifications",
] as const;
export type SchoolBackup = {
  format: "KnightCode Supabase school save";
  version: 1;
  created_at: string;
  tables: Record<string, unknown[]>;
};
export async function captureBackup(): Promise<SchoolBackup> {
  const db = createAdminClient(),
    tables: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    const { data, error } = await db.from(table).select("*");
    if (error) throw error;
    tables[table] =
      table === "profiles"
        ? (data ?? []).filter((p: any) => p.role !== "admin")
        : (data ?? []);
  }
  return {
    format: "KnightCode Supabase school save",
    version: 1,
    created_at: new Date().toISOString(),
    tables,
  };
}
export function encryptBackup(data: SchoolBackup, password: string) {
  if (password.length < 12)
    throw Error("Use a backup password of at least 12 characters.");
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = pbkdf2Sync(password, salt, 210000, 32, "sha256"),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("KnightCode-Supabase-save-v1"));
  const body = Buffer.concat([
    cipher.update(gzipSync(Buffer.from(JSON.stringify(data)))),
    cipher.final(),
  ]);
  return Buffer.from(
    JSON.stringify({
      format: "KnightCode encrypted save",
      version: 2,
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: body.toString("base64"),
    }),
  );
}
export function decryptBackup(file: Buffer, password: string): SchoolBackup {
  try {
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
      ).toString("utf8"),
    );
    if (
      data.format !== "KnightCode Supabase school save" ||
      data.version !== 1 ||
      !data.tables
    )
      throw Error();
    for (const t of BACKUP_TABLES)
      if (!Array.isArray(data.tables[t])) throw Error();
    return data;
  } catch {
    throw Error(
      "Cannot open this save file. Check its password; the file may be damaged or unsupported.",
    );
  }
}

import { createHash, timingSafeEqual } from "node:crypto";
export const AUTOMATIC_BACKUP_BUCKET = "platform-backups";
export const BACKUP_RETENTION = { weekly: 8, manual: 3 } as const;
export const backupDigest = (file: Buffer | string) => createHash("sha256").update(file).digest("hex");
export const backupKeyId = (secret: string) => backupDigest(secret).slice(0, 16);
export const validBackupId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function authorizedCron(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !header) return false;
  const actual = Buffer.from(header), expected = Buffer.from("Bearer " + secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
// Most recent scheduled Saturday 18:00 UTC = Sunday 02:00 Asia/Manila.
export function weeklyBackupKey(now = new Date()) {
  const slot = new Date(now);
  slot.setUTCHours(18, 0, 0, 0);
  slot.setUTCDate(slot.getUTCDate() - (slot.getUTCDay() + 1) % 7);
  if (slot > now) slot.setUTCDate(slot.getUTCDate() - 7);
  return "weekly:" + new Date(slot.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export type StoredSchoolBackup = {
  id: string; job_key: string; source: "weekly" | "manual";
  status: "running" | "ready" | "failed" | "expired";
  requested_by: string | null; started_at: string; lease_until: string;
  completed_at: string | null; snapshot_at: string | null; storage_path: string;
  byte_size: number | null; sha256: string | null; key_id: string | null;
  error_message: string | null; retention_warning: string | null;
};
export function expiredBackupIds(rows: StoredSchoolBackup[]) {
  return (Object.keys(BACKUP_RETENTION) as Array<keyof typeof BACKUP_RETENTION>).flatMap(source =>
    rows.filter(row => row.source === source && row.status === "ready")
      .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at) || b.id.localeCompare(a.id))
      .slice(BACKUP_RETENTION[source]).map(row => row.id));
}

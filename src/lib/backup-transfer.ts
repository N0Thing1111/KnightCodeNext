import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { BACKUP_BUCKET, MAX_BACKUP_BYTES, TRANSFER_LIFETIME_MS, validateTransferPath } from "@/lib/backup-transfer-rules";
export function transferStorage() { return createAdminClient().storage.from(BACKUP_BUCKET); }
export async function prepareTransfer(adminId: string) {
 const { data, error } = await createAdminClient().storage.getBucket(BACKUP_BUCKET);
 if (error || !data) throw Error("Backup transfer storage is not ready. Apply the backup-transfer migration first.");
 if (data.public || Number(data.file_size_limit) !== MAX_BACKUP_BYTES) throw Error("Backup transfer storage must be private with its configured size limit.");
 // Interrupted transfers expire. Only this administrator's temporary files are removed.
 const storage = transferStorage();
 const expired: string[] = [];
 for (let offset = 0;; offset += 100) {
  const page = await storage.list(adminId, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
  if (page.error) throw Error("Could not check temporary backup storage.");
  for (const file of page.data || []) {
   const p = adminId + "/" + file.name;
   try { validateTransferPath(p, adminId, Date.now(), true); } catch { continue; }
   if (Date.now() - Number(file.name.slice(0,13)) > TRANSFER_LIFETIME_MS) expired.push(p);
  }
  if ((page.data || []).length < 100) break;
 }
 for (let i=0;i<expired.length;i+=100) {
  const result = await storage.remove(expired.slice(i,i+100));
  if (result.error) throw Error("Could not clean expired temporary backups.");
 }
 return adminId + "/" + Date.now() + "-" + randomUUID() + ".knightsave";
}
export async function discardTransfer(path: string, adminId: string) {
 validateTransferPath(path, adminId, Date.now(), true);
 const result = await transferStorage().remove([path]);
 if (result.error) throw Error("Temporary backup cleanup failed; it will be retried on the next transfer.");
}
export async function readTransfer(path: string, adminId: string) {
 validateTransferPath(path, adminId);
 const { data, error } = await transferStorage().download(path);
 if (error || !data) throw Error("Could not read the uploaded save. Upload it again.");
 if (!data.size || data.size > MAX_BACKUP_BYTES) throw Error("Choose a save file up to 32 MB.");
 return Buffer.from(await data.arrayBuffer());
}

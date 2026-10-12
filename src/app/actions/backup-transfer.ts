"use server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { prepareTransfer, discardTransfer, transferStorage } from "@/lib/backup-transfer";
import { MAX_BACKUP_BYTES } from "@/lib/backup-transfer-rules";
export async function prepareRestoreUpload(form: FormData): Promise<{ path?: string; token?: string; error?: string }> {
 const admin = await requireAdmin();
 try {
  if (String(form.get("confirmation")) !== "RESTORE SAVE FILE") throw Error("Type RESTORE SAVE FILE to confirm.");
  const size = Number(form.get("file_size"));
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_BACKUP_BYTES) throw Error("Choose a save file up to 32 MB.");
  const client = await createClient();
  const check = await client.auth.signInWithPassword({ email: admin.email, password: String(form.get("admin_password") || "") });
  if (check.error) throw Error("Administrator password is incorrect.");
  const path = await prepareTransfer(admin.id);
  const { data, error } = await transferStorage().createSignedUploadUrl(path);
  if (error || !data) throw Error("Could not prepare secure upload.");
  return { path, token: data.token };
 } catch(e) { return { error: e instanceof Error ? e.message : "Could not prepare upload." }; }
}
export async function discardBackupTransfer(path: string) {
 const admin = await requireAdmin();
 try { await discardTransfer(path, admin.id); return { ok: true }; }
 catch { return { ok: false }; }
}

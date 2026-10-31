import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptBackup, encryptBackup, type SchoolBackup } from "@/lib/admin-backup";
import { MAX_BACKUP_BYTES } from "@/lib/backup-transfer-rules";
import { AUTOMATIC_BACKUP_BUCKET, backupDigest, backupKeyId, expiredBackupIds, validBackupId, type StoredSchoolBackup } from "@/lib/automatic-backup-rules";

function archiveSecret() {
  const secret = process.env.AUTOMATIC_BACKUP_SECRET;
  if (!secret || secret.length < 32) throw Error("Automatic backups need AUTOMATIC_BACKUP_SECRET configured on the server (at least 32 characters).");
  return secret;
}
export function automaticBackupConfiguration() {
  return { encryption: (process.env.AUTOMATIC_BACKUP_SECRET?.length ?? 0) >= 32,
    cron: (process.env.CRON_SECRET?.length ?? 0) >= 32 };
}
const archive = () => createAdminClient().storage.from(AUTOMATIC_BACKUP_BUCKET);
const pathFor = (id: string) => "snapshots/" + id + ".knightsave";
export async function getStoredBackup(id: string) {
  if (!validBackupId(id)) throw Error("Invalid saved backup.");
  const { data, error } = await createAdminClient().from("platform_backups").select("*").eq("id", id).maybeSingle();
  if (error || !data) throw Error("Saved backup could not be found. Refresh the page.");
  return data as StoredSchoolBackup;
}
export async function listStoredBackups() {
  const db = createAdminClient();
  const results = await Promise.all([
    db.from("platform_backups").select("*").eq("status", "ready").order("started_at", { ascending: false }).limit(100),
    db.from("platform_backups").select("*").neq("status", "ready").order("started_at", { ascending: false }).limit(20),
  ]);
  if (results.some(result => result.error)) throw Error("Backup history is unavailable. Check the database connection and check the platform backup setup.");
  return { rows: results.flatMap(result => result.data ?? []).sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at)) as StoredSchoolBackup[], checkedAt: Date.now() };
}
export async function readStoredBackup(id: string): Promise<SchoolBackup> {
  const row = await getStoredBackup(id), secret = archiveSecret();
  if (row.status !== "ready") throw Error("This backup is not available for download. Choose a completed backup.");
  if (row.key_id !== backupKeyId(secret)) throw Error("This backup needs the original AUTOMATIC_BACKUP_SECRET. Restore that server setting before downloading.");
  const { data, error } = await archive().download(pathFor(id));
  if (error || !data) throw Error("The stored file could not be downloaded. Check Supabase Storage or choose another backup.");
  if (data.size > MAX_BACKUP_BYTES || data.size !== row.byte_size) throw Error("Stored backup size does not match. Choose another backup.");
  const file = Buffer.from(await data.arrayBuffer());
  if (backupDigest(file) !== row.sha256) throw Error("Stored backup verification failed. Choose another backup.");
  return decryptBackup(file, secret);
}

async function cleanArchive() {
  const db = createAdminClient();
  const { data, error } = await db.from("platform_backups").select("*").eq("status", "ready");
  if (error) throw Error("Could not read retention history.");
  for (const id of expiredBackupIds(data as StoredSchoolBackup[])) {
    const removed = await archive().remove([pathFor(id)]);
    if (removed.error) throw Error("Old files could not be removed; extra copies have been kept.");
    const updated = await db.from("platform_backups").update({ status: "expired" }).eq("id", id).eq("status", "ready");
    if (updated.error) throw Error("Could not update retention history.");
  }
  // A terminated process can leave an uploaded file before its completion record.
  // Failed attempt IDs have independent paths; wait a full day before deleting these remnants.
  const stale = await db.from("platform_backups").select("id").eq("status", "failed").is("cleaned_at", null)
    .lt("started_at", new Date(Date.now() - 86400000).toISOString()).order("started_at").limit(100);
  if (stale.error) throw Error("Could not check incomplete files.");
  if (stale.data?.length) {
    const removed = await archive().remove(stale.data.map(row => pathFor(row.id)));
    if (removed.error) throw Error("Incomplete files could not be removed.");
    const marked = await db.from("platform_backups").update({ cleaned_at: new Date().toISOString() }).in("id", stale.data.map(row => row.id)).eq("status", "failed");
    if (marked.error) throw Error("Could not record incomplete-file cleanup.");
  }
}

export async function createStoredBackup(input: { key: string; source: "weekly" | "manual"; adminId?: string }) {
  const secret = archiveSecret(), keyId = backupKeyId(secret), db = createAdminClient();
  const claim = await db.rpc("claim_school_backup", { p_key: input.key, p_source: input.source, p_admin: input.adminId ?? null });
  if (claim.error || !claim.data) throw Error("Could not start the backup. Check the database connection and weekly backup migration.");
  const state = claim.data as { state: "claimed" | "busy" | "already_complete"; job?: StoredSchoolBackup };
  if (state.state !== "claimed") return { state: state.state, id: state.job?.id };
  const job = state.job!;
  let stage = "Could not prepare private backup storage.";
  try {
    const bucket = await db.storage.getBucket(AUTOMATIC_BACKUP_BUCKET);
    if (bucket.error || !bucket.data || bucket.data.public || bucket.data.file_size_limit !== MAX_BACKUP_BYTES) throw Error(stage);
    const olderKeys = await db.from("platform_backups").select("id").eq("status", "ready").neq("key_id", keyId).limit(1);
    if (olderKeys.error) throw Error(stage);
    if (olderKeys.data?.length) throw Error("The encryption secret changed. Restore the original AUTOMATIC_BACKUP_SECRET before creating more backups.");
    stage = "Could not capture platform records. The database may be busy; retry shortly.";
    const captured = await db.rpc("capture_scheduled_school_backup");
    if (captured.error || !captured.data) throw Error(stage);
    const snapshot = captured.data as SchoolBackup;
    stage = "Could not encrypt the snapshot. Check the 32 MB file and 128 MB expanded save limits.";
    const file = encryptBackup(snapshot, secret), digest = backupDigest(file);
    stage = "Could not upload the encrypted backup. Check Supabase Storage space and availability.";
    const upload = await archive().upload(pathFor(job.id), file, { contentType: "application/octet-stream", upsert: false });
    if (upload.error) throw Error(stage);
    stage = "The uploaded file could not be verified. Older backups have been kept.";
    const verified = await archive().download(pathFor(job.id));
    if (verified.error || !verified.data || verified.data.size !== file.length || backupDigest(Buffer.from(await verified.data.arrayBuffer())) !== digest) throw Error(stage);
    stage = "Could not finish recording the backup. Retry to capture a new snapshot.";
    const completed = await db.from("platform_backups").update({ status: "ready", completed_at: new Date().toISOString(), snapshot_at: snapshot.created_at,
      byte_size: file.length, sha256: digest, key_id: keyId, error_message: null })
      .eq("id", job.id).eq("status", "running").gt("lease_until", new Date().toISOString()).select("id").maybeSingle();
    if (completed.error || !completed.data) throw Error(stage);
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("The encryption secret changed") ? error.message : stage;
    // Do not expose database internals, school records, keys, or passwords in error history.
    await db.from("platform_backups").update({ status: "failed", completed_at: new Date().toISOString(), error_message: message }).eq("id", job.id).eq("status", "running");
    // Leave any upload for later cleanup: a lost response may hide a successful commit.
    throw Error(message);
  }
  let warning: string | null = null;
  try { await cleanArchive(); } catch { warning = "Backup saved. Retention cleanup needs another attempt; extra files may remain. It runs again after the next successful backup."; }
  const audit = await db.from("admin_audit_log").insert({ admin_id: input.adminId ?? null, action: "create_stored_backup", entity: "system", details: { backup_id: job.id, source: input.source } });
  if (audit.error) warning = (warning ? warning + " " : "") + "Backup saved, but its audit entry could not be recorded.";
  if (warning) await db.from("platform_backups").update({ retention_warning: warning }).eq("id", job.id);
  return { state: "ready" as const, id: job.id, warning };
}

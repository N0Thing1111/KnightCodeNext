import { readStoredBackup } from "@/lib/automatic-backups";
import { prepareTransfer, transferStorage, discardTransfer } from "@/lib/backup-transfer";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { captureBackup, encryptBackup } from "@/lib/admin-backup";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(r: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in as administrator again." }, { status: 401 });
  const host = r.headers.get("x-forwarded-host") || r.headers.get("host") || new URL(r.url).host;
  const origin = r.headers.get("origin");
  if (!origin || new URL(origin).host !== host) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let path: string | null = null;
  try {
    const f = await r.formData(),
      password = String(f.get("backup_password") || ""),
      confirm = String(f.get("backup_confirm") || ""),
      current = String(f.get("admin_password") || "");
    if (password !== confirm) throw Error("Backup passwords do not match.");
    const s = await createClient(),
      check = await s.auth.signInWithPassword({
        email: admin.email,
        password: current,
      });
    if (check.error) throw Error("Administrator password is incorrect.");
    const savedId = String(f.get("backup_id") || "");
    if (password.length < 12) throw Error("Use a backup password of at least 12 characters.");
    const snapshot = savedId ? await readStoredBackup(savedId) : await captureBackup(admin.id);
    const file = encryptBackup(snapshot, password);
    await createAdminClient()
      .from("admin_audit_log")
      .insert({
        admin_id: admin.id,
        action: savedId ? "download_stored_backup" : "download_backup",
        details: savedId ? { backup_id: savedId, snapshot_at: snapshot.created_at } : {},
        entity: "system",
      });
    path = await prepareTransfer(admin.id);
    const storage = transferStorage();
    const upload = await storage.upload(path, file, { contentType: "application/octet-stream", upsert: false });
    if (upload.error) throw Error("Could not store the encrypted download. Check available Storage space.");
    const filename = "KnightCode-" + new Date(snapshot.created_at).toISOString().replaceAll(":", "-") + ".knightsave";
    const signed = await storage.createSignedUrl(path, 300, { download: filename });
    if (signed.error || !signed.data) throw Error("Could not prepare the download link.");
    return NextResponse.json({ url: signed.data.signedUrl, path, filename }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (path) await discardTransfer(path, admin.id).catch(() => {});
    return NextResponse.json({ error: e instanceof Error ? e.message : "Backup failed." }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}

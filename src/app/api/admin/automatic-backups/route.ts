import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createStoredBackup, getStoredBackup } from "@/lib/automatic-backups";
import { validBackupId } from "@/lib/automatic-backup-rules";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in as administrator again." }, { status: 401 });
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
    if (!origin || new URL(origin).host !== host) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const form = await request.formData(), client = await createClient();
    const check = await client.auth.signInWithPassword({ email: admin.email, password: String(form.get("admin_password") || "") });
    if (check.error) throw Error("Administrator password is incorrect.");
    const retryId = String(form.get("retry_id") || ""), requestId = String(form.get("request_id") || "");
    let input: Parameters<typeof createStoredBackup>[0];
    if (retryId) {
      const row = await getStoredBackup(retryId);
      if (row.status !== "failed" && !(row.status === "running" && Date.parse(row.lease_until) < Date.now())) throw Error("Only failed or timed-out backups can be retried.");
      input = { key: row.job_key, source: row.source, adminId: admin.id };
    } else {
      if (!validBackupId(requestId)) throw Error("Refresh the page before trying again.");
      input = { key: "manual:" + requestId.toLowerCase(), source: "manual", adminId: admin.id };
    }
    const result = await createStoredBackup(input);
    return NextResponse.json(result, { status: result.state === "busy" ? 409 : 200, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup failed." }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}

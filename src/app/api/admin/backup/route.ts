import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { captureBackup, encryptBackup } from "@/lib/admin-backup";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(r: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin-login", r.url), 303);
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
    const file = encryptBackup(await captureBackup(), password);
    await createAdminClient()
      .from("admin_audit_log")
      .insert({
        admin_id: admin.id,
        action: "download_backup",
        entity: "system",
      });
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition":
          'attachment; filename="KnightCode-' +
          new Date().toISOString().replaceAll(":", "-") +
          '.knightsave"',
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        "/admin/backup?error=" +
          encodeURIComponent(e instanceof Error ? e.message : "Backup failed."),
        r.url,
      ),
      303,
    );
  }
}

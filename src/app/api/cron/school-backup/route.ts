import { NextResponse } from "next/server";
import { authorizedCron, weeklyBackupKey } from "@/lib/automatic-backup-rules";
import { createStoredBackup } from "@/lib/automatic-backups";
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!authorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    return NextResponse.json({ error: "Scheduled backups run in production only." }, { status: 403 });
  try {
    const result = await createStoredBackup({ key: weeklyBackupKey(), source: "weekly" });
    return NextResponse.json(result, { status: result.state === "busy" ? 409 : 200, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Automatic backup failed." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}

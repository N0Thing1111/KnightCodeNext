import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizedCron } from "@/lib/automatic-backup-rules";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "cache-control": "no-store" };
  if (
    !authorizedCron(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  )
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers },
    );
  if (process.env.VERCEL_ENV !== "production")
    return NextResponse.json(
      { error: "Automatic cleanup runs in production only." },
      { status: 403, headers },
    );

  let gameSessions = 0,
    pythonRuns = 0,
    codeExecutions = 0,
    batches = 0,
    batchFull = false;
  try {
    const db = createAdminClient();
    const started = Date.now();
    // Each RPC commits a bounded atomic batch. A failed/repeated request cannot
    // delete submitted work or carry the same session totals forward twice.
    do {
      const { data, error } = await db.rpc("cleanup_old_run_history", {
        p_execute: true,
      });
      if (error) throw Error(error.message);
      gameSessions += data.game_sessions;
      pythonRuns += data.python_runs;
      codeExecutions += data.code_executions;
      batches++;
      batchFull = data.batch_full;
    } while (batchFull && batches < 10 && Date.now() - started < 180_000);
    return NextResponse.json(
      {
        gameSessions,
        pythonRuns,
        codeExecutions,
        batches,
        moreMayRemain: batchFull,
      },
      { headers },
    );
  } catch (error) {
    console.error("Automatic run history cleanup failed:", error);
    return NextResponse.json(
      {
        error:
          "Automatic cleanup did not finish. Check Audit History and server logs before retrying.",
      },
      { status: 500, headers },
    );
  } finally {
    if (gameSessions || pythonRuns) revalidatePath("/", "layout");
  }
}

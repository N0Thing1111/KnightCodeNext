import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pythonRequestSchema } from "@/lib/python-contract";

export async function POST(request: NextRequest) {
  // Cookie-authenticated mutations are same-origin only.
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 160000)
    return NextResponse.json(
      { error: "Python record is too large." },
      { status: 413 },
    );
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = pythonRequestSchema.safeParse(value);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid Python record." },
      { status: 400 },
    );
  const db = await createClient();
  const { data: claims, error: authError } = await db.auth.getClaims();
  if (authError || !claims?.claims?.sub)
    return NextResponse.json(
      {
        error: "Sign in again before saving. Your code is still in the editor.",
      },
      { status: 401 },
    );
  const p = parsed.data;
  let response;
  switch (p.op) {
    case "draft":
      response = await db.rpc("python_save_draft", {
        p_activity: p.activity,
        p_source: p.source,
      });
      break;
    case "start":
      response = await db.rpc("python_start_run_checked", {
        p_revision: p.revision,
        p_activity: p.activity,
        p_run: p.id,
        p_source: p.source,
      });
      break;
    case "finish":
      response = await db.rpc("python_finish_run", {
        p_run: p.id,
        p_status: p.status,
        p_result: p.result,
      });
      break;
    case "submit":
      response = await db.rpc("python_submit", { p_run: p.id });
      break;
    case "review":
      response = await db.rpc("python_review", {
        p_submission: p.submission,
        p_status: p.status,
        p_logic: p.logic,
        p_application: p.application,
        p_correctness: p.correctness,
        p_feedback: p.feedback,
      });
      break;
    case "activity":
      response = await db.rpc("python_update_activity", {
        p_activity: p.activity,
        p_content: p.content,
        p_published: p.published,
      });
      break;
  }
  if (response.error)
    return NextResponse.json(
      { error: response.error.message },
      { status: 400 },
    );
  return NextResponse.json(
    { ok: true, data: response.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

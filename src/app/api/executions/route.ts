import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const position = z.number().finite().min(-1000000).max(1000000);
const execution = z.object({
  level_id: z.number().int().positive(),
  run_id: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  scene_name: z.string().regex(/^\d+$/),
  execution_number: z.number().int().min(1).max(100000),
  restart_number: z.number().int().min(0).max(1000000),
  source: z.string().max(32768),
  source_truncated: z.boolean(),
  status: z.enum([
    "running",
    "finished",
    "warning",
    "rejected",
    "completed",
    "interrupted",
  ]),
  warning: z.string().max(500).nullable().optional(),
  code_mode: z.enum(["guided", "hint", "free"]),
  start_x: position,
  start_y: position,
  end_x: position,
  end_y: position,
  elapsed_ms: z.number().int().min(0).max(86400000),
});

export async function POST(request: Request) {
  const parsed = execution.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, message: "Invalid Run history." },
      { status: 422 },
    );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { ok: false, message: "You must be signed in." },
      { status: 401 },
    );
  const { error } = await supabase.rpc("record_code_execution", {
    p_level_id: parsed.data.level_id,
    p_payload: parsed.data,
  });
  if (error) {
    const invalid = ["Invalid Run history", "Invalid Run position", "Run source cannot be replaced", "Save level progress before Run history"].includes(error.message);
    const denied = error.message.includes("not assigned") || error.message.includes("authentication required");
    return NextResponse.json(
      { ok: false, message: "Unable to save Run history." },
      { status: invalid ? 422 : denied ? 403 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

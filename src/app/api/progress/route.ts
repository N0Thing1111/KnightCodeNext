import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payload = z
  .object({
    level_id: z.number().int().positive(),
    completed: z.boolean(),
    telemetry_version: z.union([z.literal(1), z.literal(2)]),
    run_id: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
    sequence: z.number().int().min(1),
    scene_name: z.string().regex(/^\d+$/),
    attempts: z.number().int().min(1).max(100),
    mistakes: z.number().int().min(0).max(1000),
    play_time_seconds: z.number().int().min(0).max(86400),
    total_play_time_seconds: z.number().int().min(0).max(86400),
    lines_used: z.number().int().min(0).max(10000),
    completed_lines: z.number().int().min(0).max(10000),
    code_mode: z.enum(["guided", "hint", "free"]).optional().nullable(),
  })
  .refine(
    (row) =>
      row.play_time_seconds <= row.total_play_time_seconds &&
      row.completed_lines <= row.lines_used,
    "Inconsistent telemetry counters.",
  );

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid game telemetry.",
      },
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
  const { data, error } = await supabase.rpc("record_level_progress", {
    p_level_id: parsed.data.level_id,
    p_payload: parsed.data,
  });
  if (error)
    return NextResponse.json(
      {
        ok: false,
        message: error.message.includes("not assigned")
          ? "This level is not assigned or is still locked."
          : "Unable to save progress right now.",
      },
      { status: error.message.includes("not assigned") ? 403 : 500 },
    );
  return NextResponse.json({ ok: true, ...data });
}

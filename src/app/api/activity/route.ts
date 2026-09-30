import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const schema = z.object({
  actionType: z.enum(["lesson_viewed", "session_heartbeat"]),
  lessonId: z.number().int().positive().optional(),
  levelId: z.number().int().positive().optional(),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (
    !parsed.success ||
    (parsed.data.actionType === "lesson_viewed" && !parsed.data.lessonId)
  )
    return NextResponse.json({ ok: false }, { status: 422 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { error } = await supabase.rpc("record_student_activity", {
    p_action: parsed.data.actionType,
    p_lesson_id: parsed.data.lessonId ?? null,
    p_level_id: parsed.data.levelId ?? null,
  });
  return error
    ? NextResponse.json(
        { ok: false, message: "Unable to log activity." },
        { status: 500 },
      )
    : NextResponse.json({ ok: true });
}

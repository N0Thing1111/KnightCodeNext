import { getCurrentStudent } from '@/lib/auth';
import { getNotifications } from '@/lib/student-data';
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  const parsed = z
    .object({ notificationId: z.number().int().positive().nullable() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  let query = supabase
    .from("student_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("student_id", user.id);
  if (parsed.data.notificationId)
    query = query.eq("id", parsed.data.notificationId);
  else query = query.eq("is_read", false);
  const { error } = await query;
  return error
    ? NextResponse.json({ ok: false }, { status: 500 })
    : NextResponse.json({ ok: true });
}

export async function GET() {
  const actor = await getCurrentStudent();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const notifications = await getNotifications(actor.id);
  return NextResponse.json({ notifications }, { headers: { 'Cache-Control': 'private, no-store' } });
}

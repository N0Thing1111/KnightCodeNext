import { z } from "zod";
import { getCurrentTeacher } from '@/lib/auth';
import { getTeacherNotifications } from '@/lib/teacher-data';
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(req: Request) {
  const t = await requireTeacher();
  const parsed = z.object({ id: z.number().int().positive().nullable() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });
  const { id } = parsed.data;
  let q = createAdminClient()
    .from("teacher_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("teacher_id", t.id)
    .eq("is_read", false);
  if (id) q = q.eq("id", Number(id));
  const { error } = await q;
  return NextResponse.json({ ok: !error }, { status: error ? 400 : 200 });
}

export async function GET() {
  const actor = await getCurrentTeacher();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const notifications = await getTeacherNotifications(actor.id);
  return NextResponse.json({ notifications }, { headers: { 'Cache-Control': 'private, no-store' } });
}

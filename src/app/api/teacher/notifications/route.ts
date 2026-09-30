import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(req: Request) {
  const t = await requireTeacher();
  const { id } = await req.json();
  let q = createAdminClient()
    .from("teacher_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("teacher_id", t.id)
    .eq("is_read", false);
  if (id) q = q.eq("id", Number(id));
  const { error } = await q;
  return NextResponse.json({ ok: !error }, { status: error ? 400 : 200 });
}

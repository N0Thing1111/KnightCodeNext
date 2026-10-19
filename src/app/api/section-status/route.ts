import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
 const db = await createClient();
 const { data, error } = await db.rpc("get_student_section_status");
 if (error) return NextResponse.json({ error: "Unable to check section status." }, { status: 503 });
 return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

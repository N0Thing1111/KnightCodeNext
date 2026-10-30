import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth";
export async function POST() { await requireTeacher(); return NextResponse.json({error:"Use class invitations instead of teacher imports. Open your class to create an invitation code."},{status:410}); }

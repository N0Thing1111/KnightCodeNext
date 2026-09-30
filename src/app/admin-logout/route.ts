import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(r: Request) {
  const s = await createClient();
  await s.auth.signOut();
  return NextResponse.redirect(new URL("/admin-login", r.url), 303);
}

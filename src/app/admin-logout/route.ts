import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// GET/prefetch requests must never invalidate a session.
export async function POST(r: Request) {
  const s = await createClient();
  await s.auth.signOut();
  return NextResponse.redirect(new URL("/admin-login", r.url), 303);
}

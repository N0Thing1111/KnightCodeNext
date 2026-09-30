import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}

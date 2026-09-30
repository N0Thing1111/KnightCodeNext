import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  const parsed = z
    .object({ theme: z.enum(["light", "dark"]) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, message: "Invalid theme." },
      { status: 422 },
    );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: parsed.data.theme })
    .eq("id", user.id);
  return error
    ? NextResponse.json(
        { ok: false, message: "Unable to save theme." },
        { status: 500 },
      )
    : NextResponse.json({ ok: true });
}

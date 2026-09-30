import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
function fail(r: NextRequest, m: string) {
  return NextResponse.redirect(
    new URL("/admin-login?error=" + encodeURIComponent(m), r.url),
    303,
  );
}
export async function POST(r: NextRequest) {
  const f = await r.formData(),
    email = String(f.get("email") || "")
      .trim()
      .toLowerCase(),
    password = String(f.get("password") || "");
  if (!email || !password)
    return fail(r, "Enter your administrator email and password.");
  const response = NextResponse.redirect(new URL("/admin", r.url), 303),
    s = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => r.cookies.getAll(),
          setAll: (v) =>
            v.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            ),
        },
      },
    );
  const { error } = await s.auth.signInWithPassword({ email, password });
  if (error) return fail(r, "Invalid administrator email or password.");
  const {
      data: { user },
    } = await s.auth.getUser(),
    { data: p } = await createAdminClient()
      .from("profiles")
      .select("role,active")
      .eq("id", user!.id)
      .maybeSingle();
  if (!p || p.role !== "admin" || !p.active) {
    await s.auth.signOut();
    return fail(r, "This account cannot access school administration.");
  }
  await createAdminClient()
    .from("admin_audit_log")
    .insert({
      admin_id: user!.id,
      action: "sign_in",
      entity: "admin",
      record_id: user!.id,
    });
  return response;
}

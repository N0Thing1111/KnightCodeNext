import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
function fail(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL("/teacher-login?error=" + encodeURIComponent(message), request.url),
    303,
  );
}
export async function POST(request: NextRequest) {
  const form = await request.formData(),
    identifier = String(form.get("identifier") ?? "")
      .trim()
      .toLowerCase(),
    password = String(form.get("password") ?? "");
  if (!identifier || !password)
    return fail(request, "Please enter your username or email and password.");
  let email = identifier;
  if (!identifier.includes("@")) {
    if (!/^[a-z0-9._-]{1,80}$/.test(identifier)) return fail(request, "Invalid username/email or password.");
    const { data } = await createAdminClient()
      .from("profiles")
      .select("email")
      .eq("role", "teacher")
      .or(`username.eq.${identifier},teacher_id.ilike.${identifier}`)
      .eq("active", true)
      .limit(2);
    if (!data || data.length !== 1)
      return fail(request, "Invalid username/email or password.");
    email = data[0].email;
  }
  const response = NextResponse.redirect(
    new URL("/teacher/dashboard", request.url),
    303,
  );
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) =>
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(request, error.code === "email_not_confirmed" ? "Verify your email before signing in. Check your inbox and spam folder." : "Invalid username/email or password.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("role,active,onboarding_status")
    .eq("id", user!.id)
    .maybeSingle();
  if (!profile || profile.role !== "teacher" || !profile.active) {
    await supabase.auth.signOut();
    return fail(request, profile?.onboarding_status === "pending" ? "Verify your email before accessing the teacher portal." : "This account cannot access the teacher portal.");
  }
  return response;
}

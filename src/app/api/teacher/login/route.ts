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
    return fail(request, "Please enter your Teacher ID or email and password.");
  let email = identifier;
  if (!identifier.includes("@")) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("email")
      .eq("role", "teacher")
      .ilike("teacher_id", identifier)
      .eq("active", true)
      .limit(2);
    if (!data || data.length !== 1)
      return fail(request, "Invalid Teacher ID/email or password.");
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
  if (error) return fail(request, "Invalid Teacher ID/email or password.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("role,active")
    .eq("id", user!.id)
    .maybeSingle();
  if (!profile || profile.role !== "teacher" || !profile.active) {
    await supabase.auth.signOut();
    return fail(request, "This account cannot access the teacher portal.");
  }
  return response;
}

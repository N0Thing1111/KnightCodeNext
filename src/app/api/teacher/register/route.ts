import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function redirectError(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(
      "/teacher-register?error=" + encodeURIComponent(message),
      request.url,
    ),
    303,
  );
}
function schoolCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  const school = schoolCode(String(form.get("school_code") || ""));
  const password = String(form.get("password") || "");
  const confirm = String(form.get("confirm_password") || "");
  const db = createAdminClient();
  const access = await db
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "teacher_registration")
    .maybeSingle();
  const allowed =
    access.data?.setting_value === "1" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.KC_ALLOW_TEACHER_REGISTRATION === "1");
  if (!allowed)
    return redirectError(
      request,
      "Teacher self-registration is not available.",
    );
  if (!name || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return redirectError(request, "Enter your name and a valid email address.");
  if (!school)
    return redirectError(request, "Enter a school or institution code.");
  if (password.length < 8)
    return redirectError(request, "Password must be at least 8 characters.");
  if (password !== confirm)
    return redirectError(request, "Passwords do not match.");
  const duplicate = await db
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (duplicate.data)
    return redirectError(
      request,
      "An account with that email already exists. Try signing in instead.",
    );
  const teacherId =
    "TCH-" +
    new Date().getFullYear() +
    "-" +
    crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "teacher" },
      user_metadata: { role: "teacher", name, teacher_id: teacherId },
  });
  if (created.error || !created.data.user)
    return redirectError(
      request,
      "Something went wrong while creating your account. Please try again.",
    );
  const updated = await db
    .from("profiles")
    .update({ teacher_id: teacherId, school_code: school, active: true })
    .eq("id", created.data.user.id);
  if (updated.error) {
    await db.auth.admin.deleteUser(created.data.user.id);
    return redirectError(
      request,
      "Something went wrong while creating your account. Please try again.",
    );
  }
  return NextResponse.redirect(
    new URL(
      "/teacher-login?notice=" +
        encodeURIComponent(
          "Account created. Sign in with " + teacherId + " or your email.",
        ),
      request.url,
    ),
    303,
  );
}

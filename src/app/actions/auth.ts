"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState = { error?: string };

export async function login(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password)
    return {
      error: "Please enter your Student ID, username, or email and password.",
    };
  let email = identifier;
  if (!identifier.includes("@")) {
    if (!/^[a-z0-9._-]{1,80}$/.test(identifier)) {
      return { error: "Invalid Student ID / username / email or password." };
    }
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("profiles")
        .select("email")
        .eq("role", "student")
        .or(`username.eq.${identifier},student_id.eq.${identifier}`)
        .eq("active", true)
        .limit(2);
      if (!data || data.length !== 1)
        return {
          error:
            data && data.length > 1
              ? "This Student ID matches more than one account. Please sign in with your username or email instead."
              : "Invalid Student ID / username / email or password.",
        };
      email = data[0].email;
    } catch {
      return {
        error:
          "Student sign-in is not configured yet. Follow SUPABASE-SETUP.md.",
      };
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    return { error: "Invalid Student ID / username / email or password." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("id", user!.id)
    .maybeSingle();
  if (!profile || profile.role !== "student" || !profile.active) {
    await supabase.auth.signOut();
    return { error: "This account cannot access the student portal." };
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

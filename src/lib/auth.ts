import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import type { TeacherProfile } from "@/lib/teacher-data";

const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data: claimData, error: claimError } =
    await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (claimError || !userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("active", true)
    .maybeSingle();
  return data as
    | (Profile & { teacher_id?: string | null })
    | null;
});
export const getCurrentStudent = cache(async () => {
  const p = await getCurrentProfile();
  return p?.role === "student" ? (p as Profile) : null;
});
export const getCurrentTeacher = cache(async () => {
  const p = await getCurrentProfile();
  return p?.role === "teacher" ? (p as TeacherProfile) : null;
});
export const getCurrentAdmin = cache(async () => {
  const p = await getCurrentProfile();
  return p?.role === "admin" ? (p as Profile) : null;
});
export async function requireStudent() {
  const p = await getCurrentStudent();
  if (!p) redirect("/login");
  return p;
}
export async function requireTeacher() {
  const p = await getCurrentTeacher();
  if (!p) redirect("/teacher-login");
  return p;
}
export async function requireAdmin() {
  const p = await getCurrentAdmin();
  if (!p) redirect("/admin-login");
  return p;
}

"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPasswordRecovery, clearPasswordRecovery } from "@/lib/password-recovery";
export type RecoveryState = { error?: string; success?: string };
export async function requestPasswordRecovery(_: RecoveryState, form: FormData): Promise<RecoveryState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  try {
    const h = await headers();
    const address = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const db = createAdminClient();
    for (const [key, max] of [["recovery-ip:" + address, 15], ["recovery-email:" + email, 3]] as const) {
      const limit = await db.rpc("consume_registration_limit", { p_key: createHash("sha256").update(key).digest("hex"), p_max: max });
      if (limit.error) return { error: "Password recovery is temporarily unavailable. Please try again later." };
      if (!limit.data) return { error: "Too many recovery requests. Try again in 15 minutes." };
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "http://localhost:3000");
    const client = await createClient();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: base.replace(/\/$/, "") + "/auth/callback" });
    // Do not reveal whether an account exists, including provider/account-specific errors.
    if (error && !["user_not_found", "email_not_confirmed", "over_email_send_rate_limit"].includes(error.code || ""))
      return { error: "Could not request the recovery email. Please wait a few minutes and try again." };
    return { success: "If an account uses this email, a password recovery link has been requested. Check your inbox and spam folder. Open the latest link in this same browser." };
  } catch { return { error: "Password recovery is temporarily unavailable. Please try again later." }; }
}
export async function resetRecoveredPassword(_: RecoveryState, form: FormData): Promise<RecoveryState> {
  const password = String(form.get("password") || "");
  if (password.length < 12 || password.length > 128) return { error: "Use a password of 12 to 128 characters." };
  if (password !== String(form.get("confirm_password") || "")) return { error: "The passwords do not match." };
  try {
    const client = await createClient();
    const { data, error: userError } = await client.auth.getUser();
    if (userError || !data.user || !(await hasPasswordRecovery(data.user.id))) return { error: "Your recovery session has expired. Request a new password recovery email." };
    const { error } = await client.auth.updateUser({ password });
    if (error) return { error: error.code === "same_password" ? "Choose a password different from your current password." : "Could not update the password. Use a strong new password and try again, or request a new recovery email." };
    await clearPasswordRecovery();
    await client.auth.signOut({ scope: "global" });

  } catch { return { error: "Could not complete password recovery. Please try again." }; }
  // Redirect outside the catch: Next.js implements redirects by throwing.
  redirect("/reset-password?success=1");
}

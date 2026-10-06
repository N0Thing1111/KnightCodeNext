// Local recovery tool for the project owner. Never expose this as a web route.
// Uses the existing service-role key in .env.local; passwords are not echoed.
import { createClient } from "@supabase/supabase-js";
import { emitKeypressEvents } from "node:readline";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

function readPassword(prompt) {
  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = Boolean(process.stdin.isRaw);
    const finish = (error) => {
      process.stdin.off("keypress", onKey);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write("\n");
      const result = value;
      value = "";
      if (error) reject(error);
      else resolve(result);
    };
    const onKey = (text, key = {}) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Cancelled. Password was not changed."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
      } else if (key.name === "backspace") {
        value = Array.from(value).slice(0, -1).join("");
      } else if (!key.ctrl && !key.meta && text && !/[\x00-\x1f\x7f]/.test(text)) {
        value += text;
      }
    };
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("keypress", onKey);
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || process.argv.length !== 3) {
    throw new Error('Usage: node scripts/recover-admin-password.mjs "admin@email.com"');
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run this directly in your terminal so the password can be entered privately.");
  }
  loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL or service-role key is missing from .env.local.");
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error } = await db.from("profiles")
    .select("id,email,role,active").eq("email", email).maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile || profile.role !== "admin" || !profile.active) {
    throw new Error("No active administrator has this email. Nothing was changed.");
  }
  const { data: account, error: authError } = await db.auth.admin.getUserById(profile.id);
  if (authError) throw new Error(authError.message);
  if (account.user.email?.toLowerCase() !== email) {
    throw new Error("The login email and profile email do not match. Nothing was changed.");
  }
  console.log(`Resetting the existing administrator: ${email}`);
  console.log("Use at least 12 characters. Nothing appears as you type. Ctrl+C cancels.");
  emitKeypressEvents(process.stdin);
  let password = await readPassword("New password: ");
  let confirmation = await readPassword("Enter it again: ");
  if (password.length < 12 || password !== confirmation) {
    password = confirmation = "";
    throw new Error("Passwords must match and contain at least 12 characters. Nothing was changed.");
  }
  const { error: updateError } = await db.auth.admin.updateUserById(profile.id, { password });
  password = confirmation = "";
  if (updateError) throw new Error(updateError.message);
  console.log("Password changed. Sign in at /admin-login with this email and your new password.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

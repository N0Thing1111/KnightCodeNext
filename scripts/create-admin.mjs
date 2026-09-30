import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

for (const line of readFileSync(
  new URL("../.env.local", import.meta.url),
  "utf8",
).split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()])
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}
const email = process.argv[2]?.trim().toLowerCase();
const name = process.argv[3]?.trim();
if (!email || !name) {
  console.error(
    'Usage: node scripts/create-admin.mjs "admin@example.com" "Administrator Name"',
  );
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.",
  );
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const existing = await supabase
  .from("profiles")
  .select("id,role")
  .eq("email", email)
  .maybeSingle();
if (existing.data)
  throw new Error(
    "That email already belongs to a " +
      existing.data.role +
      " account. Use a distinct administrator email.",
  );
const password = "KC-" + randomBytes(12).toString("hex") + "!";
const created = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "admin", name },
});
if (created.error || !created.data.user)
  throw created.error || new Error("Admin creation failed.");
const updated = await supabase
  .from("profiles")
  .update({
    role: "admin",
    name,
    email,
    active: true,
    must_change_password: true,
  })
  .eq("id", created.data.user.id);
if (updated.error) {
  await supabase.auth.admin.deleteUser(created.data.user.id);
  throw updated.error;
}
console.log("Administrator created: " + email);
console.log("Temporary password: " + password);
console.log("Sign in at /admin-login and change this password immediately.");

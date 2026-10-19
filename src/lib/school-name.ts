import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
export async function getSchoolName(db: ReturnType<typeof createAdminClient>): Promise<string> {
  try {
    const { data, error } = await db.from("admin_settings").select("setting_value").eq("setting_key", "school_name").maybeSingle();
    return !error && data?.setting_value?.trim() || "KnightCode";
  } catch { return "KnightCode"; }
}

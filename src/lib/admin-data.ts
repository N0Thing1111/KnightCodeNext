/* eslint-disable @typescript-eslint/no-explicit-any */
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export const getAdminContext = cache(async () => {
  const db = createAdminClient();
  const tables = [
    "profiles",
    "classes",
    "class_students",
    "lessons",
    "levels",
    "assignments",
    "student_level_progress",
    "student_activity",
    "student_level_sessions",
    "achievements",
    "student_achievements",
    "student_notifications",
    "student_telemetry_runs",
    "announcements",
    "teacher_notifications",
    "admin_settings",
    "admin_audit_log",
  ] as const;
  const results = await Promise.all(
    tables.map(async (table) => {
      let q: any = db.from(table).select("*");
      if (table === "profiles") q = q.order("created_at", { ascending: false });
      if (table === "lessons") q = q.order("order_number");
      if (table === "levels") q = q.order("level_number");
      if (table === "student_activity" || table === "admin_audit_log")
        q = q.order("created_at", { ascending: false }).limit(500);
      if (table === "student_level_sessions")
        q = q.order("started_at", { ascending: false }).limit(500);
      const { data, error } = await q;
      if (error) throw error;
      return [table, data ?? []] as const;
    }),
  );
  return Object.fromEntries(results) as Record<(typeof tables)[number], any[]>;
});

export function setting(
  ctx: Awaited<ReturnType<typeof getAdminContext>>,
  key: string,
  fallback = "",
) {
  return (
    ctx.admin_settings.find((x) => x.setting_key === key)?.setting_value ??
    fallback
  );
}
export function activeProfiles(
  ctx: Awaited<ReturnType<typeof getAdminContext>>,
  role: "student" | "teacher",
) {
  return ctx.profiles.filter((p) => p.role === role && p.active);
}
export function displayStatus(row: any, entity: string) {
  if (entity === "classes") return row.status;
  if (entity === "levels" || entity === "teachers" || entity === "students")
    return row.active ? "active" : "archived";
  return row.active === false ? "hidden" : "active";
}

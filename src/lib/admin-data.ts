/* eslint-disable @typescript-eslint/no-explicit-any */
import { allRows } from "@/lib/query-pages";
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
      const key = table === "admin_settings" ? "setting_key" : ["student_level_progress", "student_achievements", "student_telemetry_runs", "class_students"].includes(table) ? "student_id" : "id";
      const data = await allRows(() => {
        let q = db.from(table).select("*");
        if (["profiles","student_activity","admin_audit_log"].includes(table)) q = q.order("created_at", { ascending: false });
        if (table === "student_level_sessions") q = q.order("started_at", { ascending: false });
        if (table === "lessons") q = q.order("order_number");
        if (table === "levels") q = q.order("level_number");
        q = q.order(key);
        if (["student_level_progress","student_telemetry_runs"].includes(table)) q = q.order("level_id");
        if (table === "student_telemetry_runs") q = q.order("run_id");
        if (table === "class_students") q = q.order("class_id");
        if (table === "student_achievements") q = q.order("achievement_id");
        return q;
      });
      return [table, data] as const;
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

import { activityWeek } from "@/lib/activity-week";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { allRows } from "@/lib/query-pages";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// Master records for forms/settings only; event history is queried separately.
export const getAdminContext = cache(async () => {
 const db = createAdminClient();
 const tables = ["profiles", "classes", "class_students", "lessons", "levels", "admin_settings"] as const;
 const results = await Promise.all(tables.map(async table => {
  const data = await allRows(() => {
   let q = db.from(table).select("*");
   if (table === "profiles") q = q.order("created_at", { ascending: false });
   if (table === "lessons") q = q.order("order_number");
   if (table === "levels") q = q.order("level_number");
   if (table === "class_students") return q.order("class_id").order("student_id");
   return q.order(table === "admin_settings" ? "setting_key" : "id");
  });
  return [table, data] as const;
 }));
 return Object.fromEntries(results) as Record<(typeof tables)[number], any[]>;
});
export const getAdminSessionOverview = cache(async () => {
 const db = createAdminClient();
 const [recent, week] = await Promise.all([
  db.from("student_level_sessions").select("*").order("started_at", { ascending: false }).order("id", { ascending: false }).limit(5),
  Promise.all(activityWeek().map(async day => {
   const result = await db.from("student_level_sessions").select("id", { count: "exact", head: true }).gte("started_at", day.start).lt("started_at", day.end);
   if (result.error) throw Error(result.error.message);
   return { label: day.label, count: result.count || 0 };
  })),
 ]);
 if (recent.error) throw Error(recent.error.message);
 return { recent: recent.data || [], week };
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
  if (entity === "lessons" || entity === "levels" || entity === "teachers" || entity === "students")
    return row.active ? "active" : "archived";
  return row.active === false ? "hidden" : "active";
}

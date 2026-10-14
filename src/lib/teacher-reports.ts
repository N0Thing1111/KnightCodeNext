import "server-only";
import { getTeacherContext } from "@/lib/teacher-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { rowsForIds } from "@/lib/query-pages";
import { buildTeacherReport, type ReportFilters } from "@/lib/report-model";
export { reportTypes, reportLabels } from "@/lib/report-model";

export async function getTeacherReport(teacher: { id: string; name: string; school_code?: string | null }, filters: ReportFilters) {
  const ctx = await getTeacherContext(teacher.id);
  if (filters.section !== null && !ctx.classes.some(c => c.id === filters.section))
    throw Error("This section is not assigned to your teacher account.");
  const ids = ctx.students.filter(s => ctx.memberships.some(m => m.student_id === s.id && (filters.section === null || m.class_id === filters.section))).map(s => s.id);
  const db = createAdminClient();
  const [school, submissions, reviews] = await Promise.all([
    db.from("admin_settings").select("setting_value").eq("setting_key", "school_name").maybeSingle(),
    rowsForIds(ids, part => db.from("python_submissions").select("id,student_id,activity_id,submitted_at").in("student_id", part).order("id")),
    rowsForIds(ids, part => db.from("python_reviews").select("id,submission_id,status,created_at").in("student_id", part).order("id")),
  ]);
  if (school.error) throw Error(school.error.message);
  return {
    report: buildTeacherReport(ctx, filters, { teacher: teacher.name, school: school.data?.setting_value || teacher.school_code || "KnightCode" }, submissions, reviews),
    sections: ctx.classes.map(c => ({ id: c.id, name: c.name, section: c.section })),
  };
}

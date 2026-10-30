/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { getTeacherContext } from "@/lib/teacher-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { rowsForIds } from "@/lib/query-pages";
import { buildTeacherReport, type ReportFilters } from "@/lib/report-model";
export { reportTypes, reportLabels } from "@/lib/report-model";

export async function getTeacherReport(teacher: { id: string; name: string }, filters: ReportFilters) {
  const ctx = { ...await getTeacherContext(teacher.id) };
  if (filters.section !== null && !ctx.classes.some(c => c.id === filters.section))
    throw Error("This section is not assigned to your teacher account.");
  const ids = ctx.students.filter(s => ctx.memberships.some(m => m.student_id === s.id && (filters.section === null || m.class_id === filters.section))).map(s => s.id);
  const db = createAdminClient();
  if (filters.type === "activity") {
    const dateQuery = (query: any, column: string) => {
      if (filters.from) query = query.gte(column, filters.from + "T00:00:00+08:00");
      if (filters.to) query = query.lt(column, new Date(Date.parse(filters.to + "T00:00:00+08:00") + 86400000).toISOString());
      return query;
    };
    const [activity, pythonRuns] = await Promise.all([
      rowsForIds(ids, part => dateQuery(db.from("student_activity").select("*").in("student_id", part), "created_at").order("created_at").order("id")),
      rowsForIds(ids, part => dateQuery(db.from("python_runs").select("student_id,started_at").in("student_id", part), "started_at").order("started_at").order("id")),
    ]);
    ctx.activity = activity; ctx.pythonRuns = pythonRuns;
  }
  const [school, submissions, reviews] = await Promise.all([
    db.from("admin_settings").select("setting_value").eq("setting_key", "platform_name").maybeSingle(),
    rowsForIds(ids, part => db.from("python_submissions").select("id,student_id,activity_id,submitted_at").in("student_id", part).order("id")),
    rowsForIds(ids, part => db.from("python_reviews").select("id,submission_id,status,created_at").in("student_id", part).order("id")),
  ]);
  if (school.error) throw Error(school.error.message);
  return {
    report: buildTeacherReport(ctx, filters, { teacher: teacher.name, school: school.data?.setting_value || "KnightCode" }, submissions, reviews),
    sections: ctx.classes.map(c => ({ id: c.id, name: c.name, section: c.section })),
  };
}

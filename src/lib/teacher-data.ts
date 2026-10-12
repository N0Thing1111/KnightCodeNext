/* eslint-disable @typescript-eslint/no-explicit-any */
import { allRows, rowsForIds } from "@/lib/query-pages";
import { sessionAssessment, latestActivity } from "@/lib/student-assessment";
import { sectionLabel } from "@/lib/section-label";
import { cache } from "react";
import { getPythonCompletion } from "@/lib/python-data";
import { lessonCompletion } from "@/lib/lesson-completion";
import { isGameLevelAvailable } from "@/lib/game-build";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";

export type TeacherProfile = Profile & {
  teacher_id: string | null;
  school_code: string | null;
};
export type TeacherStudent = Profile & {
  classes: string;
  level: number;
  xp: number;
  progress_pct: number;
  completed_levels: number;
  total_levels: number;
  attempts: number;
  failed_attempts: number;
  mistakes: number;
  streak: number;
  last_activity: string | null;
  status: string;
};
const db = () => createAdminClient();
const unique = <T>(items: T[]) => [...new Set(items)];

export const getTeacherContext = cache(async (teacherId: string) => {
  const admin = db();
  const [classList, assignments, levels, lessons, notificationResult] = await Promise.all([
    allRows(() => admin.from("classes").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }).order("id")),
    allRows(() => admin.from("assignments").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }).order("id")),
    allRows(() => admin.from("levels").select("*").eq("active", true).order("level_number").order("id")),
    allRows(() => admin.from("lessons").select("*").eq("active", true).order("order_number").order("id")),
    admin.from("teacher_notifications").select("*").eq("teacher_id", teacherId).order("is_read").order("created_at", { ascending: false }).limit(12),
  ]);
  if (notificationResult.error) throw Error(notificationResult.error.message);
  const memberships = await rowsForIds(classList.map(c => c.id), ids => admin.from("class_students").select("*").in("class_id", ids).order("class_id").order("student_id"));
  const studentIds = unique(memberships.map(m => m.student_id));
  const [students, progress, activity, achievements, sessions, pythonRuns] = await Promise.all([
    rowsForIds(studentIds, ids => admin.from("profiles").select("*").in("id", ids).eq("role", "student").order("id")),
    rowsForIds(studentIds, ids => admin.from("student_level_progress").select("*").in("student_id", ids).order("student_id").order("level_id")),
    rowsForIds(studentIds, ids => admin.from("student_activity").select("*").in("student_id", ids).order("created_at", { ascending: false }).order("id")),
    rowsForIds(studentIds, ids => admin.from("student_achievements").select("*,achievements(*)").in("student_id", ids).order("student_id").order("achievement_id")),
    rowsForIds(studentIds, ids => admin.from("student_level_sessions").select("*").in("student_id", ids).order("started_at", { ascending: false }).order("id")),
    rowsForIds(studentIds, ids => admin.from("python_runs").select("id,student_id,started_at").in("student_id", ids).order("started_at", { ascending: false }).order("id")),
  ]);
  activity.sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at));
  sessions.sort((a,b) => Date.parse(b.started_at)-Date.parse(a.started_at));
  return { classes: classList, assignments, levels, lessons, memberships, students, progress,
    activity, achievements, sessions, pythonRuns, notifications: notificationResult.data || [], python: await getPythonCompletion() };
});

export function assignedLevelIds(
  ctx: Awaited<ReturnType<typeof getTeacherContext>>,
  studentId: string,
) {
  const classIds = new Set(
    ctx.memberships
      .filter((m) => m.student_id === studentId)
      .map((m) => m.class_id),
  );
  const result = new Set<number>();
  for (const a of ctx.assignments) {
    if (
      a.student_id !== studentId &&
      (!a.class_id || !classIds.has(a.class_id))
    )
      continue;
    if (a.level_id) {
      if (ctx.levels.some(l => l.id === Number(a.level_id) && isGameLevelAvailable(l))) result.add(Number(a.level_id));
    }
    else if (a.lesson_id)
      ctx.levels
        .filter((l) => l.lesson_id === a.lesson_id && isGameLevelAvailable(l))
        .forEach((l) => result.add(Number(l.id)));
  }
  return result;
}
function statusFor(last: string | null, progress: number, failed: number) {
  if (!last) return "Inactive";
  const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
  if (days >= 14) return "Inactive";
  if (days <= 1 && progress >= 20) return "Active";
  if (days <= 7 && progress >= 15 && failed < 5) return "On Track";
  if (progress < 15 || failed >= 5 || days >= 7) return "Needs Attention";
  return "Recently Active";
}
export function teacherStudents(
  ctx: Awaited<ReturnType<typeof getTeacherContext>>,
): TeacherStudent[] {
  return ctx.students.map((student) => {
    const classRows = ctx.memberships
      .filter((m) => m.student_id === student.id)
      .map((m) => ctx.classes.find((c) => c.id === m.class_id))
      .filter(Boolean);
    const scope = assignedLevelIds(ctx, student.id);
    const rows = ctx.progress.filter(
      (p) => p.student_id === student.id && scope.has(Number(p.level_id)),
    );
    const completed = rows.filter((p) => p.completed).length;
    const attempts = rows.reduce((n, p) => n + Number(p.attempts || 0), 0);
    const mistakes = rows.reduce((n, p) => n + Number(p.mistakes || 0), 0);
    const assessment = sessionAssessment(ctx.sessions.filter(s => s.student_id === student.id && scope.has(Number(s.level_id))));
    const last = latestActivity([
      ...ctx.activity.filter(a => a.student_id === student.id).map(a => a.created_at),
      ...ctx.pythonRuns.filter(r => r.student_id === student.id).map(r => r.started_at),
      ...rows.map(p => p.updated_at),
    ]);
    const pct = scope.size
      ? Math.round((completed / scope.size) * 1000) / 10
      : 0;
    return {
      ...student,
      classes: classRows.map((c) => sectionLabel(c!)).join(", "),
      level: Math.floor(Number(student.total_xp || 0) / 500) + 1,
      xp: Number(student.total_xp || 0),
      progress_pct: pct,
      completed_levels: completed,
      total_levels: scope.size,
      attempts,
      failed_attempts: assessment.unsuccessful,
      mistakes,
      streak: Number(student.current_streak || 0),
      last_activity: last,
      status: scope.size ? statusFor(last, pct, assessment.unsuccessful) : (last && Date.now() - Date.parse(last) < 14 * 86400000 ? "Recently Active" : "Inactive"),
    } as TeacherStudent;
  });
}
export function assignmentCounts(
  ctx: Awaited<ReturnType<typeof getTeacherContext>>,
  assignment: any,
) {
  const targetIds = assignment.student_id
    ? [assignment.student_id]
    : ctx.memberships
        .filter((m) => m.class_id === assignment.class_id)
        .map((m) => m.student_id);
  let done = 0;
  for (const sid of unique(targetIds)) {
    if (assignment.level_id) {
      const level = ctx.levels.find(l => l.id === Number(assignment.level_id));
      if (level && level.active !== false && isGameLevelAvailable(level) && ctx.progress.some(p => p.student_id === sid && p.level_id === level.id && p.completed)) done++;
    } else if (lessonCompletion(Number(assignment.lesson_id), sid, ctx.levels, ctx.progress, ctx.python.activities, ctx.python.submissions).complete) done++;
  }
  return { target: unique(targetIds).length, done };
}
export function teacherStats(
  ctx: Awaited<ReturnType<typeof getTeacherContext>>,
) {
  const rows = teacherStudents(ctx);
  const active = rows.filter(
    (s) =>
      s.last_activity &&
      Date.now() - new Date(s.last_activity).getTime() < 7 * 86400000,
  ).length;
  return {
    students: rows.length,
    classes: ctx.classes.filter((c) => c.status === "active").length,
    active_students: active,
    avg_progress: rows.length
      ? Math.round(
          (rows.reduce((n, s) => n + s.progress_pct, 0) / rows.length) * 10,
        ) / 10
      : 0,
    avg_xp: rows.length
      ? Math.round(rows.reduce((n, s) => n + s.xp, 0) / rows.length)
      : 0,
    needs_attention: rows.filter((s) => s.status === "Needs Attention").length,
  };
}
export { avatar } from "@/lib/teacher-avatar";
export function formatTime(value: number | null | undefined) {
  if (value == null) return "—";
  const m = Math.floor(value / 60),
    s = value % 60;
  return m ? m + "m " + s + "s" : s + "s";
}

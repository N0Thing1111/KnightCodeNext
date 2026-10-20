/* eslint-disable @typescript-eslint/no-explicit-any */
import { allRows, rowsForIds } from "@/lib/query-pages";
import { latestActivity } from "@/lib/student-assessment";
import { monitoringStatus, runOutcomes, type RunOutcomes } from "@/lib/student-monitoring";
import { sectionLabel } from "@/lib/section-label";
import { cache } from "react";
import { learningStreak } from "./learning-streak";
import { getPythonCompletion } from "@/lib/python-data";
import { lessonCompletion, summarizeCompletion } from "@/lib/lesson-completion";
import { isGameLevelAvailable } from "@/lib/game-build";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";

export type TeacherProfile = Profile & {
  teacher_id: string | null;
};
export type TeacherStudent = Profile & {
  classes: string;
  level: number;
  xp: number;
  progress_pct: number;
  completed_levels: number;
  total_levels: number;
  attempts: number;
  game_outcomes: RunOutcomes;
  python_outcomes: RunOutcomes;
  status_reason: string;
  mistakes: number;
  streak: number;
  last_activity: string | null;
  status: string;
};
const db = () => createAdminClient();
const unique = <T>(items: T[]) => [...new Set(items)];

export const getTeacherNotifications = cache(async (teacherId: string) => {
 const result = await db().from("teacher_notifications").select("*").eq("teacher_id", teacherId).order("is_read").order("created_at", { ascending: false }).limit(12);
 if (result.error) throw Error(result.error.message);
 return result.data || [];
});
export const getTeacherContext = cache(async (teacherId: string) => {
 const admin = db();
 const [classList, assignments, allLevels, lessons, notifications, history, python] = await Promise.all([
  allRows(() => admin.from("classes").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }).order("id")),
  allRows(() => admin.from("assignments").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }).order("id")),
  allRows(() => admin.from("levels").select("*").eq("active", true).order("level_number").order("id")),
  allRows(() => admin.from("lessons").select("*").eq("active", true).order("order_number").order("id")),
  getTeacherNotifications(teacherId), admin.rpc("teacher_history_summary", { p_teacher: teacherId }), getPythonCompletion(),
 ]);
 if (history.error) throw Error(history.error.message);
 const levels = allLevels.filter(l => lessons.some(lesson => lesson.id === l.lesson_id));
 const memberships = await rowsForIds(classList.map(c => c.id), ids => admin.from("class_students").select("*").in("class_id", ids).order("class_id").order("student_id"));
 const studentIds = unique(memberships.map(m => m.student_id));
 const [students, progress, gameExecutions, pythonRunOutcomes, pythonSubmissions, pythonReviews] = await Promise.all([
  rowsForIds(studentIds, ids => admin.from("profiles").select("*").in("id", ids).eq("role", "student").order("id")),
  rowsForIds(studentIds, ids => admin.from("student_level_progress").select("*").in("student_id", ids).order("student_id").order("level_id")),
  rowsForIds(studentIds, ids => admin.from("student_code_executions").select("id,student_id,level_id,status,started_at").in("student_id", ids).order("id")),
  rowsForIds(studentIds, ids => admin.from("python_runs").select("id,student_id,activity_id,status,started_at").in("student_id", ids).order("id")),
  rowsForIds(studentIds, ids => admin.from("python_submissions").select("id,student_id,activity_id,submitted_at").in("student_id", ids).order("submitted_at", { ascending: false }).order("id", { ascending: false })),
  rowsForIds(studentIds, ids => admin.from("python_reviews").select("id,student_id,submission_id,status,created_at").in("student_id", ids).order("created_at", { ascending: false }).order("id", { ascending: false })),
 ]);
 const summary = history.data as { recent: any[]; latest: any[]; sessions: any[]; days: { day: string; count: number }[] };
 return { classes: classList, assignments, levels, lessons, memberships, students, progress, gameExecutions, pythonRunOutcomes, pythonSubmissions, pythonReviews,
  activity: summary.recent, latestActivity: summary.latest, sessionSummaries: summary.sessions, activityDays: summary.days,
  sessions: [] as any[], pythonRuns: summary.latest.filter(r => r.python_started).map(r => ({ student_id: r.student_id, started_at: r.python_started })), notifications, python };
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
  const activeLessons = new Set(ctx.lessons.filter(l => l.active !== false).map(l => l.id));
  const levels = ctx.levels.filter(l => l.active !== false && activeLessons.has(l.lesson_id));
  const result = new Set<number>();
  for (const a of ctx.assignments) {
    if (
      a.student_id !== studentId &&
      (!a.class_id || !classIds.has(a.class_id))
    )
      continue;
    if (a.level_id) {
      if (levels.some(l => l.id === Number(a.level_id) && isGameLevelAvailable(l))) result.add(Number(a.level_id));
    }
    else if (a.lesson_id)
      levels
        .filter((l) => l.lesson_id === a.lesson_id && isGameLevelAvailable(l))
        .forEach((l) => result.add(Number(l.id)));
  }
  return result;
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
    const gameRuns = ctx.gameExecutions.filter(r => r.student_id === student.id && scope.has(Number(r.level_id)));
    const pythonRuns = ctx.pythonRunOutcomes.filter(r => r.student_id === student.id);
    const last = latestActivity([
      ctx.latestActivity?.find(a => a.student_id === student.id)?.game_activity,
      ...ctx.activity.filter(a => a.student_id === student.id).map(a => a.created_at),
      ...pythonRuns.map(r => r.started_at), ...gameRuns.map(r => r.started_at),
      ...ctx.pythonSubmissions.filter(s => s.student_id === student.id).map(s => s.submitted_at),
      ...rows.map(p => p.updated_at),
    ]);
    const fullLessons = new Set(ctx.assignments.filter(a => !a.level_id && (a.student_id === student.id || classRows.some(c => c.id === a.class_id))).map(a => a.lesson_id));
    const assignedLevels = ctx.levels.filter(l => scope.has(Number(l.id)));
    const work = summarizeCompletion(ctx.lessons.filter(l => l.active !== false && (fullLessons.has(l.id) || assignedLevels.some(v => v.lesson_id === l.id)))
      .map(l => lessonCompletion(l.id, student.id, assignedLevels, rows, fullLessons.has(l.id) ? ctx.python.activities : [], ctx.python.submissions)));
    const pct = work.overallPct;
    const ownAssignments = ctx.assignments.filter(a =>
      classRows.some(c => c.status === "active") &&
      (a.student_id === student.id || classRows.some(c => c.id === a.class_id && c.status === "active")) &&
      (!a.class_id || ctx.classes.some(c => c.id === a.class_id && c.status === "active")));
    const availableLevels = ctx.levels.filter(l => isGameLevelAvailable(l));
    const pending = ownAssignments.filter(a => {
      if (a.level_id) return availableLevels.some(l => l.id === Number(a.level_id)) &&
        !rows.some(p => p.level_id === Number(a.level_id) && p.completed);
      if (!ctx.lessons.some(l => l.id === Number(a.lesson_id))) return false;
      const completion = lessonCompletion(Number(a.lesson_id), student.id, availableLevels, rows, ctx.python.activities, ctx.python.submissions);
      return completion.total > 0 && !completion.complete;
    });
    const now = Date.now();
    const overdue = pending.filter(a => a.due_date && Date.parse(a.due_date) < now).length;
    const monitoredLessons = new Set(ownAssignments.filter(a => !a.level_id).map(a => Number(a.lesson_id)));
    const monitoredActivities = ctx.python.activities.filter(a => a.published && monitoredLessons.has(a.lesson_id) && ctx.lessons.some(l => l.id === a.lesson_id));
    // Only the latest submission and its latest review determine a current
    // revision request. A resubmission awaits a fresh review.
    const revisions = monitoredActivities.filter(activity => {
      const submission = ctx.pythonSubmissions.find(s => s.student_id === student.id && s.activity_id === activity.id);
      return submission && ctx.pythonReviews.find(r => r.submission_id === submission.id)?.status === "needs_revision";
    }).length;
    const activeScope = new Set(ownAssignments.flatMap(a => a.level_id
      ? availableLevels.filter(l => l.id === Number(a.level_id)).map(l => l.id)
      : availableLevels.filter(l => l.lesson_id === Number(a.lesson_id)).map(l => l.id)));
    const assignedTasks = activeScope.size + monitoredActivities.length;
    const completedTasks = rows.filter(p => p.completed && activeScope.has(p.level_id)).length +
      monitoredActivities.filter(a => ctx.python.submissions.some(s => s.student_id === student.id && s.activity_id === a.id)).length;
    const pendingDates = pending.map(a => a.created_at).filter(d => Number.isFinite(Date.parse(d))).sort((a,b) => Date.parse(a)-Date.parse(b));
    const monitoring = monitoringStatus({ lastActivity: last, assignedTasks, completedTasks, overdue, revisions,
      oldestPendingAssignedAt: pendingDates[0] || null, active: student.active !== false }, now);
    return {
      ...student,
      classes: classRows.map((c) => sectionLabel(c!)).join(", "),
      level: Math.floor(Number(student.total_xp || 0) / 500) + 1,
      xp: Number(student.total_xp || 0),
      progress_pct: pct,
      completed_levels: completed,
      total_levels: scope.size,
      attempts,
      game_outcomes: runOutcomes(gameRuns, "game"),
      python_outcomes: runOutcomes(pythonRuns, "python"),
      status_reason: monitoring.reason,
      mistakes,
      streak: learningStreak(student).count,
      last_activity: last,
      status: monitoring.status,
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
  const activeLessons = new Set(ctx.lessons.filter(l => l.active !== false).map(l => Number(l.id)));
  const levels = ctx.levels.filter(l => l.active !== false && activeLessons.has(Number(l.lesson_id)));
  let done = 0;
  for (const sid of unique(targetIds)) {
    if (assignment.level_id) {
      const level = levels.find(l => l.id === Number(assignment.level_id));
      if (level && level.active !== false && isGameLevelAvailable(level) && ctx.progress.some(p => p.student_id === sid && p.level_id === level.id && p.completed)) done++;
    } else if (activeLessons.has(Number(assignment.lesson_id)) && lessonCompletion(Number(assignment.lesson_id), sid, levels, ctx.progress, ctx.python.activities, ctx.python.submissions).complete) done++;
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

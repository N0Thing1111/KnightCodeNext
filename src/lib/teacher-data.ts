/* eslint-disable @typescript-eslint/no-explicit-any */
import { sectionLabel } from "@/lib/section-label";
import { cache } from "react";
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
  const [
    { data: classes },
    { data: assignments },
    { data: levels },
    { data: lessons },
    { data: notices },
  ] = await Promise.all([
    admin
      .from("classes")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false }),
    admin
      .from("assignments")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false }),
    admin.from("levels").select("*").eq("active", true).order("level_number"),
    admin.from("lessons").select("*").eq("active", true).order("order_number"),
    admin
      .from("teacher_notifications")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("is_read")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const classList = classes ?? [];
  const classIds = classList.map((c) => c.id);
  const { data: memberships } = classIds.length
    ? await admin.from("class_students").select("*").in("class_id", classIds)
    : { data: [] };
  const studentIds = unique((memberships ?? []).map((m) => m.student_id));
  const [
    { data: students },
    { data: progress },
    { data: activity },
    { data: achievements },
    { data: sessions },
  ] = await Promise.all([
    studentIds.length
      ? admin
          .from("profiles")
          .select("*")
          .in("id", studentIds)
          .eq("role", "student")
      : { data: [] },
    studentIds.length
      ? admin
          .from("student_level_progress")
          .select("*")
          .in("student_id", studentIds)
      : { data: [] },
    studentIds.length
      ? admin
          .from("student_activity")
          .select("*")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false })
          .limit(400)
      : { data: [] },
    studentIds.length
      ? admin
          .from("student_achievements")
          .select("*,achievements(*)")
          .in("student_id", studentIds)
      : { data: [] },
    studentIds.length
      ? admin
          .from("student_level_sessions")
          .select("*")
          .in("student_id", studentIds)
          .order("started_at", { ascending: false })
          .limit(500)
      : { data: [] },
  ]);
  return {
    classes: classList,
    assignments: assignments ?? [],
    levels: levels ?? [],
    lessons: lessons ?? [],
    memberships: memberships ?? [],
    students: students ?? [],
    progress: progress ?? [],
    activity: activity ?? [],
    achievements: achievements ?? [],
    sessions: sessions ?? [],
    notifications: notices ?? [],
  };
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
    if (a.level_id) result.add(Number(a.level_id));
    else if (a.lesson_id)
      ctx.levels
        .filter((l) => l.lesson_id === a.lesson_id)
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
    const last =
      ctx.activity.find((a) => a.student_id === student.id)?.created_at ?? null;
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
      failed_attempts: Math.max(0, attempts - completed),
      mistakes,
      streak: Number(student.current_streak || 0),
      last_activity: last,
      status: statusFor(last, pct, Math.max(0, attempts - completed)),
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
    const required = assignment.level_id
      ? [Number(assignment.level_id)]
      : ctx.levels
          .filter((l) => l.lesson_id === assignment.lesson_id)
          .map((l) => Number(l.id));
    const completed = new Set(
      ctx.progress
        .filter((p) => p.student_id === sid && p.completed)
        .map((p) => Number(p.level_id)),
    );
    if (required.length && required.every((id) => completed.has(id))) done++;
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
export function avatar(key: string) {
  return (
    (
      {
        knight: "♞",
        blue: "🛡️",
        mage: "🧙",
        fox: "🦊",
        dragon: "🐉",
        robot: "🤖",
      } as Record<string, string>
    )[key] ?? "♞"
  );
}
export function formatTime(value: number | null | undefined) {
  if (value == null) return "—";
  const m = Math.floor(value / 60),
    s = value % 60;
  return m ? m + "m " + s + "s" : s + "s";
}

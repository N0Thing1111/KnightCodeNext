import { lessonCompletion } from "@/lib/lesson-completion";
import { sectionLabel } from "@/lib/section-label";
import {
  assignmentCounts,
  getTeacherContext,
  teacherStudents,
} from "@/lib/teacher-data";
export const reportTypes = [
  "student_progress",
  "class_performance",
  "lesson_completion",
  "challenge_performance",
  "activity",
  "inactive",
  "assignment_completion",
] as const;
export type ReportType = (typeof reportTypes)[number];
export async function reportLines(teacherId: string, type: ReportType) {
  const ctx = await getTeacherContext(teacherId),
    rows = teacherStudents(ctx),
    lines: string[] = [];
  if (type === "student_progress")
    rows.forEach((r) =>
      lines.push(
        r.name +
          " | " +
          r.student_id +
          " | " +
          r.classes +
          " | Level " +
          r.level +
          " | " +
          r.xp +
          " XP | " +
          r.progress_pct +
          "% | " +
          r.status,
      ),
    );
  if (type === "class_performance")
    ctx.classes.forEach((c) => {
      const ids = ctx.memberships
          .filter((m) => m.class_id === c.id)
          .map((m) => m.student_id),
        students = rows.filter((s) => ids.includes(s.id)),
        avg = students.length
          ? Math.round(
              students.reduce((n, s) => n + s.progress_pct, 0) /
                students.length,
            )
          : 0;
      lines.push(
        sectionLabel(c) +
          " | " +
          ids.length +
          " students | " +
          avg +
          "% average progress",
      );
    });
  if (type === "inactive")
    rows
      .filter((r) => r.status === "Inactive")
      .forEach((r) =>
        lines.push(
          r.name +
            " | " +
            r.student_id +
            " | Last activity: " +
            (r.last_activity || "Never") +
            " | " +
            r.progress_pct +
            "%",
        ),
      );
  if (type === "activity")
    ctx.activity.forEach((a) => {
      const s = rows.find((x) => x.id === a.student_id),
        lv = ctx.levels.find((x) => x.id === a.level_id);
      lines.push(
        new Date(a.created_at).toLocaleString() +
          " | " +
          (s?.name || "Student") +
          " | " +
          String(a.action_type).replaceAll("_", " ") +
          " | " +
          (lv?.title || "KnightCode") +
          " | +" +
          a.xp_earned +
          " XP",
      );
    });
  if (type === "lesson_completion")
    ctx.lessons.forEach((l) => {
      const related = ctx.assignments.filter((a) => a.lesson_id === l.id && !a.level_id),
        targets = new Set<string>();
      related.forEach((a) =>
        a.student_id
          ? targets.add(a.student_id)
          : ctx.memberships
              .filter((m) => m.class_id === a.class_id)
              .forEach((m) => targets.add(m.student_id)),
      );
      let done = 0;
      for (const sid of targets) {
        if (lessonCompletion(l.id, sid, ctx.levels, ctx.progress, ctx.python.activities, ctx.python.submissions).complete) done++;
      }
      if (targets.size)
        lines.push(
          l.title +
            " | " +
            done +
            " / " +
            targets.size +
            " assigned students completed",
        );
    });
  if (type === "challenge_performance")
    ctx.levels.forEach((l) => {
      const assignments = ctx.assignments.filter(
          (a) =>
            a.level_id === l.id || (!a.level_id && a.lesson_id === l.lesson_id),
        ),
        targets = new Set<string>();
      assignments.forEach((a) =>
        a.student_id
          ? targets.add(a.student_id)
          : ctx.memberships
              .filter((m) => m.class_id === a.class_id)
              .forEach((m) => targets.add(m.student_id)),
      );
      const ps = ctx.progress.filter(
        (p) => p.level_id === l.id && targets.has(p.student_id),
      );
      if (targets.size)
        lines.push(
          "Level " +
            l.level_number +
            " · " +
            l.title +
            " | " +
            ps.filter((p) => p.completed).length +
            " / " +
            targets.size +
            " assigned students completed | " +
            ps.reduce((n, p) => n + Number(p.attempts || 0), 0) +
            " attempts",
        );
    });
  if (type === "assignment_completion")
    ctx.assignments.forEach((a) => {
      const c = ctx.classes.find((x) => x.id === a.class_id),
        counts = assignmentCounts(ctx, a);
      lines.push(
        a.title +
          " | " +
          (c ? sectionLabel(c) : "Individual") +
          " | " +
          counts.done +
          " / " +
          counts.target +
          " completed | Due " +
          (a.due_date || "none"),
      );
    });
  return lines;
}

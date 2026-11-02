import type { getTeacherContext } from "@/lib/teacher-data";
import { lessonCompletion } from "@/lib/lesson-completion";
import { isGameLevelAvailable } from "@/lib/game-build";
import { sectionLabel } from "@/lib/section-label";

type Context = Awaited<ReturnType<typeof getTeacherContext>>;
export type AttentionStatus =
  | "awaiting_review"
  | "needs_revision"
  | "passed"
  | "overdue";
export type AttentionItem = {
  key: string;
  studentId: string;
  student: string;
  email: string;
  username: string;
  sectionId: string;
  section: string;
  title: string;
  status: AttentionStatus;
  date: string;
  href: string;
};
// One current item per learner/activity. Historical feedback never competes
// with a newer submission. Context is already restricted to this teacher.
export function teacherAttention(
  ctx: Context,
  now = Date.now(),
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const sections = new Map(
    ctx.classes.filter((c) => c.status === "active").map((c) => [c.id, c]),
  );
  const lessons = new Map(
    ctx.lessons.filter((l) => l.active !== false).map((l) => [l.id, l]),
  );
  const levels = ctx.levels.filter(
    (l) =>
      l.active !== false && lessons.has(l.lesson_id) && isGameLevelAvailable(l),
  );
  const latest = new Map<string, Context["pythonSubmissions"][number]>();
  for (const submission of [...ctx.pythonSubmissions].sort(
    (a, b) =>
      Date.parse(b.submitted_at) - Date.parse(a.submitted_at) ||
      String(b.id).localeCompare(String(a.id)),
  )) {
    const key = submission.student_id + ":" + submission.activity_id;
    if (!latest.has(key)) latest.set(key, submission);
  }
  const reviews = new Map<string, Context["pythonReviews"][number]>();
  for (const review of [...ctx.pythonReviews].sort(
    (a, b) =>
      Date.parse(b.updated_at || b.created_at) -
        Date.parse(a.updated_at || a.created_at) ||
      String(b.id).localeCompare(String(a.id)),
  )) {
    if (!reviews.has(review.submission_id))
      reviews.set(review.submission_id, review);
  }
  for (const student of ctx.students.filter((s) => s.active !== false)) {
    const membership = ctx.memberships.find(
      (m) => m.student_id === student.id && sections.has(m.class_id),
    );
    const section = membership && sections.get(membership.class_id);
    if (!section) continue;
    const base = {
      studentId: student.id,
      student: student.name,
      email: student.email,
      username: student.username || "",
      sectionId: String(section.id),
      section: sectionLabel(section),
    };
    const assigned = ctx.assignments.filter(
      (a) =>
        (!a.class_id || a.class_id === section.id) &&
        (a.student_id
          ? a.student_id === student.id
          : a.class_id === section.id),
    );
    const fullLessons = new Set(
      assigned.filter((a) => !a.level_id).map((a) => a.lesson_id),
    );
    for (const activity of ctx.python.activities.filter(
      (a) =>
        a.published && lessons.has(a.lesson_id) && fullLessons.has(a.lesson_id),
    )) {
      const submission = latest.get(student.id + ":" + activity.id);
      if (!submission) continue;
      const review = reviews.get(submission.id);
      const status =
        review?.status === "passed"
          ? "passed"
          : review?.status === "needs_revision"
            ? "needs_revision"
            : "awaiting_review";
      items.push({
        ...base,
        key: "python:" + student.id + ":" + activity.id,
        status,
        title: lessons.get(activity.lesson_id)!.title + " - Python activity",
        date:
          status === "passed"
            ? review.updated_at || review.created_at
            : status === "needs_revision"
              ? review.revision_requested_at ||
                review.updated_at ||
                review.created_at
              : submission.submitted_at,
        href:
          "/teacher/results?" +
          new URLSearchParams({
            type: "python",
            student: student.id,
            activity: activity.id,
            run: submission.run_id,
          }) +
          "#run-review",
      });
    }
    for (const assignment of assigned) {
      if (!assignment.due_date || !(Date.parse(assignment.due_date) < now))
        continue;
      const incomplete = assignment.level_id
        ? levels.some((l) => l.id === Number(assignment.level_id)) &&
          !ctx.progress.some(
            (p) =>
              p.student_id === student.id &&
              p.level_id === Number(assignment.level_id) &&
              p.completed,
          )
        : lessons.has(Number(assignment.lesson_id)) &&
          (() => {
            const work = lessonCompletion(
              Number(assignment.lesson_id),
              student.id,
              levels,
              ctx.progress,
              ctx.python.activities,
              ctx.python.submissions,
            );
            return work.total > 0 && work.studentWorkPending;
          })();
      if (incomplete)
        items.push({
          ...base,
          key: "assignment:" + student.id + ":" + assignment.id,
          title: assignment.title,
          status: "overdue",
          date: assignment.due_date,
          href: "/teacher/student/" + student.id + "#assigned-work",
        });
    }
  }
  return items.sort(
    (a, b) =>
      Date.parse(a.date) - Date.parse(b.date) ||
      a.student.localeCompare(b.student) ||
      a.key.localeCompare(b.key),
  );
}

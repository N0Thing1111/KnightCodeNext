import { lessonCompletion } from "@/lib/lesson-completion";
import { isGameLevelAvailable } from "@/lib/game-build";
import { sectionLabel } from "@/lib/section-label";
import type { getTeacherContext } from "@/lib/teacher-data";

export const reportTypes = ["student_progress", "class_performance", "lesson_completion", "challenge_performance", "activity", "inactive", "assignment_completion"] as const;
export type ReportType = (typeof reportTypes)[number];
export const reportLabels: Record<ReportType, string> = {
  student_progress: "Student Progress", class_performance: "Section Performance",
  lesson_completion: "Lesson Completion", challenge_performance: "Challenge Performance",
  activity: "Activity", inactive: "Inactive Students", assignment_completion: "Assignment Completion",
};
export type ReportFilters = { type: ReportType; section: number | null; from: string; to: string };
export type Report = {
  type: ReportType; title: string; school: string; teacher: string; section: string;
  schoolYear: string; generatedAt: string; period: string; note: string;
  summary: { label: string; value: string }[];
  columns: string[]; rows: string[][];
};
export type ReportContext = Awaited<ReturnType<typeof getTeacherContext>>;
export type ReportSubmission = { id: string; student_id: string; activity_id: string; submitted_at: string };
export type ReportReview = { id: string; submission_id: string; status: string; created_at: string };
export function parseReportFilters(query: Record<string, string | undefined>): ReportFilters {
  const type = reportTypes.includes(query.type as ReportType) ? query.type as ReportType : "student_progress";
  const section = query.section ? Number(query.section) : null;
  if (section !== null && (!Number.isSafeInteger(section) || section < 1)) throw Error("Choose a valid section.");
  const from = type === "activity" ? query.from || "" : "", to = type === "activity" ? query.to || "" : "";
  for (const date of [from, to]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw Error("Choose valid activity dates.");
  if (from && to && from > to) throw Error("The start date must not be after the end date.");
  return { type, section, from, to };
}
export function reportQuery(filters: ReportFilters) {
  const query = new URLSearchParams({ type: filters.type });
  if (filters.section) query.set("section", String(filters.section));
  if (filters.type === "activity") {
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
  }
  return query.toString();
}
export function reportDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Never";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
const ratio = (done: number, total: number) => total ? `${done} / ${total}` : "N/A";
const percent = (done: number, total: number) => total ? `${Math.round(done / total * 1000) / 10}%` : "N/A";

export function buildTeacherReport(ctx: ReportContext, filters: ReportFilters, meta: { teacher: string; school: string; now?: string }, submissions: ReportSubmission[], reviews: ReportReview[]): Report {
  const now = meta.now || new Date().toISOString();
  const classes = ctx.classes.filter(c => filters.section === null || c.id === filters.section);
  if (filters.section !== null && !classes.length) throw Error("This section is not assigned to your teacher account.");
  const classIds = new Set(classes.map(c => c.id));
  const memberships = ctx.memberships.filter(m => classIds.has(m.class_id));
  const studentIds = new Set(memberships.map(m => m.student_id));
  const students = ctx.students.filter(s => studentIds.has(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  const allowedIds = new Set(students.map(s => s.id));
  const targets = (a: ReportContext["assignments"][number]): string[] => [...new Set(a.student_id ? (allowedIds.has(a.student_id) ? [String(a.student_id)] : []) : memberships.filter(m => m.class_id === a.class_id && allowedIds.has(m.student_id)).map(m => String(m.student_id)))];
  const assignments = ctx.assignments.filter(a => targets(a).length > 0);
  const lessonIds = new Set(ctx.lessons.map(l => l.id));
  const levels = ctx.levels.filter(l => l.active !== false && lessonIds.has(l.lesson_id));
  const playable = levels.filter(isGameLevelAvailable);
  const activities = ctx.python.activities.filter(a => a.published && lessonIds.has(a.lesson_id));
  const available = (a: ReportContext["assignments"][number]) => a.level_id
    ? playable.some(l => l.id === a.level_id)
    : lessonIds.has(a.lesson_id) && (playable.some(l => l.lesson_id === a.lesson_id) || activities.some(p => p.lesson_id === a.lesson_id));
  const eligibleAssignments = assignments.filter(available);
  const completed = (a: ReportContext["assignments"][number], sid: string) => a.level_id
    ? ctx.progress.some(p => p.student_id === sid && p.level_id === a.level_id && p.completed)
    : lessonCompletion(a.lesson_id, sid, levels, ctx.progress, activities, ctx.python.submissions).complete;
  const detail = students.map(student => {
    const assigned = eligibleAssignments.filter(a => targets(a).includes(student.id));
    const wholeLessons = new Set(assigned.filter(a => !a.level_id).map(a => a.lesson_id));
    const directLevels = new Set(assigned.filter(a => a.level_id).map(a => a.level_id));
    const games = playable.filter(l => directLevels.has(l.id) || wholeLessons.has(l.lesson_id));
    const python = activities.filter(a => wholeLessons.has(a.lesson_id));
    const gamesDone = games.filter(l => ctx.progress.some(p => p.student_id === student.id && p.level_id === l.id && p.completed)).length;
    const pythonDone = python.filter(a => ctx.python.submissions.some(s => s.student_id === student.id && s.activity_id === a.id)).length;
    let awaiting = 0, passed = 0, revision = 0, reviewed = 0;
    for (const activity of python) {
      const latest = submissions.filter(s => s.student_id === student.id && s.activity_id === activity.id).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at) || b.id.localeCompare(a.id))[0];
      if (!latest) continue;
      const review = reviews.filter(r => r.submission_id === latest.id).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))[0];
      if (!review) awaiting++;
      else if (review.status === "passed") passed++;
      else if (review.status === "needs_revision") revision++;
      else reviewed++;
    }
    const last = [...ctx.activity.filter(a => a.student_id === student.id).map(a => a.created_at), ...ctx.pythonRuns.filter(r => r.student_id === student.id).map(r => r.started_at), ...ctx.progress.filter(p => p.student_id === student.id).map(p => p.updated_at)].filter(Boolean).sort().at(-1) || null;
    return { student, games, gamesDone, python, pythonDone, assigned, done: assigned.filter(a => completed(a, student.id)).length, last,
      section: memberships.filter(m => m.student_id === student.id).map(m => sectionLabel(classes.find(c => c.id === m.class_id)!)).join(", "),
      review: [awaiting && `${awaiting} awaiting review`, passed && `${passed} passed`, revision && `${revision} needs revision`, reviewed && `${reviewed} reviewed`].filter(Boolean).join("; ") || "No submissions",
    };
  });
  const total = detail.reduce((n, s) => n + s.assigned.length, 0), done = detail.reduce((n, s) => n + s.done, 0);
  const report: Report = {
    type: filters.type, title: reportLabels[filters.type], school: meta.school || "KnightCode", teacher: meta.teacher,
    section: filters.section ? sectionLabel(classes[0]) : "All your sections",
    schoolYear: [...new Set(classes.map(c => c.school_year).filter(Boolean))].join(", ") || "Not specified",
    generatedAt: now,
    period: filters.type === "activity" ? `${filters.from || "Beginning of records"} to ${filters.to || "Present"} (UTC+08:00)` : "Current progress snapshot",
    note: "Counts cover assigned, available work only. Coming Soon levels and unavailable assignments are excluded from completion denominators. Python submission counts as completion; teacher review is separate and is not a mastery score. N/A means no available work is assigned.",
    summary: [{ label: "Students", value: String(students.length) }, { label: "Assigned lessons", value: String(new Set(assignments.filter(a => !a.level_id && lessonIds.has(a.lesson_id)).map(a => a.lesson_id)).size) }, { label: "Assignments completed", value: ratio(done, total) }, { label: "Students with pending work", value: String(detail.filter(s => s.done < s.assigned.length).length) }],
    columns: [], rows: [],
  };
  if (filters.type === "student_progress" || filters.type === "class_performance") {
    report.columns = ["Student ID", "Student", "Section", "Game levels completed", "Python activities submitted", "Latest Python reviews", "Assignments completed", "Assignment completion"];
    report.rows = detail.map(s => [s.student.student_id || "Not set", s.student.name, s.section, ratio(s.gamesDone, s.games.length), ratio(s.pythonDone, s.python.length), s.python.length ? s.review : "N/A", ratio(s.done, s.assigned.length), percent(s.done, s.assigned.length)]);
  }
  if (filters.type === "inactive") {
    report.columns = ["Student ID", "Student", "Section", "Last recorded activity (UTC+08)", "Assignments completed", "Pending assignments"];
    report.rows = detail.filter(s => !s.last || Date.parse(now) - Date.parse(s.last) >= 14 * 86400000).map(s => [s.student.student_id || "Not set", s.student.name, s.section, reportDate(s.last), ratio(s.done, s.assigned.length), String(s.assigned.length - s.done)]);
    report.note += " Inactive means no recorded game/Python activity or progress update within 14 days, or no activity yet. It does not mean the account is disabled.";
  }
  if (filters.type === "lesson_completion") {
    report.columns = ["Lesson", "Assigned students", "Completed", "Pending", "Completion", "Availability"];
    for (const lesson of ctx.lessons) {
      const related = assignments.filter(a => a.lesson_id === lesson.id && !a.level_id);
      const ids = [...new Set(related.flatMap(targets))];
      if (!ids.length) continue;
      const ready = related.some(available);
      const done = ready ? ids.filter(sid => lessonCompletion(lesson.id, sid, levels, ctx.progress, activities, ctx.python.submissions).complete).length : 0;
      report.rows.push([lesson.title, String(ids.length), ready ? String(done) : "N/A", ready ? String(ids.length - done) : "N/A", ready ? percent(done, ids.length) : "N/A", ready ? "Available" : "No available activity yet"]);
    }
  }
  if (filters.type === "challenge_performance") {
    report.columns = ["Level", "Challenge", "Assigned students", "Completed", "Completion", "Recorded attempts", "Availability"];
    for (const level of levels) {
      const ids = new Set(assignments.filter(a => a.level_id === level.id || (!a.level_id && a.lesson_id === level.lesson_id)).flatMap(targets));
      if (!ids.size) continue;
      const ps = ctx.progress.filter(p => p.level_id === level.id && ids.has(p.student_id));
      const ready = isGameLevelAvailable(level);
      report.rows.push([String(level.level_number), level.title, String(ids.size), ready ? String(ps.filter(p => p.completed).length) : "N/A", ready ? percent(ps.filter(p => p.completed).length, ids.size) : "N/A", String(ps.reduce((n, p) => n + Number(p.attempts || 0), 0)), ready ? "Available" : "Coming Soon"]);
    }
  }
  if (filters.type === "assignment_completion") {
    report.columns = ["Assignment", "Assigned to", "Due date (UTC+08)", "Students", "Completed", "Completion", "Availability"];
    report.rows = assignments.map(a => {
      const ids = targets(a), ready = available(a), done = ready ? ids.filter(sid => completed(a, sid)).length : 0;
      const cls = classes.find(c => c.id === a.class_id);
      return [a.title, a.student_id ? students.find(s => s.id === a.student_id)?.name || "Individual" : cls ? sectionLabel(cls) : "Section", a.due_date ? reportDate(a.due_date) : "No due date", String(ids.length), ready ? String(done) : "N/A", ready ? percent(done, ids.length) : "N/A", ready ? "Available" : "Unavailable"];
    });
  }
  if (filters.type === "activity") {
    report.columns = ["Recorded at (UTC+08)", "Student ID", "Student", "Event", "Activity", "XP earned"];
    const start = filters.from ? Date.parse(filters.from + "T00:00:00+08:00") : -Infinity;
    const end = filters.to ? Date.parse(filters.to + "T00:00:00+08:00") + 86400000 : Infinity;
    const events = [
      ...ctx.activity.filter(a => allowedIds.has(a.student_id)).map(a => ({ ...a, event: String(a.action_type).replaceAll("_", " "), title: ctx.levels.find(l => l.id === a.level_id)?.title || ctx.lessons.find(l => String(l.id) === String(a.metadata?.lesson_id))?.title || "KnightCode", xp: String(a.xp_earned || 0) })),
      ...ctx.pythonRuns.filter(r => allowedIds.has(r.student_id)).map(r => ({ student_id: r.student_id, created_at: r.started_at, event: "Python run started", title: "Python practice", xp: "N/A" })),
    ].filter(a => Date.parse(a.created_at) >= start && Date.parse(a.created_at) < end).sort((a, b) => b.created_at.localeCompare(a.created_at));
    report.rows = events.map(a => { const s = students.find(s => s.id === a.student_id)!; return [reportDate(a.created_at), s.student_id || "Not set", s.name, a.event, a.title, a.xp]; });
    report.summary = [{ label: "Recorded events", value: String(events.length) }, { label: "Students with events", value: String(new Set(events.map(e => e.student_id)).size) }, { label: "Python runs started", value: String(events.filter(e => e.event === "Python run started").length) }, { label: "Sections in scope", value: String(classes.length) }];
    report.note = "Recorded events within the selected dates, inclusive in UTC+08:00. A Python run-start event does not imply completion or submission. Use Session Results / Review Runs for code and detailed execution history.";
  }
  return report;
}

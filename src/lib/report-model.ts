import { displayedPythonRating } from "@/lib/python-ratings";

export type ReportFilters = {
  section: number | null;
  lesson: number | null;
  activity: string;
};
export type ReportSection = { id: number; name: string; section: string };
export type ReportLesson = { id: number; title: string; sections: number[] };
export type ReportActivity = {
  id: string;
  lesson_id: number;
  title: string;
  published: boolean;
};
export type ReportStudent = {
  id: string;
  name: string;
  username: string | null;
  section: string;
};
export type ReportSubmission = {
  id: string;
  student_id: string;
  activity_id: string;
  submitted_at: string;
};
export type ReportReview = {
  id: string;
  submission_id: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  logic: number;
  application: number;
  correctness: number;
  feedback: string;
};
export type Report = {
  title: string;
  platform: string;
  teacher: string;
  section: string;
  lesson: string;
  activity: string;
  generatedAt: string;
  note: string;
  columns: string[];
  rows: string[][];
};
// Group the three criteria for readable screen/print tables; CSV keeps separate columns.
export function reportDisplayTable(report: Report) {
  return {
    columns: [
      "Student",
      "Result",
      "Rubric scores /5",
      "Activity grade",
      "Reviewed submission (UTC+08)",
      "New submission",
      "Feedback",
    ],
    rows: report.rows.map((row) => [
      row[0],
      row[1],
      row[2] === "—"
        ? "—"
        : "Logic: " +
          row[2] +
          "\nApplication: " +
          row[3] +
          "\nCorrectness: " +
          row[4],
      row[5],
      row[6],
      row[7],
      row[8],
    ]),
  };
}
export function parseReportFilters(
  query: Record<string, string | undefined>,
): ReportFilters {
  function numeric(key: "section" | "lesson") {
    if (!query[key]) return null;
    const value = Number(query[key]);
    if (!Number.isSafeInteger(value) || value < 1)
      throw Error("Choose a valid " + key + ".");
    return value;
  }
  const activity = query.activity || "";
  if (
    activity &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activity,
    )
  )
    throw Error("Choose a valid Python activity.");
  return {
    section: numeric("section"),
    lesson: numeric("lesson"),
    activity: activity.toLowerCase(),
  };
}
export function reportQuery(filters: ReportFilters) {
  const query = new URLSearchParams();
  if (filters.section) query.set("section", String(filters.section));
  if (filters.lesson) query.set("lesson", String(filters.lesson));
  if (filters.activity) query.set("activity", filters.activity);
  return query.toString();
}
export function reportDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
// Keep PostgreSQL microseconds when deciding which submission is newer.
function submissionOrder(a: ReportSubmission, b: ReportSubmission) {
  const key = (s: ReportSubmission) => {
    const fraction = s.submitted_at.match(/\.(\d+)/)?.[1] || "";
    return (
      BigInt(Date.parse(s.submitted_at)) * BigInt(1000) +
      BigInt(fraction.padEnd(6, "0").slice(3, 6))
    );
  };
  const left = key(a),
    right = key(b);
  return left > right ? -1 : left < right ? 1 : b.id.localeCompare(a.id);
}
export function buildTeacherReport(
  students: ReportStudent[],
  submissions: ReportSubmission[],
  reviews: ReportReview[],
  meta: Omit<Report, "title" | "columns" | "rows" | "note"> & {
    activityId: string;
  },
): Report {
  const reviewBySubmission = new Map<string, ReportReview>();
  for (const review of reviews) {
    const previous = reviewBySubmission.get(review.submission_id);
    if (
      !previous ||
      (review.updated_at || review.created_at) >
        (previous.updated_at || previous.created_at)
    )
      reviewBySubmission.set(review.submission_id, review);
  }
  const byStudent = new Map<string, ReportSubmission[]>();
  for (const submission of submissions) {
    if (submission.activity_id !== meta.activityId) continue;
    const list = byStudent.get(submission.student_id) || [];
    list.push(submission);
    byStudent.set(submission.student_id, list);
  }
  const rows = [...students]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((student) => {
      const history = (byStudent.get(student.id) || []).sort(submissionOrder);
      const assessed = history.find((s) => reviewBySubmission.has(s.id));
      const review = assessed ? reviewBySubmission.get(assessed.id) : undefined;
      const newerPending =
        !!assessed &&
        history.some(
          (s) =>
            submissionOrder(s, assessed) < 0 && !reviewBySubmission.has(s.id),
        );
      const ratings = review
        ? [review.logic, review.application, review.correctness].map(
            displayedPythonRating,
          )
        : null;
      const result = review
        ? review.status === "passed"
          ? "Passed"
          : review.status === "needs_revision"
            ? "Needs revision"
            : "Reviewed — no outcome"
        : history.length
          ? "Awaiting review"
          : "Not submitted";
      return [
        [
          student.name,
          student.username ? "@" + student.username : "",
          student.section,
        ]
          .filter(Boolean)
          .join("\n"),
        result,
        ratings ? String(ratings[0]) : "—",
        ratings ? String(ratings[1]) : "—",
        ratings ? String(ratings[2]) : "—",
        ratings
          ? ratings.reduce((sum, value) => sum + value, 0) + " / 15"
          : "—",
        assessed ? reportDate(assessed.submitted_at) : "—",
        newerPending ? "Awaiting review" : "—",
        review?.feedback || "—",
      ];
    });
  return {
    title: "Python Activity Results",
    platform: meta.platform,
    teacher: meta.teacher,
    section: meta.section,
    lesson: meta.lesson,
    activity: meta.activity,
    generatedAt: meta.generatedAt,
    note: "Latest reviewed submission per student. Activity grade = Logic + Application + Correctness (each 1–5; total /15). Passed or Needs revision is the reviewer’s decision. A newer submission awaiting review does not replace the existing grade.",
    columns: [
      "Student",
      "Result",
      "Logic /5",
      "Application /5",
      "Correctness /5",
      "Activity grade",
      "Reviewed submission (UTC+08)",
      "New submission",
      "Feedback",
    ],
    rows,
  };
}

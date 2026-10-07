import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import {
  reportLines,
  reportTypes,
  type ReportType,
} from "@/lib/teacher-reports";
import { Hero } from "@/components/teacher-ui";
const labels: Record<ReportType, string> = {
  student_progress: "Student Progress",
  class_performance: "Section Performance",
  lesson_completion: "Lesson Completion",
  challenge_performance: "Challenge Performance",
  activity: "Activity",
  inactive: "Inactive Students",
  assignment_completion: "Assignments",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    t = await requireTeacher(),
    type = reportTypes.includes(q.type as ReportType)
      ? (q.type as ReportType)
      : "student_progress",
    lines = await reportLines(t.id, type);
  return (
    <>
      <Hero
        eyebrow="DATA & INSIGHTS"
        title="Reports"
        description="Generate reports from the actual students, progress, activity, and sections assigned to you."
      >
        <div className="hero-actions">
          <a
            className="teacher-btn"
            href={"/api/teacher/reports?type=" + type + "&format=csv"}
          >
            Export CSV
          </a>
          <a
            className="teacher-btn primary"
            href={"/api/teacher/reports?type=" + type + "&format=pdf"}
          >
            Export PDF
          </a>
        </div>
      </Hero>
      <section className="teacher-card">
        <div className="report-tabs">
          {reportTypes.map((x) => (
            <Link
              prefetch={false}
              className={type === x ? "active" : ""}
              href={"/teacher/reports?type=" + x}
              key={x}
            >
              {labels[x]}
            </Link>
          ))}
        </div>
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {lines.length ? (
                lines.map((line, i) => (
                  <tr key={i}>
                    <td>
                      <span className="report-dot" />
                    </td>
                    <td>{line}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>
                    <div className="teacher-empty">
                      No data is available for this report yet.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { getTeacherReport } from "@/lib/teacher-reports";
import {
  parseReportFilters,
  reportQuery,
  reportDate,
  reportDisplayTable,
} from "@/lib/report-model";
import { ReportFiltersForm } from "./report-filters";
import styles from "./reports.module.css";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const teacher = await requireTeacher();
  let data;
  try {
    data = await getTeacherReport(
      teacher,
      parseReportFilters(await searchParams),
    );
  } catch (error) {
    return (
      <section className="teacher-card">
        <h2>Report unavailable</h2>
        <p role="alert">
          {error instanceof Error
            ? error.message
            : "Could not load this report."}
        </p>
        <Link className="teacher-btn" href="/teacher/reports">
          Reset report filters
        </Link>
      </section>
    );
  }
  const { report, filters, sections, lessons, activities } = data;
  const params = reportQuery(filters);
  const table = report ? reportDisplayTable(report) : null;
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h2>Python activity reports</h2>
        <p>
          Export activity grades and feedback from each student’s latest
          reviewed submission.
        </p>
      </header>
      <section className="teacher-card" aria-label="Choose report">
        <ReportFiltersForm
          key={params}
          filters={filters}
          sections={sections}
          lessons={lessons}
          activities={activities}
        />
      </section>
      {report ? (
        <section className={"teacher-card " + styles.report}>
          <div className={styles.heading}>
            <div>
              <h2>{report.activity}</h2>
              <p>
                {report.lesson} · {report.section}
              </p>
            </div>
            <div className={styles.exports}>
              <a
                className="teacher-btn"
                href={"/api/teacher/reports?" + params + "&format=csv"}
              >
                Export CSV
              </a>
              <a
                className="teacher-btn primary"
                href={"/api/teacher/reports?" + params + "&format=pdf"}
              >
                Export PDF
              </a>
            </div>
          </div>
          <p className={styles.count}>
            {report.rows.length} assigned students · Generated{" "}
            {reportDate(report.generatedAt)} (UTC+08)
          </p>
          <details className={styles.explanation}>
            <summary>How results and grades work</summary>
            <p>{report.note}</p>
            <p>
              No reviewed submission means no grade yet. This is an activity
              grade, not an overall subject grade.
            </p>
          </details>
          <div
            className={styles.tableWrap}
            tabIndex={0}
            role="region"
            aria-label="Python activity assessment results"
          >
            <table className={styles.table}>
              <caption className={styles.caption}>
                {report.activity} — {report.section}
              </caption>
              <thead>
                <tr>
                  {table!.columns.map((column) => (
                    <th scope="col" key={column}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.length ? (
                  table!.rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, i) => (
                        <td key={i}>{cell}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={table!.columns.length}>
                      No current students are assigned this lesson in the
                      selected section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className={"teacher-card " + styles.empty}>
          <h3>
            {activities.length
              ? "Choose a lesson to view its Python results"
              : "No assigned Python activities yet"}
          </h3>
          <p>
            {activities.length
              ? "Select a section and lesson, then choose View report."
              : "Assign a lesson containing a Python activity to your students. Its results will be available here."}
          </p>
        </section>
      )}
    </div>
  );
}

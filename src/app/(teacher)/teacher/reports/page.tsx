import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { getTeacherReport } from "@/lib/teacher-reports";
import { parseReportFilters, reportLabels, reportTypes, reportQuery, reportDate } from "@/lib/report-model";
import { sectionLabel } from "@/lib/section-label";
import { Hero } from "@/components/teacher-ui";
import styles from "./reports.module.css";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const teacher = await requireTeacher(), query = await searchParams;
  let data, filters;
  try {
    filters = parseReportFilters(query);
    data = await getTeacherReport(teacher, filters);
  } catch (error) {
    return <section className="teacher-card"><h2>Report unavailable</h2><p role="alert">{error instanceof Error ? error.message : "Could not load this report."}</p><Link className="teacher-btn" href="/teacher/reports">Reset report filters</Link></section>;
  }
  const { report, sections } = data;
  const params = reportQuery(filters);
  return <div className={styles.root}>
    <Hero eyebrow="DATA & INSIGHTS" title="Reports" description="Review assigned work and download complete, printable records for your sections.">
      <div className="hero-actions">
        <a className="teacher-btn" href={"/api/teacher/reports?" + params + "&format=csv"}>Export CSV</a>
        <a className="teacher-btn primary" href={"/api/teacher/reports?" + params + "&format=pdf"}>Export PDF</a>
      </div>
    </Hero>
    <section className="teacher-card">
      <nav className={styles.tabs} aria-label="Report types">
        {reportTypes.map(type => <Link prefetch={false} aria-current={type === filters.type ? "page" : undefined} href={"/teacher/reports?" + reportQuery({ ...filters, type })} key={type}>{reportLabels[type]}</Link>)}
      </nav>
      <form className={styles.filters} method="get" action="/teacher/reports">
        <input type="hidden" name="type" value={filters.type} />
        <label>Section<select key={filters.section || "all"} name="section" defaultValue={filters.section || ""}><option value="">All your sections</option>{sections.map(section => <option key={section.id} value={section.id}>{sectionLabel(section)}</option>)}</select></label>
        {filters.type === "activity" && <>
          <label>From (UTC+08)<input key={"from:" + filters.from} type="date" name="from" defaultValue={filters.from} /></label>
          <label>Through (UTC+08)<input key={"to:" + filters.to} type="date" name="to" defaultValue={filters.to} /></label>
        </>}
        <button className="teacher-btn" type="submit">Apply filters</button>
      </form>
    </section>
    <section className={"teacher-card " + styles.report}>
      <div className={styles.heading}><div><span className="teacher-eyebrow">{report.school}</span><h2>{report.title}</h2><p>{report.section} · School year: {report.schoolYear}</p></div><p>Teacher: {report.teacher}<br />Generated: {reportDate(report.generatedAt)} (UTC+08)<br />{report.period}</p></div>
      <div className={styles.summary}>{report.summary.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
      <p className={styles.note}>{report.note}</p>
      <p className={styles.count}>{report.rows.length} records · All matching records are included in both exports.</p>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={report.title + " table"}>
        <table className={styles.table}>
          <caption className={styles.caption}>{report.title} — {report.section}</caption>
          <thead><tr>{report.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
          <tbody>{report.rows.length ? report.rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>) : <tr><td colSpan={report.columns.length}>No matching records for this report.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </div>;
}

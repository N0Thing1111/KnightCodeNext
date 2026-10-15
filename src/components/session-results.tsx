import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import type { getSessionResults } from "@/lib/session-results";
import { sessionResultsHref } from "@/lib/session-result-filters";
import { SessionResultFilters } from "@/components/session-result-filters";
export function SessionResults({
  result,
  role,
}: {
  result: Awaited<ReturnType<typeof getSessionResults>>;
  role: "admin" | "teacher";
}) {
  const { catalog, filters, rows, total, pageSize } = result;
  const base = role === "admin" ? "/admin/results" : "/teacher/results";
  const { students, classes, memberships, levels } = catalog;
  const from = total ? (filters.page - 1) * pageSize + 1 : 0;
  return (
    <section className="teacher-card session-results-card">
      <SessionResultFilters
        key={JSON.stringify(filters)}
        catalog={{ students, classes, memberships, levels }}
        filters={filters}
        base={base}
      />
      <p className="teacher-note session-result-count" role="status">
        {total
          ? `Showing ${from}–${from + rows.length - 1} of ${total} matching sessions.`
          : "No matching sessions. Try another student, section, or filter."}{" "}
        Dates and times are Philippine time.
      </p>
      <p className="teacher-note">
        Open Review Runs to see each submitted program. Scroll the table
        sideways on smaller screens. Unfinished means this session has no recorded completion; it does not mean the student is still playing. Separate visits can create separate sessions.
      </p>
      <div
        className="teacher-table-wrap session-table-wrap"
        role="region"
        aria-label="Session results table"
        tabIndex={0}
      >
        <table className="teacher-table session-results-table">
          <thead>
            <tr>
              {[
                "Session ID",
                "Started",
                "Student",
                "Section",
                "Level",
                "Status",
                "Attempts",
                "Mistakes",
                "Play time",
                "Submitted lines",
                "Mode",
                "Run history",
              ].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((s) => {
                const student = students.find((p) => p.id === s.student_id);
                const level = levels.find((l) => l.id === s.level_id);
                const sectionIds = new Set(
                  memberships
                    .filter((m) => m.student_id === s.student_id)
                    .map((m) => m.class_id),
                );
                const sections = classes.filter((c) => sectionIds.has(c.id));
                const date = new Date(s.started_at);
                return (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td>
                      <time dateTime={s.started_at}>
                        {date.toLocaleDateString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}
                        <small>
                          {date.toLocaleTimeString("en-PH", {
                            timeZone: "Asia/Manila",
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </small>
                      </time>
                    </td>
                    <td className="session-text-cell">
                      <strong>{student?.name || "Student"}</strong>
                      <small>{student?.student_id}</small>
                    </td>
                    <td className="session-text-cell">
                      {sections.length
                        ? sections.map((c) => (
                            <span className="session-section" key={c.id}>
                              {sectionLabel(c)}
                            </span>
                          ))
                        : "No section"}
                    </td>
                    <td className="session-text-cell">
                      #{level?.level_number ?? s.level_id} ·{" "}
                      {level?.title || "Level"}
                    </td>
                    <td>
                      <span
                        className={
                          "status-badge " + (s.completed ? "on" : "muted")
                        }
                      >
                        {s.completed ? "Completed" : "Unfinished"}
                      </span>
                    </td>
                    <td>{s.attempts.toLocaleString()}</td>
                    <td>{s.mistakes.toLocaleString()}</td>
                    <td>{s.play_time_seconds.toLocaleString()} s</td>
                    <td>{s.lines_used.toLocaleString()}</td>
                    <td>{s.code_mode || "—"}</td>
                    <td>
                      <Link
                        prefetch={false}
                        className="teacher-btn"
                        href={
                          role === "admin"
                            ? `/admin/results/${s.id}`
                            : `/teacher/student/${s.student_id}/sessions/${s.id}`
                        }
                      >
                        Review Runs
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12}>
                  <div className="teacher-empty">No matching sessions.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <nav className="run-pagination" aria-label="Session results pages">
          {filters.page > 1 && (
            <Link
              className="teacher-btn"
              href={sessionResultsHref(base, filters, filters.page - 1)}
            >
              Previous 50
            </Link>
          )}
          <span>
            Page {filters.page} of {Math.ceil(total / pageSize)}
          </span>
          {filters.page * pageSize < total && (
            <Link
              className="teacher-btn"
              href={sessionResultsHref(base, filters, filters.page + 1)}
            >
              Next 50
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}

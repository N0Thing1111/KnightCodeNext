import Link from "next/link";
import { getSessionResults } from "@/lib/session-results";
import { SessionResults } from "@/components/session-results";
import { PythonHub } from "@/components/python-hub";
import { requireTeacher } from "@/lib/auth";
import styles from "@/components/teacher-worklists.module.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const student =
    params.student &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.student,
    )
      ? params.student
      : undefined;
  const python = params.type === "python";
  const account = await requireTeacher();
  const result = python ? null : await getSessionResults("teacher", raw);
  return (
    <>
      {student && (
        <p>
          <Link
            className="teacher-btn"
            href={`/teacher/student/${student}${python ? "#python-runs" : "#level-sessions"}`}
          >
            Back to student progress
          </Link>
        </p>
      )}
      <header className={styles.heading}>
        <div>
          <h2>Run history</h2>
          <p>
            Game sessions and Python executions, including practice and
            unsuccessful attempts.
          </p>
        </div>
        <Link className="teacher-btn" href="/teacher/monitoring">
          Review submissions
        </Link>
      </header>
      <nav
        className="teacher-card"
        aria-label="Session type"
        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <Link
          className={"teacher-btn" + (!python ? " primary" : "")}
          aria-current={!python ? "page" : undefined}
          href={
            student ? `/teacher/results?student=${student}` : "/teacher/results"
          }
        >
          Game sessions
        </Link>
        <Link
          className={"teacher-btn" + (python ? " primary" : "")}
          aria-current={python ? "page" : undefined}
          href={
            student
              ? `/teacher/results?type=python&student=${student}`
              : "/teacher/results?type=python"
          }
        >
          Python runs
        </Link>
      </nav>
      {python ? (
        <PythonHub actor={account} params={params} />
      ) : (
        result && <SessionResults result={result} role="teacher" />
      )}
    </>
  );
}

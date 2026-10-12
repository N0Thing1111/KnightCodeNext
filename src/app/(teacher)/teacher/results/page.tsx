import Link from "next/link";
import { getSessionResults } from "@/lib/session-results";
import { SessionResults } from "@/components/session-results";
import { PythonHub } from "@/components/python-hub";
import { requireTeacher } from "@/lib/auth";
import { Hero } from "@/components/teacher-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const python = params.type === "python";
  const account = await requireTeacher();
  const result = python ? null : await getSessionResults("teacher", raw);
  return (
    <>
      <Hero
        eyebrow="STUDENT RUN HISTORY"
        title="Session Results"
        description="Review game sessions and Python runs. Search for a student, inspect their code, and follow their progress."
      />
      <nav
        className="teacher-card"
        aria-label="Session type"
        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <Link
          className={"teacher-btn" + (!python ? " primary" : "")}
          aria-current={!python ? "page" : undefined}
          href="/teacher/results"
        >
          Game sessions
        </Link>
        <Link
          className={"teacher-btn" + (python ? " primary" : "")}
          aria-current={python ? "page" : undefined}
          href="/teacher/results?type=python"
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

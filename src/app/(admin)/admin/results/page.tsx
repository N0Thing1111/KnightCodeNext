import Link from "next/link";
import { getSessionResults } from "@/lib/session-results";
import { SessionResults } from "@/components/session-results";
import { PythonHub } from "@/components/python-hub";
import { requireAdmin } from "@/lib/auth";
import { AdminHero } from "@/components/admin-ui";
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
  const account = await requireAdmin();
  const result = python ? null : await getSessionResults("admin", raw);
  return (
    <>
      <AdminHero
        title="Learning records"
        description="Inspect game sessions and Python runs. Teachers manage routine assessment."
      />
      <nav
        className="teacher-card"
        aria-label="Session type"
        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <Link
          className={"teacher-btn" + (!python ? " primary" : "")}
          aria-current={!python ? "page" : undefined}
          href="/admin/results"
        >
          Game sessions
        </Link>
        <Link
          className={"teacher-btn" + (python ? " primary" : "")}
          aria-current={python ? "page" : undefined}
          href="/admin/results?type=python"
        >
          Python runs
        </Link>
      </nav>
      {python ? (
        <PythonHub actor={account} params={params} />
      ) : (
        result && <SessionResults result={result} role="admin" />
      )}
    </>
  );
}

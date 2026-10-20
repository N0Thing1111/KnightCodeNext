import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pythonRunStatusLabel } from "@/lib/python-run-status";
import type { PythonRun } from "@/lib/python-contract";

type RunSummary = Pick<PythonRun, "id" | "sequence" | "status" | "started_at" | "last_seen_at"> & {
  activity_title: string | null;
  history_cleared_at: string | null;
};

export async function StudentPythonRuns({ studentId, page, sessionPage }: {
  studentId: string;
  page: number;
  sessionPage: number;
}) {
  // Apply the signed-in teacher's RLS permissions after the parent roster check.
  // Code and output are loaded only when a run is opened.
  const db = await createClient();
  const result = await db.from("python_runs")
    .select("id,sequence,status,started_at,last_seen_at,activity_title:activity_snapshot->content->>title,history_cleared_at:result->>history_cleared_at", { count: "exact" })
    .eq("student_id", studentId)
    .order("sequence", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (result.error) throw Error("Unable to load this student's Python runs.");
  const runs = (result.data || []) as RunSummary[];
  const submissions = runs.length
    ? await db.from("python_submissions").select("run_id")
      .eq("student_id", studentId).in("run_id", runs.map(run => run.id))
    : { data: [], error: null };
  if (submissions.error) throw Error("Unable to load Python submission status.");
  const submitted = new Set((submissions.data || []).map(row => row.run_id));
  const total = result.count || 0;
  const historyUrl = `/teacher/results?type=python&student=${studentId}`;
  return (
    <section className="teacher-card" id="python-runs" aria-labelledby="student-python-heading">
      <div className="teacher-card-head"><h3 id="student-python-heading">Python runs</h3></div>
      <p className="teacher-note">Execution results and submissions are separate. Open a run to see its saved code, inputs, output, practice checks, and any teacher feedback.</p>
      <p><Link className="teacher-btn" href={historyUrl}>Search this student&apos;s Python runs</Link></p>
      <div className="teacher-table-wrap" role="region" aria-label="Student Python runs" tabIndex={0}>
        <table className="teacher-table">
          <thead><tr>
            <th scope="col">Run</th><th scope="col">Activity</th><th scope="col">Execution result</th>
            <th scope="col">Submission</th><th scope="col">Started</th><th scope="col">Run history</th>
          </tr></thead>
          <tbody>
            {runs.length ? runs.map(run => (
              <tr key={run.id}>
                <td>#{run.sequence}</td>
                <td>{run.activity_title || "Python activity"}</td>
                <td>{pythonRunStatusLabel(run)}</td>
                <td>{submitted.has(run.id) ? "Submitted" : "Not submitted"}</td>
                <td>{new Date(run.started_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
                <td>
                  <Link className="teacher-btn" href={`${historyUrl}&run=${run.id}#run-review`} aria-label={`View Python run ${run.sequence}`}>View run</Link>
                  {run.history_cleared_at && <p className="teacher-note">Code/output cleared</p>}
                </td>
              </tr>
            )) : <tr><td colSpan={6}><div className="teacher-empty">No Python runs recorded for this student.</div></td></tr>}
          </tbody>
        </table>
      </div>
      {total > 20 && <nav className="run-pagination" aria-label="Python run history pages">
        {page > 1 && <Link className="teacher-btn" href={`?sessions=${sessionPage}&pythonPage=${page - 1}#python-runs`}>Previous 20</Link>}
        <span>Page {page} of {Math.ceil(total / 20)}</span>
        {page * 20 < total && <Link className="teacher-btn" href={`?sessions=${sessionPage}&pythonPage=${page + 1}#python-runs`}>Next 20</Link>}
      </nav>}
    </section>
  );
}

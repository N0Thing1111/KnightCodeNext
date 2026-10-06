import Link from "next/link";
import type { CodeExecution, LearningSession } from "@/lib/execution-history";
import { formatTime } from "@/lib/teacher-data";

const labels: Record<string, string> = {
  running: "Final result not received",
  finished: "Finished normally",
  warning: "Finished with a warning",
  rejected: "Could not execute",
  completed: "Reached the goal",
  interrupted: "Interrupted",
};
const position = (x: number, y: number) =>
  `(${Number(x).toFixed(2)}, ${Number(y).toFixed(2)})`;
export function SessionRunHistory({
  session,
  runs,
  previous,
  page,
  total,
  href,
}: {
  session: LearningSession;
  runs: CodeExecution[];
  previous?: CodeExecution;
  page: number;
  total: number;
  href: string;
}) {
  return (
    <section className="teacher-card run-history">
      <div className="teacher-card-head">
        <div>
          <span className="teacher-eyebrow">CODING PROCESS</span>
          <h3>Session Run history</h3>
        </div>
      </div>
      <p className="teacher-note">
        Each Run keeps its own submitted code. Finishing a Run without reaching
        the goal is normal when a student builds a solution in several parts.
      </p>
      <div className="run-summary">
        <div>
          <small>Session outcome</small>
          <strong>{session.completed ? "Completed" : "Unfinished"}</strong>
        </div>
        <div>
          <small>Recorded Runs</small>
          <strong>{total}</strong>
        </div>
        <div>
          <small>Attempts (starts/restarts)</small>
          <strong>{session.attempts}</strong>
        </div>
        <div>
          <small>Play time</small>
          <strong>{formatTime(session.play_time_seconds)}</strong>
        </div>
        <div>
          <small>Recorded mistakes</small>
          <strong>{session.mistakes}</strong>
        </div>
        <div>
          <small>Submitted lines</small>
          <strong>{session.lines_used}</strong>
        </div>
      </div>
      <p className="teacher-note">
        Started{" "}
        {new Date(session.started_at).toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        })}{" "}
        (Philippine time). Positions are game-world coordinates. A missing final
        result can mean the game was closed or saving was interrupted; it does
        not prove the Run failed.
      </p>
      {!total && (
        <div className="teacher-empty">
          No submitted code was saved for this session. Sessions played before
          the updated game keep their summary statistics only.
        </div>
      )}
      <div className="run-history-list">
        {runs.map((run, index) => {
          const prior = index ? runs[index - 1] : previous;
          return (
            <details className="run-history-item" key={run.id}>
              <summary>
                <strong>Run {run.execution_number}</strong>
                <span>{labels[run.status] ?? run.status}</span>
                <span>
                  {run.code_mode} ·{" "}
                  {run.status === "running"
                    ? "duration unknown"
                    : `${(run.elapsed_ms / 1000).toFixed(1)}s`}
                </span>
              </summary>
              <div className="run-history-body">
                <p>
                  Reset count: <b>{run.restart_number}</b>
                  {prior && run.restart_number > prior.restart_number
                    ? " · The level was reset before this Run."
                    : ""}
                </p>
                <p className="teacher-note">
                  Saved{" "}
                  {new Date(run.started_at).toLocaleString("en-PH", {
                    timeZone: "Asia/Manila",
                  })}{" "}
                  (Philippine time)
                </p>
                <p>
                  Position: {position(run.start_x, run.start_y)} →{" "}
                  {position(run.end_x, run.end_y)}
                </p>
                {run.warning && (
                  <p className="teacher-alert error">{run.warning}</p>
                )}
                {run.source_truncated && (
                  <p className="teacher-note">
                    This unusually large submission exceeded the
                    32,768-character history limit. The saved code is shortened.
                  </p>
                )}
                <pre className="run-source">
                  <code>{run.source || "(Empty submission)"}</code>
                </pre>
                {prior && (
                  <details>
                    <summary>Compare with Run {prior.execution_number}</summary>
                    <p className="teacher-note">
                      {run.source === prior.source
                        ? "The submitted code is the same."
                        : "The submitted code changed."}{" "}
                      Runs can start from different positions; these are
                      separate executions.
                    </p>
                    <div className="run-comparison">
                      <div>
                        <b>Run {prior.execution_number}</b>
                        <pre className="run-source">
                          <code>{prior.source || "(Empty submission)"}</code>
                        </pre>
                      </div>
                      <div>
                        <b>Run {run.execution_number}</b>
                        <pre className="run-source">
                          <code>{run.source || "(Empty submission)"}</code>
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </details>
          );
        })}
      </div>
      {total > 50 && (
        <nav className="run-pagination" aria-label="Run history pages">
          {page > 1 && (
            <Link className="teacher-btn" href={`${href}?page=${page - 1}`}>
              Previous 50
            </Link>
          )}
          <span>
            Page {page} of {Math.ceil(total / 50)}
          </span>
          {page * 50 < total && (
            <Link className="teacher-btn" href={`${href}?page=${page + 1}`}>
              Next 50
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}

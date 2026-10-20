import type { RunOutcomes } from "@/lib/student-monitoring";

export function MonitoringOutcomes({ outcomes, compact = false }: { outcomes: RunOutcomes; compact?: boolean }) {
  if (compact) {
    if (!outcomes.total) return <span className="monitor-muted">No runs</span>;
    return <details className="monitor-run-details">
      <summary>{outcomes.total} {outcomes.total === 1 ? "run" : "runs"}</summary>
      <dl>
        <div><dt>Successful</dt><dd>{outcomes.successful}</dd></div>
        <div><dt>Unsuccessful</dt><dd>{outcomes.unsuccessful}</dd></div>
        <div><dt>Pending / unknown</dt><dd>{outcomes.unknown}</dd></div>
      </dl>
    </details>;
  }
  return <span>
    <strong>{outcomes.total} recorded runs</strong>
    <span style={{ display: "block" }}>{outcomes.successful} successful</span>
    <span style={{ display: "block" }}>{outcomes.unsuccessful} unsuccessful</span>
    <span style={{ display: "block" }}>{outcomes.unknown} pending / unknown</span>
  </span>;
}

export function MonitoringGuide() {
  return <details className="teacher-card monitoring-guide">
    <summary>How statuses and run outcomes are calculated</summary>
    <div className="monitoring-guide-content">
    <p>These indicators help teachers follow up. They are not grades or live online status. Rules are applied in the order below; archived accounts are always Inactive.</p>
    <ol>
      <li><strong>Needs Attention:</strong> an overdue incomplete assignment, a latest Python submission whose latest review requests revision, or 7 days without recorded activity while available assigned work remains incomplete. The inactivity window starts no earlier than the oldest incomplete assignment.</li>
      <li><strong>On Track:</strong> all currently available assigned work is complete, with no current revision request.</li>
      <li><strong>Active:</strong> learning activity within 48 hours, with no earlier rule applying.</li>
      <li><strong>Recently Active:</strong> activity within 14 days, with no earlier rule applying.</li>
      <li><strong>Inactive:</strong> no recorded activity yet or none within 14 days, with no earlier rule applying.</li>
    </ol>
    <p><strong>Game level attempts</strong> count starts and restarts. <strong>Game code runs</strong> count saved code submissions: finished/completed = successful execution; warning/rejected = unsuccessful execution; running/interrupted = pending or unknown. Successful execution does not always mean the level was completed.</p>
    <p><strong>Python runs:</strong> finished = successful execution; error/stopped/timeout = unsuccessful execution; running = pending or unknown. A finished program is not automatically a correct solution. Teacher review decides Passed or Needs revision.</p>
    <p>Run counts include retained records only; cleared run history is not reconstructed as failures. High retry counts never trigger Needs Attention. Python submission counts toward assignment completion independently of its review. Resubmitting removes an earlier revision flag until the new submission is reviewed.</p>
    <p>Sources: saved game progress and execution records, Python runs/submissions/reviews, assignment deadlines, and section membership. Archived sections and unavailable levels do not create follow-up flags.</p>
    </div>
  </details>;
}

import type { RunOutcomes } from "@/lib/student-monitoring";

export function MonitoringOutcomes({ outcomes }: { outcomes: RunOutcomes }) {
  return (
    <span>
      <strong>{outcomes.total} recorded runs</strong>
      <span style={{ display: "block" }}>
        {outcomes.successful} finished execution
      </span>
      <span style={{ display: "block" }}>
        {outcomes.unsuccessful} error / stopped / rejected
      </span>
      <span style={{ display: "block" }}>
        {outcomes.unknown} pending / unknown
      </span>
    </span>
  );
}

export function MonitoringGuide({
  statusesOnly = false,
}: {
  statusesOnly?: boolean;
}) {
  return (
    <details className="teacher-card monitoring-guide">
      <summary>
        {statusesOnly
          ? "How student statuses work"
          : "How statuses and run outcomes are calculated"}
      </summary>
      <div className="monitoring-guide-content">
        <p>
          These indicators help teachers follow up. They are not grades or live
          online status. Rules are applied in the order below; archived accounts
          are always Inactive.
        </p>
        <ol>
          <li>
            <strong>Needs Attention:</strong> an overdue incomplete assignment,
            a latest Python submission whose latest review requests revision, or
            7 days without recorded activity while available assigned work
            remains incomplete. The inactivity window starts no earlier than the
            oldest incomplete assignment.
          </li>
          <li>
            <strong>On Track:</strong> available assigned games are complete and
            required Python work has passed review.
          </li>
          <li>
            <strong>Active:</strong> learning activity within 48 hours, with no
            earlier rule applying.
          </li>
          <li>
            <strong>Recently Active:</strong> activity within 14 days, with no
            earlier rule applying.
          </li>
          <li>
            <strong>Inactive:</strong> no recorded activity yet or none within
            14 days, with no earlier rule applying.
          </li>
        </ol>
        {!statusesOnly && (
          <>
            <p>
              <strong>Level starts/restarts</strong> count starts and restarts.{" "}
              <strong>Game code runs</strong> count saved code submissions:
              finished/completed = successful execution; warning/rejected =
              unsuccessful execution; running/interrupted = pending or unknown.
              Successful execution does not always mean the level was completed.
            </p>
            <p>
              <strong>Python runs:</strong> finished = successful execution;
              error/stopped/timeout = unsuccessful execution; running = pending
              or unknown. A finished program is not automatically a correct
              solution. Teacher review decides Passed or Needs revision.
            </p>
            <p>
              Run counts include retained records only; cleared run history is
              not reconstructed as failures. High retry counts never trigger
              Needs Attention. Required Python work counts toward assignment
              completion after a Passed assessment. Resubmitting removes an
              earlier revision flag until the new submission is reviewed.
            </p>
            <p>
              Sources: saved game progress and execution records, Python
              runs/submissions/reviews, assignment deadlines, and section
              membership. Archived sections and unavailable levels do not create
              follow-up flags.
            </p>
          </>
        )}
      </div>
    </details>
  );
}

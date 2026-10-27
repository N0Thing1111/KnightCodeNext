export type RunOutcomes = { total: number; successful: number; unsuccessful: number; unknown: number };

// Code submissions and level restarts are different events. Never infer failed
// executions from a restart count or from deleted history.
export function runOutcomes(rows: { status: string }[], kind: "game" | "python"): RunOutcomes {
  const success = kind === "game" ? ["finished", "completed"] : ["finished"];
  const unsuccessful = kind === "game" ? ["warning", "rejected"] : ["error", "stopped", "timeout"];
  return rows.reduce((totals, row) => {
    totals.total++;
    if (success.includes(row.status)) totals.successful++;
    else if (unsuccessful.includes(row.status)) totals.unsuccessful++;
    else totals.unknown++;
    return totals;
  }, { total: 0, successful: 0, unsuccessful: 0, unknown: 0 });
}

export function monitoringStatus(input: {
  lastActivity: string | null;
  assignedTasks: number;
  completedTasks: number;
  overdue: number;
  revisions: number;
  oldestPendingAssignedAt: string | null;
  active: boolean;
}, now = Date.now()) {
  const day = 86400000;
  const last = input.lastActivity ? Date.parse(input.lastActivity) : NaN;
  const assignedAt = input.oldestPendingAssignedAt ? Date.parse(input.oldestPendingAssignedAt) : NaN;
  const reasons: string[] = [];
  if (!input.active) return { status: "Inactive", reason: "Student account is archived." };
  if (input.overdue) reasons.push(`${input.overdue} overdue incomplete assignment${input.overdue === 1 ? "" : "s"}`);
  if (input.revisions) reasons.push(`${input.revisions} Python activit${input.revisions === 1 ? "y needs" : "ies need"} revision`);
  // Start the inactivity window no earlier than the pending work's assignment.
  const idleSince = Math.max(Number.isFinite(last) ? last : -Infinity, Number.isFinite(assignedAt) ? assignedAt : Infinity);
  if (input.completedTasks < input.assignedTasks && now - idleSince >= 7 * day)
    reasons.push("No recorded activity for 7 days while assigned work remains incomplete");
  if (reasons.length) return { status: "Needs Attention", reason: reasons.join("; ") + "." };
  if (input.assignedTasks > 0 && input.completedTasks >= input.assignedTasks)
    return { status: "On Track", reason: "Available assigned games completed and required Python work submitted; review may be pending. No current revision request." };
  if (Number.isFinite(last) && now - last < 2 * day)
    return { status: "Active", reason: "Recorded learning activity within 48 hours; no follow-up flag." };
  if (Number.isFinite(last) && now - last < 14 * day)
    return { status: "Recently Active", reason: "Recorded learning activity within 14 days; no follow-up flag." };
  return { status: "Inactive", reason: Number.isFinite(last) ? "No recorded learning activity within 14 days." : "No recorded learning activity yet." };
}

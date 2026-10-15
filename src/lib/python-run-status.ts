import type { PythonRun } from "@/lib/python-contract";

// Match the database cleanup lease; this is not an execution-time limit.
export function isAbandonedPythonRun(run: Pick<PythonRun, "status" | "started_at" | "last_seen_at">, now = Date.now()) {
  return run.status === "running" && now - Date.parse(run.last_seen_at || run.started_at) > 24 * 60 * 60 * 1000;
}
export function pythonRunStatusLabel(run: Pick<PythonRun, "status" | "started_at" | "last_seen_at">) {
  if (isAbandonedPythonRun(run)) return "Unfinished (connection lost)";
  return { running: "Result pending", finished: "Finished", error: "Python error", stopped: "Stopped", timeout: "Time limit" }[run.status];
}

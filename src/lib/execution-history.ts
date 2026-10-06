import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LearningSession = {
  id: number;
  student_id: string;
  level_id: number;
  run_id: string;
  session_number: number;
  completed: boolean;
  attempts: number;
  mistakes: number;
  play_time_seconds: number;
  lines_used: number;
  started_at: string;
};
export type CodeExecution = {
  id: number;
  execution_number: number;
  restart_number: number;
  source: string;
  source_truncated: boolean;
  status: string;
  warning: string;
  code_mode: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  elapsed_ms: number;
  started_at: string;
  finished_at: string | null;
};
// Call only after checking that the current teacher/admin may view this student.
export async function getExecutionHistory(
  session: LearningSession,
  requestedPage?: string,
) {
  const page = Math.max(
    1,
    Math.min(2000, Math.floor(Number(requestedPage) || 1)),
  );
  const start = (page - 1) * 50;
  const { data, count, error } = await createAdminClient()
    .from("student_code_executions")
    .select("*", { count: "exact" })
    .eq("student_id", session.student_id)
    .eq("level_id", session.level_id)
    .eq("run_id", session.run_id)
    .eq("session_number", session.session_number)
    .order("execution_number")
    .range(Math.max(0, start - 1), start + 49);
  if (error) throw new Error("Unable to load this session's Run history.");
  const rows = (data ?? []) as CodeExecution[];
  return {
    page,
    total: count ?? 0,
    runs: start ? rows.slice(1) : rows,
    previous: start ? rows[0] : undefined,
  };
}

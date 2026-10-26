export const historyCategories = [
  { value: "python_practice", label: "Python: old unsuccessful practice", description: "Deletes unsubmitted Runs that ended with an error, were stopped, timed out, or lost their connection for over 24 hours. Finished and submitted Runs are protected." },
  { value: "python_finished", label: "Python: finished, not submitted", description: "Deletes only finished Runs that were never submitted. Finished means execution ended normally; it does not mean the teacher passed the work." },
  { value: "python_submitted", label: "Python: clear submitted code/output", description: "Clears code, input answers, output, errors, and example-check details. Keeps the submission, execution status, teacher reviews, ratings, and assignment completion. Only submissions assessed as Passed or Needs revision are eligible. Submissions awaiting assessment and already-cleared Runs are skipped." },
  { value: "game_unfinished", label: "Game: unfinished sessions", description: "Deletes sessions without a recorded level completion, including their command history." },
  { value: "game_completed", label: "Game: completed sessions", description: "Deletes completed sessions and their command history. Earned level completion and progress remain." },
  { value: "game_all", label: "Game: unfinished and completed sessions", description: "Deletes both kinds of game sessions and their command history. Earned level completion and progress remain." },
] as const;
export type HistoryCategory = (typeof historyCategories)[number]["value"];
export type HistoryFilters = { kind: HistoryCategory; before: string; student: string; section: string };
export type HistoryPreview = {
  total: number;
  count: number;
  executions: number;
  fingerprint: string;
  sample: { id: string; student: string; student_number: string | null; item: string; status: string; last_activity: string }[];
};
export type HistoryCleanupResponse = {
  error?: string;
  notice?: string;
  preview?: HistoryPreview;
  proof?: string;
};

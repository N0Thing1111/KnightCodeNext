import { isGameLevelAvailable } from "@/lib/game-build";
export type CompletionLevel = {
  id: number;
  lesson_id: number;
  level_number: number;
  active?: boolean;
  build_available?: boolean;
};
export type CompletionProgress = {
  student_id: string;
  level_id: number;
  completed: boolean;
  attempts?: number;
};
export type CompletionActivity = {
  id: string;
  lesson_id: number;
  published: boolean;
};
export type PythonCompletionStatus =
  | "not_submitted"
  | "awaiting_review"
  | "needs_revision"
  | "passed"
  | "practice_complete";
export type CompletionSubmission = {
  student_id: string;
  activity_id: string;
  status?: PythonCompletionStatus;
};
export function pythonCompletionPairs(
  submissions: {
    id: string;
    student_id: string;
    activity_id: string;
    submitted_at: string;
  }[],
  reviews: { submission_id: string; status: string }[],
): CompletionSubmission[] {
  const latest = new Map<string, CompletionSubmission>();
  const assessments = new Map(reviews.map((r) => [r.submission_id, r.status]));
  for (const s of [...submissions].sort(
    (a, b) =>
      b.submitted_at.localeCompare(a.submitted_at) || b.id.localeCompare(a.id),
  )) {
    const key = s.student_id + ":" + s.activity_id;
    if (latest.has(key)) continue;
    const review = assessments.get(s.id);
    latest.set(key, {
      student_id: s.student_id,
      activity_id: s.activity_id,
      status:
        review === "passed" || review === "needs_revision"
          ? review
          : "awaiting_review",
    });
  }
  return [...latest.values()];
}
export function pythonCompletionLabel(
  status: PythonCompletionStatus,
  independent = false,
) {
  if (independent && status === "not_submitted")
    return "Python practice pending";
  return {
    not_submitted: "Python not submitted",
    awaiting_review: "Python awaiting review",
    needs_revision: "Python needs revision",
    passed: "Python passed",
    practice_complete: "Python practice complete",
  }[status];
}
export function lessonCompletionLabel(
  c: Pick<
    ReturnType<typeof lessonCompletion>,
    "complete" | "pythonStatus" | "started"
  >,
) {
  return c.complete
    ? "Completed"
    : c.pythonStatus === "needs_revision"
      ? "Needs revision"
      : c.pythonStatus === "awaiting_review"
        ? "Awaiting review"
        : c.started
          ? "In Progress"
          : "Not Started";
}
export function lessonCompletion(
  lessonId: number,
  studentId: string,
  levels: CompletionLevel[],
  progress: CompletionProgress[],
  activities: CompletionActivity[],
  submissions: CompletionSubmission[],
) {
  const required = levels.filter(
    (l) =>
      l.lesson_id === lessonId && l.active !== false && isGameLevelAvailable(l),
  );
  const activity = activities.find(
    (a) => a.lesson_id === lessonId && a.published,
  );
  const own = progress.filter((p) => p.student_id === studentId);
  const gamesDone = required.filter((l) =>
    own.some((p) => p.level_id === l.id && p.completed),
  ).length;
  const submission =
    activity &&
    submissions.find(
      (s) => s.student_id === studentId && s.activity_id === activity.id,
    );
  const pythonStatus: PythonCompletionStatus = submission
    ? submission.status || "awaiting_review"
    : "not_submitted";
  const pythonDone =
    pythonStatus === "passed" || pythonStatus === "practice_complete";
  const total = required.length + (activity ? 1 : 0);
  const done = gamesDone + (pythonDone ? 1 : 0);
  return {
    gamesDone,
    gamesTotal: required.length,
    pythonRequired: !!activity,
    pythonDone,
    pythonStatus,
    total,
    done,
    studentWorkPending:
      gamesDone < required.length ||
      (!!activity && !pythonDone && pythonStatus !== "awaiting_review"),
    complete: total > 0 && done === total,
    pct: total ? Math.round((done / total) * 100) : 0,
    started:
      !!submission ||
      own.some(
        (p) =>
          required.some((l) => l.id === p.level_id) &&
          (p.completed || (p.attempts || 0) > 0),
      ),
  };
}

export function summarizeCompletion(
  rows: Pick<
    ReturnType<typeof lessonCompletion>,
    "gamesTotal" | "gamesDone" | "pythonRequired" | "pythonDone"
  >[],
) {
  const gamesTotal = rows.reduce((n, c) => n + c.gamesTotal, 0);
  const gamesDone = rows.reduce((n, c) => n + c.gamesDone, 0);
  const pythonTotal = rows.filter((c) => c.pythonRequired).length;
  const pythonDone = rows.filter(
    (c) => c.pythonRequired && c.pythonDone,
  ).length;
  const tasksTotal = gamesTotal + pythonTotal,
    tasksDone = gamesDone + pythonDone;
  return {
    gamesTotal,
    gamesDone,
    pythonTotal,
    pythonDone,
    tasksTotal,
    tasksDone,
    overallPct: tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0,
  };
}

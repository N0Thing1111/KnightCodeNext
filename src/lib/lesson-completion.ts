import { isGameLevelAvailable } from "@/lib/game-build";
export type CompletionLevel = { id: number; lesson_id: number; level_number: number; active?: boolean; build_available?: boolean };
export type CompletionProgress = { student_id: string; level_id: number; completed: boolean; attempts?: number };
export type CompletionActivity = { id: string; lesson_id: number; published: boolean };
export type CompletionSubmission = { student_id: string; activity_id: string };
export function lessonCompletion(lessonId: number, studentId: string, levels: CompletionLevel[], progress: CompletionProgress[], activities: CompletionActivity[], submissions: CompletionSubmission[]) {
 const required = levels.filter(l => l.lesson_id === lessonId && l.active !== false && isGameLevelAvailable(l));
 const activity = activities.find(a => a.lesson_id === lessonId && a.published);
 const own = progress.filter(p => p.student_id === studentId);
 const gamesDone = required.filter(l => own.some(p => p.level_id === l.id && p.completed)).length;
 const pythonDone = !!activity && submissions.some(s => s.student_id === studentId && s.activity_id === activity.id);
 const total = required.length + (activity ? 1 : 0);
 const done = gamesDone + (pythonDone ? 1 : 0);
 return { gamesDone, gamesTotal: required.length, pythonRequired: !!activity, pythonDone, total, done,
  complete: total > 0 && done === total, pct: total ? Math.round(done / total * 100) : 0,
  started: pythonDone || own.some(p => required.some(l => l.id === p.level_id) && (p.completed || (p.attempts || 0) > 0)) };
}

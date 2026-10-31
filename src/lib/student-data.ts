import { allRows } from "@/lib/query-pages";
import { cache } from "react";
import { learningStreak } from "./learning-streak";
import { isGameLevelAvailable } from "@/lib/game-build";
import { lessonCompletion, summarizeCompletion } from "@/lib/lesson-completion";
import { getPythonCompletion } from "@/lib/python-data";
import { createClient } from "@/lib/supabase/server";
import { rankForLevel } from "@/lib/format";
import type {
  Achievement,
  Assignment,
  Lesson,
  Level,
  LevelProgress,
  Notification,
  Profile,
} from "@/types/database";

type Scope = {
  assignments: Assignment[];
  independent: boolean;
  independentPython: string[];
  lessonIds: Set<number>;
  fullLessonIds: Set<number>;
  directLevelIds: Set<number>;
  levelIds: Set<number>;
};

const getAssignments = cache(async (studentId: string) => {
  void studentId;
  const supabase = await createClient();
  const rows = await allRows(() => supabase.from("assignments").select("*").order("created_at", { ascending: false }).order("id")) as Assignment[];
  const selected = new Map<string, Assignment>();
  for (const row of rows) {
    const contentKey = row.level_id
      ? "level:" + row.level_id
      : "lesson:" + row.lesson_id;
    const key = row.teacher_id + ":" + contentKey;
    const existing = selected.get(key);
    // A direct assignment is more specific and may carry a personal due date or instructions.
    if (!existing || (!existing.student_id && row.student_id === studentId))
      selected.set(key, row);
  }
  return [...selected.values()];
});

const getActiveLevels = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select("*, lessons!inner(id)")
    .eq("active", true)
    .eq("lessons.active", true)
    .order("level_number");
  if (error) throw error;
  return (data ?? []) as Level[];
});

const getActiveLessons = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("active", true)
    .order("order_number");
  if (error) throw error;
  return (data ?? []) as Lesson[];
});

const getStudentProgress = cache(async (studentId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_level_progress")
    .select("*")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? []) as LevelProgress[];
});

export const getAssignmentScope = cache(
  async (studentId: string): Promise<Scope> => {
    const [assignments, activeLevels, activeLessons, independentResult] = await Promise.all([
      getAssignments(studentId),
      getActiveLevels(),
      getActiveLessons(),
      (await createClient()).rpc("independent_learning_scope"),
    ]);
    if (independentResult.error) throw Error("Unable to load learning access.");
    const independent = independentResult.data as { independent: boolean; lesson_ids: number[]; python_completed: string[] };
    const activeLessonIds = new Set(activeLessons.map(lesson => lesson.id));
    const levelById = new Map(activeLevels.map((level) => [level.id, level]));
    const lessonIds = new Set<number>();
    const fullLessonIds = new Set<number>();
    const directLevelIds = new Set<number>();

    for (const row of assignments) {
      if (row.lesson_id && activeLessonIds.has(row.lesson_id)) {
        lessonIds.add(row.lesson_id);
        if (!row.level_id) fullLessonIds.add(row.lesson_id);
      }
      if (row.level_id) {
        const directLevel = levelById.get(row.level_id);
        if (directLevel) {
          directLevelIds.add(row.level_id);
          lessonIds.add(directLevel.lesson_id);
        }
      }
    }

    if (independent.independent) for (const id of independent.lesson_ids) { lessonIds.add(id); fullLessonIds.add(id); }
    const levelIds = new Set(directLevelIds);
    for (const level of activeLevels) {
      if (fullLessonIds.has(level.lesson_id)) levelIds.add(level.id);
    }
    return { assignments, lessonIds, fullLessonIds, directLevelIds, levelIds, independent: independent.independent, independentPython: independent.python_completed };
  },
);

export const getStudentLearningData = cache(async (studentId: string) => {
  // These reads are independent and run together. React cache also ensures the
  // shared layout and page reuse the same results during one navigation.
  const [scope, allLevels, allLessons, allProgress, python] = await Promise.all([
    getAssignmentScope(studentId),
    getActiveLevels(),
    getActiveLessons(),
    getStudentProgress(studentId),
    getPythonCompletion(),
  ]);
  const levels = allLevels.filter((level) => scope.levelIds.has(level.id));
  const assignedLessonIds = new Set([...scope.fullLessonIds, ...levels.map((level) => level.lesson_id)]);
  const lessons = allLessons.filter((lesson) =>
    assignedLessonIds.has(lesson.id),
  );
  const progressRows = allProgress.filter((row) =>
    scope.levelIds.has(row.level_id),
  );
  const progressByLevel = new Map(
    progressRows.map((row) => [row.level_id, row]),
  );
  const playable = new Set(scope.directLevelIds);

  for (const lessonId of scope.fullLessonIds) {
    const ordered = levels
      .filter((level) => level.lesson_id === lessonId && isGameLevelAvailable(level))
      .sort((a, b) => a.order_in_lesson - b.order_in_lesson);
    for (const level of ordered) {
      playable.add(level.id);
      if (!progressByLevel.get(level.id)?.completed) break;
    }
  }
  const completion = new Map(lessons.map(l => [l.id, lessonCompletion(l.id, studentId, levels, progressRows, scope.fullLessonIds.has(l.id) ? python.activities : [], (scope.independent ? scope.independentPython.map(activity_id => ({student_id: studentId, activity_id})) : python.submissions))]));
  return { scope, lessons, levels, progress: progressRows, playable, python, completion };
});

export const getStudentStats = cache(async (student: Profile) => {
  const { lessons, progress, completion } = await getStudentLearningData(
    student.id,
  );
  const work = summarizeCompletion([...completion.values()]);
  const lessonsCompleted = [...completion.values()].filter(c => c.complete).length;
  const xp =
    student.total_xp ?? progress.reduce((sum, row) => sum + row.xp_earned, 0);
  const level = Math.max(1, Math.floor(xp / 500) + 1);
  const levelXp = xp % 500;
  return {
    xp,
    level,
    rank: rankForLevel(level),
    xpPct: Math.min(100, Math.round(levelXp / 5)),
    streak: learningStreak(student).count,
    ...work,
    challengesDone: work.gamesDone,
    lessonsCompleted,
    totalLessons: lessons.length,
    totalLevels: work.gamesTotal,
    attempts: progress.reduce((sum, row) => sum + row.attempts, 0),
    mistakes: progress.reduce((sum, row) => sum + row.mistakes, 0),
    playTimeSeconds: progress.reduce(
      (sum, row) => sum + row.play_time_seconds,
      0,
    ),

  };
});

export const getNotifications = cache(async (studentId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_notifications")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Notification[];
});

export const getAchievements = cache(async (studentId: string) => {
  const supabase = await createClient();
  const [{ data: achievements, error }, { data: earned }] = await Promise.all([
    supabase.from("achievements").select("*").order("id"),
    supabase
      .from("student_achievements")
      .select("achievement_id,earned_at")
      .eq("student_id", studentId),
  ]);
  if (error) throw error;
  const earnedMap = new Map(
    (earned ?? []).map((row) => [row.achievement_id, row.earned_at]),
  );
  return ((achievements ?? []) as Achievement[]).map((achievement) => ({
    ...achievement,
    earned_at: earnedMap.get(achievement.id) ?? null,
  }));
});

export const getViewedLessonIds = cache(async (studentId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_activity")
    .select("metadata")
    .eq("student_id", studentId)
    .eq("action_type", "lesson_viewed");
  return new Set(
    (data ?? [])
      .map((row) =>
        Number((row.metadata as { lesson_id?: number } | null)?.lesson_id),
      )
      .filter(Boolean),
  );
});

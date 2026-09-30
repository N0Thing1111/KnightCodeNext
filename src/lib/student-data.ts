import { cache } from "react";
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
  lessonIds: Set<number>;
  fullLessonIds: Set<number>;
  directLevelIds: Set<number>;
  levelIds: Set<number>;
};

const getAssignments = cache(async (studentId: string) => {
  void studentId;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Assignment[];
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
    .select("*")
    .eq("active", true)
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
    const [assignments, activeLevels] = await Promise.all([
      getAssignments(studentId),
      getActiveLevels(),
    ]);
    const levelById = new Map(activeLevels.map((level) => [level.id, level]));
    const lessonIds = new Set<number>();
    const fullLessonIds = new Set<number>();
    const directLevelIds = new Set<number>();

    for (const row of assignments) {
      if (row.lesson_id) {
        lessonIds.add(row.lesson_id);
        if (!row.level_id) fullLessonIds.add(row.lesson_id);
      }
      if (row.level_id) {
        directLevelIds.add(row.level_id);
        const directLevel = levelById.get(row.level_id);
        if (directLevel) lessonIds.add(directLevel.lesson_id);
      }
    }

    const levelIds = new Set(directLevelIds);
    for (const level of activeLevels) {
      if (fullLessonIds.has(level.lesson_id)) levelIds.add(level.id);
    }
    return { assignments, lessonIds, fullLessonIds, directLevelIds, levelIds };
  },
);

export const getStudentLearningData = cache(async (studentId: string) => {
  // These reads are independent and run together. React cache also ensures the
  // shared layout and page reuse the same results during one navigation.
  const [scope, allLevels, allLessons, allProgress] = await Promise.all([
    getAssignmentScope(studentId),
    getActiveLevels(),
    getActiveLessons(),
    getStudentProgress(studentId),
  ]);
  if (!scope.levelIds.size)
    return {
      scope,
      lessons: [] as Lesson[],
      levels: [] as Level[],
      progress: [] as LevelProgress[],
      playable: new Set<number>(),
    };

  const levels = allLevels.filter((level) => scope.levelIds.has(level.id));
  const assignedLessonIds = new Set(levels.map((level) => level.lesson_id));
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
      .filter((level) => level.lesson_id === lessonId)
      .sort((a, b) => a.order_in_lesson - b.order_in_lesson);
    for (const level of ordered) {
      playable.add(level.id);
      if (!progressByLevel.get(level.id)?.completed) break;
    }
  }
  return { scope, lessons, levels, progress: progressRows, playable };
});

export const getStudentStats = cache(async (student: Profile) => {
  const { lessons, levels, progress } = await getStudentLearningData(
    student.id,
  );
  const completed = new Set(
    progress.filter((row) => row.completed).map((row) => row.level_id),
  );
  const lessonsCompleted = lessons.filter((lesson) => {
    const lessonLevels = levels.filter(
      (level) => level.lesson_id === lesson.id,
    );
    return (
      lessonLevels.length > 0 &&
      lessonLevels.every((level) => completed.has(level.id))
    );
  }).length;
  const xp =
    student.total_xp ?? progress.reduce((sum, row) => sum + row.xp_earned, 0);
  const level = Math.max(1, Math.floor(xp / 500) + 1);
  const levelXp = xp % 500;
  return {
    xp,
    level,
    rank: rankForLevel(level),
    xpPct: Math.min(100, Math.round(levelXp / 5)),
    streak: student.current_streak ?? 0,
    challengesDone: completed.size,
    lessonsCompleted,
    totalLessons: lessons.length,
    totalLevels: levels.length,
    attempts: progress.reduce((sum, row) => sum + row.attempts, 0),
    mistakes: progress.reduce((sum, row) => sum + row.mistakes, 0),
    playTimeSeconds: progress.reduce(
      (sum, row) => sum + row.play_time_seconds,
      0,
    ),
    overallPct: levels.length
      ? Math.round((completed.size / levels.length) * 100)
      : 0,
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

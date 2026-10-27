import { schoolDay, shiftSchoolDay } from "./school-time";
type StreakProfile = {
  current_streak?: number | null;
  last_activity_date?: string | null;
  learning_activity_dates?: string[] | null;
};
export function learningStreak(profile: StreakProfile, now = Date.now()) {
  const today = schoolDay(now);
  const yesterday = shiftSchoolDay(today, -1);
  const last = profile.last_activity_date;
  const saved = Math.max(0, Number(profile.current_streak) || 0);
  const count = last === today || last === yesterday ? saved : 0;
  // Compatibility while deploying, or with legacy profile snapshots.
  const recorded = profile.learning_activity_dates ?? (last ?
    Array.from({ length: Math.min(saved, 7) }, (_, i) => shiftSchoolDay(last, -i)) : []);
  const dates = new Set(recorded.filter(day => day <= today));
  const weekday = new Date(today + "T00:00:00Z").getUTCDay();
  const monday = shiftSchoolDay(today, -((weekday + 6) % 7));
  const todayCounted = last === today && count > 0;
  return {
    count, today, todayCounted,
    message: todayCounted ? "Today counted! Practice again tomorrow to continue your streak."
      : count > 0 ? "Practice today to continue your learning streak."
      : "Run game code or Python today to start your learning streak.",
    week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
      const date = shiftSchoolDay(monday, i);
      return { label, date, done: dates.has(date), today: date === today, future: date > today };
    }),
  };
}

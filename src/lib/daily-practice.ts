import { schoolDay } from "./school-time";
// Saved execution time, not time spent writing code. The receiver assigns deltas
// to the Philippine day on which they reach the server.
export function dailyPractice(profile: {
  practice_time_date?: string | null;
  practice_game_seconds?: number | null;
  practice_python_ms?: number | null;
}, now = Date.now()) {
  const current = profile.practice_time_date === schoolDay(now);
  const gameSeconds = current ? Math.max(0, Number(profile.practice_game_seconds) || 0) : 0;
  const pythonSeconds = current ? Math.max(0, Number(profile.practice_python_ms) || 0) / 1000 : 0;
  const minutes = Math.floor((gameSeconds + pythonSeconds) / 60);
  return { gameSeconds, pythonSeconds, minutes, percent: Math.min(100, Math.round(minutes / 30 * 100)) };
}

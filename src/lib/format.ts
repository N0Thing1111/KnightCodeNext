export function formatDuration(seconds: number) {
  if (seconds > 0 && seconds < 60) return "<1m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatLevelTime(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function rankForLevel(level: number) {
  if (level >= 10) return "Legendary Knight";
  if (level >= 7) return "Code Champion";
  if (level >= 4) return "Logic Knight";
  if (level >= 2) return "Code Apprentice";
  return "Novice Knight";
}

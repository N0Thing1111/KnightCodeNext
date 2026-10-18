// One school calendar for streaks and audit timestamps, regardless of host timezone.
export const SCHOOL_TIME_ZONE = "Asia/Manila";
export function schoolDay(value: string | number | Date = Date.now()) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
export function shiftSchoolDay(day: string, offset: number) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function formatSchoolDateTime(value: string | null | undefined) {
  if (!value) return "\u2014";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(value));
}

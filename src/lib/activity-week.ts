// School calendar days, independent of the server timezone.
export function activityWeek(now = Date.now()) {
 const day = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
 const midnight = Date.parse(day + "T00:00:00+08:00");
 return Array.from({ length: 7 }, (_, i) => {
  const start = midnight - (6 - i) * 86400000;
  return { key: new Date(start + 8 * 3600000).toISOString().slice(0,10),
   label: new Date(start).toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Manila" }),
   start: new Date(start).toISOString(), end: new Date(start + 86400000).toISOString() };
 });
}

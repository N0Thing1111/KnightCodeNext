export function latestActivity(values: (string | null | undefined)[]) {
  const dates = values.filter(
    (s): s is string => !!s && Number.isFinite(Date.parse(s)),
  );
  return dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}

export function sessionAssessment(sessions: { attempts: number; completed: boolean }[]) {
  // One completed session accounts for its final successful attempt. The last
  // attempt of an unfinished session is still in progress, not a known failure.
  return {
    successful: sessions.filter(s => s.completed).length,
    unsuccessful: sessions.reduce((sum,s) => sum + Math.max(0, Number(s.attempts || 0) - 1), 0),
    unfinished: sessions.filter(s => !s.completed).length,
  };
}
export function latestActivity(values: (string | null | undefined)[]) {
  const dates = values.filter((s): s is string => !!s && Number.isFinite(Date.parse(s)));
  return dates.sort((a,b) => Date.parse(b)-Date.parse(a))[0] || null;
}

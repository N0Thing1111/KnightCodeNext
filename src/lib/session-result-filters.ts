export type SessionFilters = {
  q: string;
  class_id: string;
  student: string;
  level: string;
  status: string;
  session: string;
  page: number;
};
export type SessionStudent = {
  id: string;
  name: string;
  student_id: string | null;
  email: string;
};
export type SessionClass = {
  id: number;
  name: string;
  section: string;
  status: string;
};
export type Membership = { class_id: number; student_id: string };
export type SessionLevel = {
  id: number;
  lesson_id: number;
  level_number: number;
  title: string;
};
export type SessionAssignment = {
  student_id: string | null;
  class_id: number | null;
  level_id: number | null;
  lesson_id: number | null;
};
export type SessionCatalog = {
  students: SessionStudent[];
  classes: SessionClass[];
  memberships: Membership[];
  levels: SessionLevel[];
  assignments: SessionAssignment[];
};
export function parseSessionFilters(
  q: Record<string, string | string[] | undefined>,
): SessionFilters {
  const text = (key: string) =>
    typeof q[key] === "string" ? q[key].trim().slice(0, 150) : "";
  return {
    q: text("q"),
    class_id: text("class_id"),
    student: text("student"),
    level: text("level"),
    session: text("session"),
    status: ["completed", "started"].includes(text("status"))
      ? text("status")
      : "",
    page: Math.max(1, Math.min(100000, Math.floor(Number(text("page"))) || 1)),
  };
}
export function sectionStudents(
  catalog: Pick<SessionCatalog, "students" | "memberships">,
  classId: string,
) {
  if (!classId) return catalog.students;
  const ids = new Set(
    catalog.memberships
      .filter((m) => String(m.class_id) === classId)
      .map((m) => m.student_id),
  );
  return catalog.students.filter((s) => ids.has(s.id));
}
export function matchingSessionStudents(
  catalog: SessionCatalog,
  filters: SessionFilters,
) {
  const term = filters.q.toLocaleLowerCase();
  return sectionStudents(catalog, filters.class_id).filter(
    (s) =>
      (!filters.student || s.id === filters.student) &&
      (!term ||
        [s.name, s.student_id, s.email].some((v) =>
          (v || "").toLocaleLowerCase().includes(term),
        )),
  );
}
// Keep each student's assigned levels paired with that student. A union of all
// teacher levels would expose another student's unassigned learning activity.
export function teacherSessionScopes(
  catalog: SessionCatalog,
  students: SessionStudent[],
) {
  return students
    .map((s) => {
      const classes = new Set(
        catalog.memberships
          .filter((m) => m.student_id === s.id)
          .map((m) => m.class_id),
      );
      const levels = new Set<number>();
      for (const a of catalog.assignments) {
        if (a.student_id !== s.id && (!a.class_id || !classes.has(a.class_id)))
          continue;
        if (a.level_id) levels.add(a.level_id);
        else if (a.lesson_id)
          catalog.levels
            .filter((l) => l.lesson_id === a.lesson_id)
            .forEach((l) => levels.add(l.id));
      }
      return {
        studentId: s.id,
        levelIds: [...levels].filter((id) =>
          catalog.levels.some((l) => l.id === id),
        ),
      };
    })
    .filter((s) => s.levelIds.length);
}
export function sessionResultsHref(
  base: string,
  filters: SessionFilters,
  page: number,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (key !== "page" && value) query.set(key, String(value));
  query.set("page", String(page));
  return `${base}?${query}`;
}

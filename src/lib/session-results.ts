import "server-only";
import { requireAdmin, requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  matchingSessionStudents,
  parseSessionFilters,
  teacherSessionScopes,
  type SessionCatalog,
  type SessionClass,
  type SessionLevel,
  type SessionStudent,
  type Membership,
  type SessionAssignment,
} from "@/lib/session-result-filters";
import type { LearningSession } from "@/lib/execution-history";

export type ResultSession = LearningSession & { code_mode: string | null };
const PAGE_SIZE = 50;
async function readAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499);
    if (error) throw new Error("Unable to load session filters.");
    rows.push(...((data || []) as T[]));
    if (!data || data.length < 500) return rows;
  }
}
export async function getSessionResults(
  role: "admin" | "teacher",
  params: Record<string, string | string[] | undefined>,
) {
  const account =
    role === "admin" ? await requireAdmin() : await requireTeacher();
  const db = createAdminClient();
  const filters = parseSessionFilters(params);
  const [classes, levels, assignments] = await Promise.all([
    readAll<SessionClass>((from, to) => {
      let q = db.from("classes").select("id,name,section,status").order("id");
      if (role === "teacher") q = q.eq("teacher_id", account.id);
      return q.range(from, to);
    }),
    readAll<SessionLevel>((from, to) => {
      let q = db
        .from("levels")
        .select("id,lesson_id,level_number,title")
        .order("id");
      if (role === "teacher") q = q.eq("active", true);
      return q.range(from, to);
    }),
    role === "teacher"
      ? readAll<SessionAssignment>((from, to) =>
          db
            .from("assignments")
            .select("student_id,class_id,level_id,lesson_id")
            .eq("teacher_id", account.id)
            .order("id")
            .range(from, to),
        )
      : Promise.resolve([]),
  ]);
  const memberships = classes.length
    ? await readAll<Membership>((from, to) =>
        db
          .from("class_students")
          .select("class_id,student_id")
          .in(
            "class_id",
            classes.map((c) => c.id),
          )
          .order("class_id")
          .order("student_id")
          .range(from, to),
      )
    : [];
  const memberIds = [...new Set(memberships.map((m) => m.student_id))];
  const students =
    role === "teacher" && !memberIds.length
      ? []
      : await readAll<SessionStudent>((from, to) => {
          let q = db
            .from("profiles")
            .select("id,name,username,email")
            .eq("role", "student")
            .order("id");
          if (role === "teacher") q = q.in("id", memberIds);
          return q.range(from, to);
        });
  students.sort((a, b) => a.name.localeCompare(b.name));
  levels.sort((a, b) => a.level_number - b.level_number);
  classes.sort((a, b) =>
    `${a.name} ${a.section}`.localeCompare(`${b.name} ${b.section}`),
  );
  const catalog: SessionCatalog = {
    classes,
    levels,
    assignments,
    memberships,
    students,
  };
  const selected = matchingSessionStudents(catalog, filters);
  const scopes =
    role === "teacher" ? teacherSessionScopes(catalog, selected) : [];
  const empty = {
    catalog,
    filters,
    rows: [] as ResultSession[],
    total: 0,
    pageSize: PAGE_SIZE,
  };
  if (
    !selected.length ||
    (role === "teacher" && !scopes.length) ||
    (filters.class_id &&
      !classes.some((c) => String(c.id) === filters.class_id)) ||
    (filters.level && !levels.some((l) => String(l.id) === filters.level)) ||
    (filters.session && !/^[1-9]\d{0,14}$/.test(filters.session))
  )
    return empty;

  // Filter in the database before pagination, so old matching sessions remain searchable.
  const makeQuery = () => {
    let q = db.from("student_level_sessions").select("*", { count: "exact" });
    if (role === "admin")
      q = q.in(
        "student_id",
        selected.map((s) => s.id),
      );
    else
      q = q.or(
        scopes
          .map(
            (s) =>
              `and(student_id.eq.${s.studentId},level_id.in.(${s.levelIds.join(",")}))`,
          )
          .join(","),
      );
    if (filters.level) q = q.eq("level_id", filters.level);
    if (filters.session) q = q.eq("id", filters.session);
    if (filters.status) q = q.eq("completed", filters.status === "completed");
    return q
      .order("started_at", { ascending: false })
      .order("id", { ascending: false });
  };
  let result = await makeQuery().range(
    (filters.page - 1) * PAGE_SIZE,
    filters.page * PAGE_SIZE - 1,
  );
  // PostgREST reports an out-of-range page as 416 rather than an empty list.
  // Recover the count before moving to the last valid page.
  if (result.error?.code === "PGRST103") result = await makeQuery().range(0, 0);
  if (result.error) throw new Error("Unable to load session results.");
  const total = result.count || 0;
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (filters.page > last) {
    filters.page = last;
    result = await makeQuery().range(
      (last - 1) * PAGE_SIZE,
      last * PAGE_SIZE - 1,
    );
    if (result.error) throw new Error("Unable to load session results.");
  }
  return {
    catalog,
    filters,
    rows: (result.data || []) as ResultSession[],
    total,
    pageSize: PAGE_SIZE,
  };
}

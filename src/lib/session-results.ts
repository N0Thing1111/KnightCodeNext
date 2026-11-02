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
import { rowsForIds } from "@/lib/query-pages";
import {
  chunks,
  partitionedHistoryPage,
  sessionScopeFilters,
} from "@/lib/history-pagination";

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
    ? ((await rowsForIds(
        classes.map((c) => c.id),
        (ids) =>
          db
            .from("class_students")
            .select("class_id,student_id")
            .in("class_id", ids)
            .order("class_id")
            .order("student_id"),
      )) as Membership[])
    : [];
  const memberIds = [...new Set(memberships.map((m) => m.student_id))];
  const students: SessionStudent[] =
    role === "teacher"
      ? await rowsForIds(memberIds, (ids) =>
          db
            .from("profiles")
            .select("id,name,username,email")
            .eq("role", "student")
            .in("id", ids)
            .order("id"),
        )
      : await readAll<SessionStudent>((from, to) => {
          const q = db
            .from("profiles")
            .select("id,name,username,email")
            .eq("role", "student")
            .order("id");
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

  // Keep student/assigned-level pairs intact across disjoint bounded queries.
  const partitions =
    role === "admin"
      ? chunks(selected.map((s) => s.id))
      : sessionScopeFilters(scopes);
  const queries = partitions.map((partition) => () => {
    let q = db
      .from("student_level_sessions")
      .select("id,started_at", { count: "exact" });
    q = Array.isArray(partition)
      ? q.in("student_id", partition)
      : q.or(partition);
    if (filters.level) q = q.eq("level_id", filters.level);
    if (filters.session) q = q.eq("id", filters.session);
    if (filters.status) q = q.eq("completed", filters.status === "completed");
    return q
      .order("started_at", { ascending: false })
      .order("id", { ascending: false });
  });
  const result = await partitionedHistoryPage<{
    id: number;
    started_at: string;
  }>(queries, filters.page, PAGE_SIZE, (a, b) => {
    // PostgreSQL timestamps retain microseconds; Date.parse alone loses them.
    const micros = (value: string) =>
      Number((value.match(/\.(\d+)/)?.[1] || "").padEnd(6, "0").slice(3, 6));
    return (
      Date.parse(b.started_at) - Date.parse(a.started_at) ||
      micros(b.started_at) - micros(a.started_at) ||
      b.id - a.id
    );
  });
  filters.page = result.page;
  const records = result.data.length
    ? await db
        .from("student_level_sessions")
        .select("*")
        .in(
          "id",
          result.data.map((r) => r.id),
        )
    : { data: [], error: null };
  if (records.error) throw new Error("Unable to load session results.");
  const byId = new Map((records.data || []).map((row) => [row.id, row]));
  return {
    catalog,
    filters,
    rows: result.data.flatMap((key) =>
      byId.has(key.id) ? [byId.get(key.id)] : [],
    ) as ResultSession[],
    total: result.count,
    pageSize: PAGE_SIZE,
  };
}

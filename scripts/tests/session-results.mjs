// Synthetic data only: no environment file, network calls, or live school records.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(path, imports) {
  const exports = {};
  const js = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(js, {
    exports,
    URLSearchParams,
    require: (name) => {
      if (!(name in imports)) throw Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
  });
  return exports;
}
const filters = load("../../src/lib/session-result-filters.ts", {});
const data = {
  classes: [
    {
      id: 1,
      name: "Class",
      section: "A",
      status: "active",
      teacher_id: "teacher-a",
    },
    {
      id: 2,
      name: "Class",
      section: "B",
      status: "active",
      teacher_id: "teacher-b",
    },
  ],
  profiles: [
    {
      id: "student-a",
      name: "Alice Example",
      student_id: "ST-001",
      email: "alice@example.test",
      role: "student",
    },
    {
      id: "student-b",
      name: "Bob Example",
      student_id: "ST-002",
      email: "bob@example.test",
      role: "student",
    },
  ],
  class_students: [
    { class_id: 1, student_id: "student-a" },
    { class_id: 2, student_id: "student-b" },
  ],
  levels: [
    { id: 1, lesson_id: 1, level_number: 1, title: "First", active: true },
    { id: 2, lesson_id: 1, level_number: 2, title: "Second", active: true },
  ],
  assignments: [
    {
      id: 1,
      teacher_id: "teacher-a",
      class_id: 1,
      student_id: null,
      level_id: 1,
      lesson_id: null,
    },
  ],
  student_level_sessions: Array.from({ length: 620 }, (_, i) => ({
    id: i + 1,
    student_id: i < 610 ? "student-a" : "student-b",
    level_id: i === 609 ? 2 : 1,
    completed: i % 2 === 0,
    started_at: new Date(1700000000000 + i * 1000).toISOString(),
  })),
};
const ranges = [];
const db = {
  from(table) {
    let conditions = [],
      sorts = [],
      pairScopes = null;
    const q = {
      select() {
        return q;
      },
      eq(k, v) {
        conditions.push((r) => String(r[k]) === String(v));
        return q;
      },
      in(k, values) {
        conditions.push((r) => values.some((v) => String(v) === String(r[k])));
        return q;
      },
      or(value) {
        pairScopes = [
          ...value.matchAll(
            /and\(student_id\.eq\.([^,]+),level_id\.in\.\(([^)]+)\)\)/g,
          ),
        ].map((m) => ({ id: m[1], levels: m[2].split(",") }));
        assert.ok(pairScopes.length);
        return q;
      },
      order(key, options = {}) {
        sorts.push([key, options.ascending !== false]);
        return q;
      },
      async range(from, to) {
        ranges.push({ table, from, to });
        let rows = data[table].filter(
          (r) =>
            conditions.every((fn) => fn(r)) &&
            (!pairScopes ||
              pairScopes.some(
                (s) =>
                  s.id === r.student_id &&
                  s.levels.includes(String(r.level_id)),
              )),
        );
        rows.sort((a, b) => {
          for (const [key, asc] of sorts) {
            if (a[key] !== b[key])
              return (a[key] < b[key] ? -1 : 1) * (asc ? 1 : -1);
          }
          return 0;
        });
        if (table === "student_level_sessions" && from > 0 && from >= rows.length)
          return { data: null, count: null, error: { code: "PGRST103" } };
        return {
          data: rows.slice(from, to + 1),
          count: rows.length,
          error: null,
        };
      },
    };
    return q;
  },
};
const authorized = [];
const { getSessionResults } = load("../../src/lib/session-results.ts", {
  "server-only": {},
  "@/lib/supabase/admin": { createAdminClient: () => db },
  "@/lib/auth": {
    requireAdmin: async () => {
      authorized.push("admin");
      return { id: "admin" };
    },
    requireTeacher: async () => {
      authorized.push("teacher");
      return { id: "teacher-a" };
    },
  },
  "@/lib/session-result-filters": filters,
});
let r = await getSessionResults("admin", { q: "alice", session: "1" });
assert.equal(r.total, 1);
assert.equal(r.rows[0].id, 1); // Older than the original 500-row cutoff.
r = await getSessionResults("admin", {
  q: "st-001",
  class_id: "1",
  status: "completed",
  page: "2",
});
assert.equal(r.total, 305);
assert.equal(r.rows.length, 50);
assert.equal(r.filters.page, 2);
assert.ok(r.rows.every((s) => s.student_id === "student-a" && s.completed));
r = await getSessionResults("admin", { q: "BOB@EXAMPLE.TEST", class_id: "2" });
assert.equal(r.total, 10);
r = await getSessionResults("admin", { q: "alice", class_id: "2" });
assert.equal(r.total, 0);
r = await getSessionResults("admin", { session: "1),id.gt.0" });
assert.equal(r.total, 0);
r = await getSessionResults("admin", { q: "alice", page: "9999" });
assert.equal(r.filters.page, 13);
assert.equal(r.rows.length, 10);
r = await getSessionResults("teacher", {});
assert.equal(r.total, 609);
assert.equal(r.catalog.students.length, 1);
assert.equal(r.catalog.classes.length, 1);
assert.ok(
  r.rows.every((s) => s.student_id === "student-a" && s.level_id === 1),
);
for (const params of [
  { student: "student-b" },
  { class_id: "2" },
  { level: "2" },
  { session: "610" },
]) {
  r = await getSessionResults("teacher", params);
  assert.equal(r.total, 0);
}
const href = filters.sessionResultsHref(
  "/teacher/results",
  filters.parseSessionFilters({
    q: "Alice & Bob",
    class_id: "1",
    student: "student-a",
    level: "1",
    status: "completed",
    session: "20",
  }),
  2,
);
const query = new URL(href, "http://localhost").searchParams;
assert.equal(query.get("q"), "Alice & Bob");
assert.equal(query.get("class_id"), "1");
assert.equal(query.get("page"), "2");
assert.equal(query.get("session"), "20");
assert.equal(
  filters.sectionStudents(
    { students: data.profiles, memberships: data.class_students },
    "2",
  )[0].id,
  "student-b",
);
assert.ok(authorized.includes("admin") && authorized.includes("teacher"));
assert.ok(
  ranges.some((r) => r.table === "student_level_sessions" && r.from === 50),
);
console.log(
  "PASS: old records, combined filters, pagination, preserved query parameters, section dropdown scope, and teacher student/level authorization.",
);

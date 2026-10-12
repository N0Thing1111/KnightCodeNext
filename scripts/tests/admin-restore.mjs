import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript");
const tableNames = [
  "profiles",
  "lessons",
  "levels",
  "classes",
  "class_students",
  "assignments",
  "student_level_progress",
  "student_activity",
  "achievements",
  "student_achievements",
  "student_notifications",
  "student_telemetry_runs",
  "student_level_sessions",
  "student_code_executions",
  "announcements",
  "teacher_notifications",
];
let rows = [],
  created = [],
  calls = [],
  rpcFailure = false,
  version = 1;
let emails = [],
  emailMode = "success",
  createErrorAt = 0,
  activeEmails = 0,
  maxActiveEmails = 0;
async function fakeMail(role, input) {
  assert.equal(rpcFailure, false, "Never email after a failed restore");
  assert.equal(
    calls.at(-1).name,
    "restore_school_backup",
    "Database restore must finish before sending",
  );
  emails.push({ role, ...input });
  activeEmails++;
  maxActiveEmails = Math.max(maxActiveEmails, activeEmails);
  await new Promise((resolve) => setImmediate(resolve));
  activeEmails--;
  if (emailMode === "mixed" && role === "student")
    throw Error("Simulated unexpected mail failure");
  return emailMode !== "mixed";
}
const fakeDb = {
  from() {
    const q = {
      select() {
        return q;
      },
      order() {
        return q;
      },
      async range(a, b) {
        return { data: rows.slice(a, b + 1), error: null };
      },
    };
    return q;
  },
  rpc: async (name, p) => {
    calls.push({ name, p });
    if (name === "school_restore_version")
      return { data: version, error: null };
    return rpcFailure
      ? { error: { message: "foreign key violation" }, data: null }
      : {
          data: Object.fromEntries(
            tableNames.map((t) => [t, p.p_backup.tables[t].length]),
          ),
          error: null,
        };
  },
  auth: {
    admin: {
      createUser: async (p) => {
        created.push(p);
        if (createErrorAt === created.length)
          return { data: {}, error: { message: "Cannot create account" } };
        return {
          data: { user: { id: "new-auth-id-" + created.length } },
          error: null,
        };
      },
      deleteUser() {
        throw Error("Must never delete accounts");
      },
      updateUserById() {
        throw Error("Must never reset existing passwords");
      },
    },
  },
};
const source = readFileSync(
  new URL("../../src/lib/admin-restore.ts", import.meta.url),
  "utf8",
);
const exports = {};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  {
    exports,
    require(name) {
      if (name === "@/lib/mail")
        return {
          sendTeacherPasswordEmail: (p) => fakeMail("teacher", p),
          sendStudentPasswordEmail: (p) => fakeMail("student", p),
        };
      if (name === "server-only") return {};
      if (name === "@/lib/admin-backup") return { BACKUP_TABLES: tableNames };
      if (name === "@/lib/supabase/admin")
        return { createAdminClient: () => fakeDb };
      return require(name);
    },
  },
);
const { restoreSchoolBackup, validateRestoreBackup } = exports;
const backup = {
  format: "KnightCode Supabase school save",
  version: 2,
  tables: Object.fromEntries(tableNames.map((t) => [t, []])),
};
backup.tables.profiles = [
  {
    id: "old-teacher",
    email: "teacher@test.invalid",
    role: "teacher",
    name: "Teacher",
    teacher_id: "TCH-1",
    school_code: "TEST",
  },
  {
    id: "old-student",
    email: "student@test.invalid",
    role: "student",
    name: "Student",
    student_id: "STU-1",
    username: "student1",
    school_code: "TEST",
  },
];
backup.tables.lessons = [{ id: 1 }];
backup.tables.levels = [{ id: 1, lesson_id: 1 }];
backup.tables.classes = [{ id: 1, teacher_id: "old-teacher" }];
backup.tables.assignments = [
  {
    id: 1,
    teacher_id: "old-teacher",
    student_id: "old-student",
    class_id: null,
    lesson_id: 1,
    level_id: null,
  },
];
backup.tables.student_level_sessions = [
  { id: 1, student_id: "old-student", level_id: 1 },
];
rows = Array.from({ length: 1001 }, (_, i) => ({
  id: "extra" + i,
  email: "extra" + i + "@test.invalid",
  role: "student",
}));
rows.push(
  { id: "current-teacher", email: "teacher@test.invalid", role: "teacher" },
  { id: "current-student", email: "student@test.invalid", role: "student" },
);
let result = await restoreSchoolBackup(backup, "admin");
assert.equal(created.length, 0);
assert.equal(result.counts.assignments, 1);
assert.equal(emails.length, 0);
assert.equal(result.emailSummary, undefined);
assert.equal(calls.at(-1).p.p_user_map["old-teacher"], "current-teacher");
assert.equal(calls.at(-1).p.p_user_map["old-student"], "current-student");
const bad = structuredClone(backup);
bad.tables.classes[0].teacher_id = "absent";
calls = [];
await assert.rejects(() => restoreSchoolBackup(bad, "admin"), /Broken/);
assert.equal(calls.length, 0);
version = 0;
await assert.rejects(() => restoreSchoolBackup(backup, "admin"), /migration/);
assert.equal(created.length, 0);
version = 1;
rows = rows.filter((p) => p.email !== "student@test.invalid");
result = await restoreSchoolBackup(backup, "admin");
assert.equal(created.length, 1);
assert.equal(result.credentials.length, 1);
assert.equal(calls.at(-1).p.p_user_map["old-student"], "new-auth-id-1");
assert.equal(result.credentials[0].emailSent, true);
assert.equal(emails[0].temporaryPassword, created[0].password);
assert.equal(emails[0].studentId, "STU-1");
assert.equal(emails[0].reason, "restore");
const beforeFailedRestoreEmails = emails.length;
rpcFailure = true;
await assert.rejects(
  () => restoreSchoolBackup(backup, "admin"),
  /not confirmed/,
);
assert.equal(emails.length, beforeFailedRestoreEmails);
console.log(
  "PASS: paginated account matching after UUID changes, no existing password resets/deletions, nullable links, missing-account credentials, preflight migration check, invalid backup rejection, and failure reporting.",
);

const conflicting = structuredClone(backup);
conflicting.tables.class_students = [
  { class_id: 1, student_id: "old-student" },
  { class_id: 1, student_id: "old-student" },
];
assert.throws(() => validateRestoreBackup(conflicting), /multiple sections/);

// Delivery failure (including an unexpected exception) does not hide restore results.
rpcFailure = false;
rows = [];
created = [];
emails = [];
emailMode = "mixed";
result = await restoreSchoolBackup(backup, "admin");
assert.equal(result.counts.student_level_sessions, 1);
assert.ok(result.notice);
assert.equal(result.emailSummary.sent, 0);
assert.equal(result.emailSummary.failed, 2);
assert.equal(result.credentials.length, 2);
assert.ok(result.credentials.every((c) => c.password && c.emailSent === false));
assert.equal(emails[0].teacherId, "TCH-1");
assert.equal(emails[1].studentId, "STU-1");
assert.equal(emails[0].temporaryPassword, created[0].password);
assert.equal(emails[1].temporaryPassword, created[1].password);
assert.ok(
  emails.every((e) => e.reason === "restore" && e.schoolLabel === "TEST"),
);
emailMode = "success";
emails = [];
created = [];
result = await restoreSchoolBackup(backup, "admin");
assert.equal(result.emailSummary.sent, 2);
assert.equal(result.emailSummary.failed, 0);
// A second successful restore reuses those accounts and sends nothing.
rows = backup.tables.profiles.map((p, i) => ({
  ...p,
  id: "new-auth-id-" + (i + 1),
}));
emails = [];
created = [];
result = await restoreSchoolBackup(backup, "admin");
assert.equal(emails.length, 0);
assert.equal(created.length, 0);
assert.equal(result.credentials.length, 0);
// Partial account preparation must not send any passwords before the restore.
rows = [];
created = [];
emails = [];
createErrorAt = 2;
calls = [];
await assert.rejects(
  () => restoreSchoolBackup(backup, "admin"),
  /prepare a missing account/,
);
assert.equal(emails.length, 0);
assert.ok(calls.every((c) => c.name !== "restore_school_backup"));
createErrorAt = 0;
created = [];
emails = [];
maxActiveEmails = 0;
const large = structuredClone(backup);
large.tables.profiles = Array.from({ length: 12 }, (_, i) => ({
  id: "teacher-" + i,
  email: "teacher-" + i + "@test.invalid",
  role: "teacher",
  name: "Teacher " + i,
}));
for (const name of tableNames) if (name !== "profiles") large.tables[name] = [];
result = await restoreSchoolBackup(large, "admin");
assert.equal(result.emailSummary.sent, 12);
assert.ok(maxActiveEmails <= 5);
console.log(
  "PASS: restored student/teacher credentials emailed only after success, existing accounts and failed restores send nothing, repeated restore sends nothing, delivery failures preserve results/passwords, and SMTP concurrency is limited.",
);

// New databases reject legacy restores before creating accounts or sending email.
version = 2;
created = [];
emails = [];
calls = [];
await assert.rejects(
  () => restoreSchoolBackup(backup, "admin"),
  /version 3 save/,
);
assert.equal(created.length, 0);
assert.equal(emails.length, 0);
assert.ok(calls.every((c) => c.name !== "restore_school_backup"));
console.log(
  "PASS legacy-save preflight protects Python history before account preparation.",
);

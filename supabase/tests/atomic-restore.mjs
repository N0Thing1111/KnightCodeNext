import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(resolve(process.argv[2], "package.json"));
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,encrypted_password text);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text,owner_id text);
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
`);
for (const f of [
  "202609270001_student_foundation.sql",
  "202609270002_student_runtime_fixes.sql",
  "202609280001_teacher_foundation.sql",
  "202609300001_admin_foundation.sql",
  "202610050001_achievement_awards.sql",
  "202610050002_code_execution_history.sql",
  "202610070001_atomic_school_restore.sql",
  "202610070002_restore_safeupdate.sql",
]) {
  await db.exec(
    readFileSync(
      new URL("../migrations/" + f, import.meta.url),
      "utf8",
    ).replace("create extension if not exists pgcrypto;", ""),
  );
}
// PGlite does not ship Supabase's safeupdate library. Enforce its WHERE-clause
// requirement structurally here; the Supabase temporary-table check separately
// verifies the installed function against the hosted table structures.
const restoreSql = readFileSync(new URL('../migrations/202610070001_atomic_school_restore.sql', import.meta.url), 'utf8');
assert.doesNotMatch(restoreSql, /delete\s+from\s+public\.[a-z_]+\s*;/i);
assert.equal((restoreSql.match(/delete from public\.[a-z_]+ where /g) || []).length,16);
const admin = "00000000-0000-0000-0000-000000000001";
const teacher = "00000000-0000-0000-0000-000000000002";
const student = "00000000-0000-0000-0000-000000000003";
const newTeacher = "00000000-0000-0000-0000-000000000004";
const newStudent = "00000000-0000-0000-0000-000000000005";
await db.exec(`
insert into auth.users values
 ('${admin}','admin@test.invalid','{"role":"admin"}','admin-hash'),
 ('${teacher}','teacher@test.invalid','{"role":"teacher"}','teacher-hash'),
 ('${student}','student@test.invalid','{"role":"student"}','student-hash');
update profiles set teacher_id='ORIGINAL-ID',school_code='TEST' where id='${teacher}';
insert into lessons(id,title,order_number) values(10,'Sequence',1);
insert into levels(id,lesson_id,level_number,order_in_lesson,title) values(20,10,1,1,'First');
insert into achievements(id,name,description,requirement_type) values(30,'First win','Complete a level','levels_completed');
insert into classes(id,teacher_id,name,section) values(40,'${teacher}','Class','A');
insert into class_students values(40,'${student}',now());
insert into assignments(id,teacher_id,student_id,lesson_id,title) values(50,'${teacher}','${student}',10,'Individual');
insert into assignments(id,teacher_id,class_id,level_id,title) values(51,'${teacher}',40,20,'Section');
insert into student_level_progress(student_id,level_id,completed,attempts,lines_used,xp_earned) values('${student}',20,true,2,7,100);
insert into student_activity(student_id,level_id,action_type,metadata) values('${student}',null,'lesson_viewed','{"lesson_id":10}');
insert into student_achievements values('${student}',30,now());
insert into student_notifications(student_id,title,message,link) values('${student}','Hello','Test','/lesson/10');
insert into student_telemetry_runs(student_id,level_id,run_id) values('${student}',20,'test-run');
insert into student_level_sessions(id,student_id,level_id,run_id,completed,lines_used,code_mode) overriding system value values(90,'${student}',20,'test-run',true,7,'hint');
insert into student_code_executions(id,student_id,level_id,run_id,session_number,execution_number,restart_number,source,status,code_mode,start_x,start_y,end_x,end_y,elapsed_ms)
overriding system value values(100,'${student}',20,'test-run',1,1,0,'move(right)','finished','hint',0,0,1,0,150);
insert into announcements(teacher_id,class_id,title,body,status) values('${teacher}',null,'All classes','Preserve null class','published');
insert into teacher_notifications(teacher_id,notification_key,title,message,link) values('${teacher}','test','Saved','Notification','/teacher/student/${student}/sessions/90');
`);
const tables = [
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
async function snapshot() {
  const data = {};
  for (const t of tables)
    data[t] = (
      await db.query(
        `select to_jsonb(t) r from public.${t} t ${t === "profiles" ? "where role<>'admin'" : ""} order by to_jsonb(t)::text`,
      )
    ).rows.map((r) => r.r);
  return data;
}
const backup = {
  format: "KnightCode Supabase school save",
  version: 2,
  created_at: new Date().toISOString(),
  tables: await snapshot(),
};
const call = async (
  b = backup,
  map = { [teacher]: teacher, [student]: student },
  who = admin,
) =>
  (
    await db.query(
      "select restore_school_backup($1::jsonb,$2::jsonb,$3::uuid) counts",
      [JSON.stringify(b), JSON.stringify(map), who],
    )
  ).rows[0].counts;
await db.exec(
  `update profiles set teacher_id='CHANGED' where id='${teacher}'; delete from classes; delete from student_level_sessions;`,
);
let counts = await call();
for (const t of tables)
  assert.equal(counts[t], backup.tables[t].length, t + " count");
let restored = await snapshot();
for (const t of tables.filter((t) => t !== "profiles"))
  assert.deepEqual(restored[t], backup.tables[t], t + " contents");
assert.equal(
  restored.profiles.find((p) => p.id === teacher).teacher_id,
  "ORIGINAL-ID",
);
assert.equal(
  (
    await db.query(
      `select encrypted_password from auth.users where id='${teacher}'`,
    )
  ).rows[0].encrypted_password,
  "teacher-hash",
);
await call(); // Repeated restoration is deterministic, without duplicates.
assert.deepEqual(
  (await snapshot()).student_code_executions,
  backup.tables.student_code_executions,
);
assert.equal(
  (await db.query("select count(*)::int n from auth.users")).rows[0].n,
  3,
);

// Failure late in the restore must undo earlier deletes and inserts.
const before = await snapshot();
const bad = structuredClone(backup);
bad.tables.student_code_executions[0].level_id = 999;
await assert.rejects(() => call(bad), /foreign key/);
assert.deepEqual(
  await snapshot(),
  before,
  "late failure rolled back every table",
);
const missing = structuredClone(backup);
delete missing.tables.classes;
await assert.rejects(() => call(missing), /missing table/);
assert.deepEqual(await snapshot(), before);
await assert.rejects(() => call(backup, { [teacher]: teacher }), /mapping/);
await assert.rejects(
  () => call(backup, { [teacher]: admin, [student]: student }),
  /does not match/,
);
await assert.rejects(
  () => call(backup, { [teacher]: teacher, [student]: student }, student),
  /administrator/,
);
await db.exec("set role authenticated");
await assert.rejects(() => call(), /permission denied/);
await db.exec("reset role");

// Model the actual recovery case: Auth UUIDs changed in the earlier broken restore.
await db.exec(`delete from auth.users where id in ('${teacher}','${student}');
insert into auth.users values('${newTeacher}','teacher@test.invalid','{"role":"teacher"}','current-teacher-password'),
('${newStudent}','student@test.invalid','{"role":"student"}','current-student-password');`);
counts = await call(backup, { [teacher]: newTeacher, [student]: newStudent });
for (const t of tables)
  assert.equal(counts[t], backup.tables[t].length, t + " remapped count");
assert.equal(
  (await db.query("select teacher_id from classes")).rows[0].teacher_id,
  newTeacher,
);
assert.equal(
  (await db.query("select student_id from student_code_executions")).rows[0]
    .student_id,
  newStudent,
);
assert.equal((await db.query("select link from teacher_notifications")).rows[0].link, "/teacher/student/"+newStudent+"/sessions/90");
assert.equal(
  (await db.query("select source from student_code_executions")).rows[0].source,
  "move(right)",
);
assert.equal(
  (
    await db.query(
      `select encrypted_password from auth.users where id='${newStudent}'`,
    )
  ).rows[0].encrypted_password,
  "current-student-password",
);
const next = (
  await db.query(
    `insert into student_level_sessions(student_id,level_id,run_id) values('${newStudent}',20,'next-run') returning id`,
  )
).rows[0].id;
assert.ok(next > 90, "identity sequence advanced");
const legacy = structuredClone(backup);
legacy.version = 1;
delete legacy.tables.student_code_executions;
const legacyCounts = await call(legacy, {
  [teacher]: newTeacher,
  [student]: newStudent,
});
assert.equal(legacyCounts.student_code_executions, 0);
assert.equal(legacyCounts.student_level_sessions, 1);
console.log(
  "PASS: real PostgreSQL full restore, all table contents, nullable assignments/announcements, changed Auth UUIDs, passwords preserved, repeat restore, rollback on late failure, invalid mappings, permission checks, identity sequences and legacy saves.",
);
await db.close();

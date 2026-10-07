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
  "202610070003_single_section_membership.sql",
]) {
  await db.exec(
    readFileSync(
      new URL("../migrations/" + f, import.meta.url),
      "utf8",
    ).replace("create extension if not exists pgcrypto;", ""),
  );
}

const admin = "00000000-0000-0000-0000-000000000001",
  t1 = "00000000-0000-0000-0000-000000000002",
  t2 = "00000000-0000-0000-0000-000000000003",
  student = "00000000-0000-0000-0000-000000000004";
await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values
('${admin}','admin@test.invalid','{"role":"admin"}'),('${t1}','one@test.invalid','{"role":"teacher"}'),('${t2}','two@test.invalid','{"role":"teacher"}'),('${student}','student@test.invalid','{"role":"student"}');
insert into classes(id,teacher_id,name,section) values(1,'${t1}','Grade 11','ICT A'),(2,'${t1}','ICT B','ICT B'),(3,'${t2}','ICT C','ICT C');
insert into lessons(id,title,order_number) values(1,'Sequence',1),(2,'Choices',2);
insert into levels(id,lesson_id,level_number,order_in_lesson,title) values(1,1,1,1,'First');
insert into student_level_sessions(student_id,level_id,run_id) values('${student}',1,'preserved-history');`);
const set = (section, actor = admin, move = false) =>
  db.query("select set_student_section($1,$2,$3,$4)", [
    student,
    section,
    actor,
    move,
  ]);
const profile = async () =>
  (await db.query("select class_section from profiles where id=$1", [student]))
    .rows[0].class_section;
await set(1, t1);
assert.equal(await profile(), "Grade 11 - ICT A");
await set(1, t1);
assert.equal(
  (await db.query("select count(*)::int n from class_students")).rows[0].n,
  1,
);
await assert.rejects(
  () =>
    db.query("insert into class_students(class_id,student_id) values(3,$1)", [
      student,
    ]),
  /unique/,
);
await assert.rejects(() => set(3, t2, true), /another teacher/);
await assert.rejects(() => set(2, t1), /transfer option/);
await set(2, t1, true);
assert.equal(await profile(), "ICT B");
await db.exec("update classes set name='Renamed B' where id=2");
assert.equal(await profile(), "Renamed B");
await db.query("update profiles set class_section='Fake section' where id=$1", [
  student,
]);
assert.equal(await profile(), "Renamed B");
await assert.rejects(() => set(3, student, true), /authentication/);
await db.exec(
  `insert into assignments(teacher_id,student_id,lesson_id,title) values('${t1}','${student}',1,'Previous teacher');`,
);
await set(3, admin, true);
assert.equal(await profile(), "ICT C");
assert.equal(
  (await db.query("select count(*)::int n from student_level_sessions")).rows[0]
    .n,
  1,
);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
  student,
]);
await assert.rejects(
  () => db.query("select record_student_activity('lesson_viewed',1,null)"),
  /not assigned/i,
);
await db.exec(`insert into assignments(teacher_id,student_id,lesson_id,title) values('${t2}','${student}',2,'Current teacher');
grant usage on schema auth to authenticated; grant select on all tables in schema public to authenticated; set role authenticated;`);
const visible = (
  await db.query("select title from assignments order by id")
).rows.map((r) => r.title);
assert.deepEqual(visible, ["Current teacher"]);
await db.query("select record_student_activity('lesson_viewed',2,null)");
await assert.rejects(() => set(1), /permission denied/);
await assert.rejects(
  () =>
    db.query("update profiles set class_section='Fake' where id=$1", [student]),
  /permission denied/,
);
await db.exec("reset role");
await set(null);
assert.equal(await profile(), null);
assert.equal(
  (await db.query("select count(*)::int n from student_level_sessions")).rows[0]
    .n,
  1,
);
await db.exec("update classes set status='archived' where id=1");
await assert.rejects(() => set(1), /active section/);
await set(2);
await db.exec("delete from classes where id=2");
assert.equal(await profile(), null);
// Confirm both other game RPCs also require the current teacher.
for (const signature of [
  "record_level_progress(bigint,jsonb)",
  "record_code_execution(bigint,jsonb)",
]) {
  const definition = (
    await db.query("select pg_get_functiondef($1::regprocedure) sql", [
      signature,
    ])
  ).rows[0].sql;
  assert.match(
    definition,
    /is_current_student_teacher\(v_student,a.teacher_id\)/,
  );
}
// Old multi-section data must stop migration instead of silently losing links.
await db.exec(
  `drop trigger sync_student_section on class_students; drop index class_students_one_section; insert into class_students(class_id,student_id) values(1,'${student}'),(3,'${student}');`,
);
await assert.rejects(
  () =>
    db.exec(
      readFileSync(
        new URL(
          "../migrations/202610070003_single_section_membership.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  /multiple sections/,
);
await db.exec("rollback");
assert.equal(
  (await db.query("select count(*)::int n from class_students")).rows[0].n,
  2,
);
console.log(
  "PASS: unique membership, idempotent enrollment, blocked cross-teacher claims, explicit transfers, synchronized section names, student read-only membership, previous-teacher assignment access revoked, archived-target rejection, preserved session history, and removal/deletion sync.",
);
await db.close();

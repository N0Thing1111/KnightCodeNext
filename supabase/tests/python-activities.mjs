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
// PGlite does not ship Supabase's safeupdate library. Enforce its WHERE-clause
// requirement structurally here; the Supabase temporary-table check separately
// verifies the installed function against the hosted table structures.
const restoreSql = readFileSync(
  new URL(
    "../migrations/202610070001_atomic_school_restore.sql",
    import.meta.url,
  ),
  "utf8",
);
assert.doesNotMatch(restoreSql, /delete\s+from\s+public\.[a-z_]+\s*;/i);
assert.equal(
  (restoreSql.match(/delete from public\.[a-z_]+ where /g) || []).length,
  16,
);
const admin = "00000000-0000-0000-0000-000000000001";
const teacher = "00000000-0000-0000-0000-000000000002";
const student = "00000000-0000-0000-0000-000000000003";

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
// All data below lives in PGlite memory; no credentials or network DB connection.
for (const file of [
  "202610110001_python_activities.sql",
  "202610110002_python_backup_restore.sql",
  "202610110003_python_lesson_flow.sql",
])
  await db.exec(
    readFileSync(new URL("../migrations/" + file, import.meta.url), "utf8"),
  );
const activity = (
  await db.query("select id from python_activities where lesson_id=10")
).rows[0].id;
const run = "10000000-0000-0000-0000-000000000001";
const outsider = "00000000-0000-0000-0000-000000000099";
await db.exec(
  `insert into auth.users values('${outsider}','outsider@test.invalid','{"role":"teacher"}','hash'); grant usage on schema auth to authenticated;`,
);
async function as(user) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`,
  );
}
// A completed, assigned lesson includes Python without a separate grant.
await as(student);
assert.equal(
  (await db.query("select python_can_start($1) allowed", [activity])).rows[0]
    .allowed,
  true,
);
await db.exec(
  "reset role; update student_level_progress set completed=false where level_id=20",
);
await as(student);
assert.equal(
  (await db.query("select python_can_start($1) allowed", [activity])).rows[0]
    .allowed,
  false,
);
await assert.rejects(() =>
  db.query("select python_start_run($1,$2,$3)", [activity, run, "print(1)"]),
);
// An old override must not bypass the new completion requirement.
await db.exec("reset role");
await db.query(
  "insert into python_grants(activity_id,teacher_id,student_id,skip_game_gate) values($1,$2,$3,true)",
  [activity, teacher, student],
);
await as(student);
assert.equal(
  (await db.query("select python_can_start($1) allowed", [activity])).rows[0]
    .allowed,
  false,
);
await db.exec(
  "reset role; update student_level_progress set completed=true where level_id=20; update assignments set lesson_id=null, level_id=20 where id=50",
);
await as(student);
assert.equal(
  (await db.query("select python_can_start($1) allowed", [activity])).rows[0]
    .allowed,
  false,
  "Single-level assignment does not unlock the whole lesson activity",
);
await db.exec(
  "reset role; update assignments set lesson_id=10, level_id=null, student_id=null, class_id=40 where id=50",
);
await as(student);
assert.equal(
  (await db.query("select python_can_start($1) allowed", [activity])).rows[0]
    .allowed,
  true,
  "Section lesson assignment includes Python",
);
await db.exec(
  "reset role; update assignments set student_id='" +
    student +
    "', class_id=null where id=50",
);
await as(teacher);
await assert.rejects(
  () => db.query("select python_assign($1,null,40,true,null)", [activity]),
  "Separate Python assignments are disabled",
);
await as(student);
await db.query("select python_start_run($1,$2,$3)", [
  activity,
  run,
  "print(105)\nprint(15)",
]);
await db.query("select python_start_run($1,$2,$3)", [
  activity,
  run,
  "print(105)\nprint(15)",
]);
assert.equal(
  (await db.query("select count(*)::int n from python_runs")).rows[0].n,
  1,
  "Run start retry must not duplicate",
);
await assert.rejects(() =>
  db.query("select python_start_run($1,$2,$3)", [
    activity,
    run,
    'print("replacement")',
  ]),
);
await assert.rejects(() => db.exec("update python_runs set source='changed'"));
await assert.rejects(() => db.query("select python_submit($1)", [run]));
await assert.rejects(() =>
  db.query("select python_finish_run($1,$2,$3)", [
    run,
    "finished",
    { checks: "bad" },
  ]),
);
const payload = {
  output: "105\n15\n",
  error: "",
  inputs: ["3", "120"],
  elapsed_ms: 100,
  checks: [],
};
await db.query("select python_finish_run($1,$2,$3)", [
  run,
  "finished",
  payload,
]);
await db.query("select python_finish_run($1,$2,$3)", [
  run,
  "finished",
  payload,
]);
await assert.rejects(() =>
  db.query("select python_finish_run($1,$2,$3)", [run, "error", {}]),
);
const submission = (await db.query("select python_submit($1) id", [run]))
  .rows[0].id;
assert.equal(
  (await db.query("select python_submit($1) id", [run])).rows[0].id,
  submission,
);
await as(outsider);
assert.equal(
  (await db.query("select count(*)::int n from python_runs")).rows[0].n,
  0,
  "Other teacher cannot read history",
);
await assert.rejects(() =>
  db.query("select python_review($1,$2,4,4,4,$3)", [
    submission,
    "passed",
    "Not my student",
  ]),
);
await as(teacher);
assert.equal(
  (await db.query("select count(*)::int n from python_runs")).rows[0].n,
  1,
);
await db.query("select python_review($1,$2,3,3,4,$3)", [
  submission,
  "needs_revision",
  "Explain your sequence, then revise.",
]);
await as(admin);
const original = (
  await db.query("select content from python_activities where id=$1", [
    activity,
  ])
).rows[0].content;
await db.query("select python_update_activity($1,$2,true)", [
  activity,
  { ...original, title: "Edited title" },
]);
assert.equal(
  (
    await db.query("select activity_snapshot from python_runs where id=$1", [
      run,
    ])
  ).rows[0].activity_snapshot.content.title,
  original.title,
  "Old Run keeps old activity",
);
await db.exec("reset role");
await db.exec(`update classes set teacher_id='${outsider}' where id=40`);
await as(teacher);
assert.equal(
  (await db.query("select count(*)::int n from python_runs")).rows[0].n,
  0,
);
await as(outsider);
assert.equal(
  (await db.query("select count(*)::int n from python_runs")).rows[0].n,
  1,
  "History follows current teacher",
);
await as(student);
assert.equal(
  (await db.query("select python_can_start($1) allowed", [activity])).rows[0]
    .allowed,
  false,
  "Old teacher lesson assignment cannot follow a transfer",
);
await db.exec(
  `reset role; update classes set teacher_id='${teacher}' where id=40;`,
);
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
  "python_activities",
  "python_grants",
  "python_drafts",
  "python_runs",
  "python_submissions",
  "python_reviews",
];
async function snapshot() {
  const data = {};
  for (const t of tables)
    data[t] = (
      await db.query(
        `select to_jsonb(t) r from ${t} t ${t === "profiles" ? "where role<>'admin'" : ""} order by to_jsonb(t)::text`,
      )
    ).rows.map((r) => {
      if (t === "profiles") delete r.r.updated_at;
      return r.r;
    });
  return data;
}
const backup = {
  format: "KnightCode Supabase school save",
  version: 3,
  created_at: new Date().toISOString(),
  tables: await snapshot(),
};
const mapping = Object.fromEntries(
  backup.tables.profiles.map((p) => [p.id, p.id]),
);
await assert.rejects(() =>
  db.query("select restore_school_backup($1,$2,$3)", [
    { ...backup, version: 2 },
    mapping,
    admin,
  ]),
);
assert.deepEqual(
  await snapshot(),
  backup.tables,
  "Rejected legacy restore changes nothing",
);
const broken = structuredClone(backup);
broken.tables.python_submissions[0].run_id =
  "10000000-0000-0000-0000-000000000099";
await assert.rejects(() =>
  db.query("select restore_school_backup($1,$2,$3)", [broken, mapping, admin]),
);
assert.deepEqual(
  await snapshot(),
  backup.tables,
  "Broken Python FK rolls back game AND Python records",
);
await db.query("select restore_school_backup($1,$2,$3)", [
  backup,
  mapping,
  admin,
]);
assert.deepEqual(
  await snapshot(),
  backup.tables,
  "Version 3 roundtrip preserves every table",
);
// Recreated student identity remaps all new relationships, without resetting existing Auth.
await db.exec(
  `delete from auth.users where id='${student}'; insert into auth.users values('${newStudent}','student@test.invalid','{"role":"student"}','replacement-hash');`,
);
const remapping = { ...mapping, [student]: newStudent };
await db.query("select restore_school_backup($1,$2,$3)", [
  backup,
  remapping,
  admin,
]);
for (const table of [
  "python_drafts",
  "python_runs",
  "python_submissions",
  "python_reviews",
])
  assert.equal(
    (await db.query(`select student_id from ${table}`)).rows[0].student_id,
    newStudent,
  );
await as(newStudent);
await db.query("select python_start_run($1,$2,$3)", [
  activity,
  "10000000-0000-0000-0000-000000000002",
  "print(2)",
]);
assert.equal(
  (await db.query("select count(distinct sequence)::int n from python_runs"))
    .rows[0].n,
  2,
  "Run sequence remains usable after restore",
);
console.log(
  "PASS Python role isolation, automatic lesson assignment/game gating, immutable/idempotent Runs, submission/review, transfer, revision snapshots, full restore rollback/roundtrip/UUID remapping.",
);

// Priority regression cases stay in this isolated in-memory database.
await db.exec("reset role");
await db.exec(readFileSync(new URL("../migrations/202610120001_priority_workflows.sql", import.meta.url), "utf8"));
await db.exec(`update student_level_progress set completed=false where student_id='${newStudent}';`);
await as(newStudent);
assert.equal((await db.query("select python_can_start($1) allowed", [activity])).rows[0].allowed, true, "Previously started Python remains accessible");
await db.exec(`reset role;
insert into lessons(id,title,order_number) values(11,'Coming soon lesson',2);
insert into levels(id,lesson_id,level_number,order_in_lesson,title) values(21,11,8,1,'Future');
insert into python_activities(lesson_id,content,published) select 11,content,true from python_activities limit 1;
insert into assignments(teacher_id,student_id,lesson_id,title) values('${teacher}','${newStudent}',11,'Future lesson');`);
const futureActivity=(await db.query("select id from python_activities where lesson_id=11")).rows[0].id;
await as(newStudent);
assert.equal((await db.query("select python_can_start($1) allowed", [futureActivity])).rows[0].allowed,true,"Zero available game levels must not lock Python");
await db.exec("reset role; update levels set build_available=true where id=21");
await as(newStudent);
assert.equal((await db.query("select python_can_start($1) allowed", [futureActivity])).rows[0].allowed,false,"Playable unfinished game still gates new Python work");
await db.exec(`reset role; insert into student_level_progress(student_id,level_id,completed) values('${newStudent}',21,true);
insert into levels(id,lesson_id,level_number,order_in_lesson,title) values(22,11,9,2,'Later future');`);
await as(newStudent);
assert.equal((await db.query("select python_can_start($1) allowed", [futureActivity])).rows[0].allowed,true,"Coming Soon levels are ignored alongside completed available levels");
await assert.rejects(()=>db.query("select capture_school_backup($1)",[admin]), /permission denied/);
await assert.rejects(()=>db.query("select clear_school_data($1,'learning')",[admin]), /permission denied/);
await db.exec("reset role");
const captured=(await db.query("select capture_school_backup($1) data",[admin])).rows[0].data;
assert.equal(captured.version,3);
assert.equal(Object.keys(captured.tables).length,22);
assert.ok(!captured.tables.profiles.some(p=>p.role==='admin'));
assert.equal(captured.tables.python_runs.length,2);
assert.equal(captured.tables.classes.length,1);
await assert.rejects(()=>db.query("select capture_school_backup($1)",[newStudent]),/Administrator required/);
// Older v3 saves receive the original build availability, not an all-false default.
const oldSave=structuredClone(captured);
for(const level of oldSave.tables.levels) delete level.build_available;
const ids=Object.fromEntries(captured.tables.profiles.map(p=>[p.id,p.id]));
await db.query("select restore_school_backup($1,$2,$3)",[oldSave,ids,admin]);
assert.equal((await db.query("select build_available from levels where id=20")).rows[0].build_available,true);
assert.equal((await db.query("select build_available from levels where id=21")).rows[0].build_available,false);
await db.exec(`update profiles set total_xp=500,current_streak=3,longest_streak=4,last_activity_date=current_date where id='${newStudent}';`);
const beforeClear=await snapshot();
// A failure near the end must undo every earlier delete and XP reset.
await db.exec(`create function fail_test_audit() returns trigger language plpgsql as $$ begin raise exception 'test audit failure'; end $$;
create trigger reject_test_clear before insert on admin_audit_log for each row execute function fail_test_audit();`);
await assert.rejects(()=>db.query("select clear_school_data($1,'learning')",[admin]),/test audit failure/);
assert.deepEqual(await snapshot(),beforeClear,"Clear failure rolls back every table and stats");
await db.exec("drop trigger reject_test_clear on admin_audit_log");
await db.exec("begin");
await db.query("select clear_school_data($1,'learning')",[admin]);
for(const t of ['python_runs','python_submissions','python_reviews','student_level_progress','student_level_sessions']) assert.equal((await db.query(`select count(*)::int n from ${t}`)).rows[0].n,0);
assert.equal((await db.query("select count(*)::int n from classes")).rows[0].n,1);
assert.equal((await db.query("select total_xp,current_streak,last_activity_date from profiles where id=$1",[newStudent])).rows[0].total_xp,0);
assert.equal((await db.query("select last_activity_date from profiles where id=$1",[newStudent])).rows[0].last_activity_date,null);
await db.exec("rollback; begin");
await db.query("select clear_school_data($1,'school')",[admin]);
assert.equal((await db.query("select count(*)::int n from classes")).rows[0].n,0);
assert.equal((await db.query("select count(*)::int n from profiles where role<>'admin'")).rows[0].n,0);
assert.equal((await db.query("select count(*)::int n from auth.users")).rows[0].n,1);
assert.equal((await db.query("select count(*)::int n from python_activities")).rows[0].n,2);
await db.exec("rollback");
assert.deepEqual(await snapshot(),beforeClear);
// Auth claims provided by a public signup cannot create staff roles.
await db.exec("alter table auth.users add column raw_app_meta_data jsonb default '{}'");
await db.exec(readFileSync(new URL("../migrations/202610120002_trusted_account_roles.sql",import.meta.url),"utf8"));
await db.exec(`insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values
('30000000-0000-0000-0000-000000000001','public@test.invalid','{"role":"admin"}','{}'),
('30000000-0000-0000-0000-000000000002','staff@test.invalid','{"role":"teacher"}','{"role":"teacher"}');`);
assert.equal((await db.query("select role from profiles where email='public@test.invalid'")).rows[0].role,'student');
assert.equal((await db.query("select role from profiles where email='staff@test.invalid'")).rows[0].role,'teacher');
console.log("PASS priority gates, prior-work access, RPC permissions, full snapshot, old-save compatibility, clear rollback/stats/admin preservation, trusted account roles.");

await db.exec(readFileSync(new URL("../migrations/202610120003_python_history_and_revision.sql",import.meta.url),"utf8"));
const rev=(await db.query("select revision from python_activities where id=$1",[activity])).rows[0].revision;
const nextRun='50000000-0000-0000-0000-000000000001';
await as(newStudent);
await assert.rejects(()=>db.query("select python_start_run_checked($1,$2,$3,$4)",[activity,nextRun,'print(7)',rev-1]),/activity was updated/);
assert.equal((await db.query("select count(*)::int n from python_runs where id=$1",[nextRun])).rows[0].n,0);
await db.query("select python_start_run_checked($1,$2,$3,$4)",[activity,nextRun,'print(7)',rev]);
await db.query("select python_start_run_checked($1,$2,$3,$4)",[activity,nextRun,'print(7)',rev]);
assert.equal((await db.query("select activity_snapshot from python_runs where id=$1",[nextRun])).rows[0].activity_snapshot.revision,rev);
await db.exec("reset role");
await db.query("update python_activities set published=false where id=$1",[activity]);
await as(newStudent);
assert.equal((await db.query("select count(*)::int n from python_activities where id=$1",[activity])).rows[0].n,1,"Owner sees unpublished history");
await assert.rejects(()=>db.query("select python_start_run_checked($1,$2,$3,$4)",[activity,'50000000-0000-0000-0000-000000000002','print(7)',rev+1]),/locked|not assigned|updated/);
await as('30000000-0000-0000-0000-000000000001');
assert.equal((await db.query("select count(*)::int n from python_activities where id=$1",[activity])).rows[0].n,0,"Other student cannot see unpublished activity");
await db.exec("reset role");
await db.query("insert into teacher_import_batches(teacher_id,class_id,result) select $1,id,$2 from classes limit 1",[teacher,{created:[{name:'Test',temp_password:'not-a-real-password',email_sent:true}],existing:[],errors:[]}]);
await db.exec(readFileSync(new URL("../migrations/202610120004_import_password_retention.sql",import.meta.url),"utf8"));
const redacted=(await db.query("select result from teacher_import_batches")).rows[0].result;
assert.equal(redacted.created[0].temp_password,undefined);
assert.equal(redacted.created[0].name,'Test');
assert.equal(redacted.created[0].email_sent,true);
await db.exec(readFileSync(new URL("../migrations/202610120005_backup_transfers.sql",import.meta.url),"utf8"));
const bucket=(await db.query("select * from storage.buckets where id='school-backup-transfers'")).rows[0];
assert.equal(bucket.public,false); assert.equal(Number(bucket.file_size_limit),33554432);
console.log("PASS stale revision rejection/no partial Run, matching revision/idempotency, private unpublished history, credential redaction, private backup bucket.");
// Lesson removal uses the same atomic lock as backup/restore; all tests are in memory.
await db.exec(readFileSync(new URL('../migrations/202610140001_lesson_management.sql',import.meta.url),'utf8'));
await db.exec('reset role');
await db.exec(`insert into lessons(id,title,order_number) values
 (800,'Unused example',800),(801,'Level owner',801),(802,'Assigned example',802),
 (803,'Python owner',803),(804,'Viewed example',804),(805,'Rollback example',805);
 insert into levels(id,lesson_id,level_number,order_in_lesson,title) values(801,801,801,1,'Protected level');
 insert into assignments(teacher_id,student_id,lesson_id,title) values('${teacher}','${newStudent}',802,'Protected assignment');
 insert into python_activities(lesson_id,content) values(803,'{}');
 insert into student_activity(student_id,action_type,metadata) values('${newStudent}','lesson_viewed','{"lesson_id":804}');`);
await as(newStudent);
await assert.rejects(()=>db.query('select delete_unused_lesson($1,$2)',[admin,800]),/permission denied/);
await db.exec('reset role; set role service_role');
await assert.rejects(()=>db.query('select delete_unused_lesson($1,$2)',[teacher,800]),/Administrator required/);
for(const id of [801,802,803,804]) {
 await assert.rejects(()=>db.query('select delete_unused_lesson($1,$2)',[admin,id]),/Archive it instead/);
}
await db.query('select delete_unused_lesson($1,$2)',[admin,800]);
await assert.rejects(()=>db.query('select delete_unused_lesson($1,$2)',[admin,800]),/Lesson not found/);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int n from lessons where id between 800 and 805')).rows[0].n,5);
assert.equal((await db.query("select count(*)::int n from admin_audit_log where entity='lessons' and action='delete' and record_id='800'")).rows[0].n,1);
assert.equal((await db.query('select count(*)::int n from levels where id=801')).rows[0].n,1);
assert.equal((await db.query('select count(*)::int n from assignments where lesson_id=802')).rows[0].n,1);
assert.equal((await db.query('select count(*)::int n from python_activities where lesson_id=803')).rows[0].n,1);
await db.exec(`create function test_reject_lesson_audit() returns trigger language plpgsql as $$ begin
 if new.entity='lessons' and new.record_id='805' then raise exception 'Test audit failure'; end if; return new; end $$;
 create trigger test_lesson_audit before insert on admin_audit_log for each row execute function test_reject_lesson_audit();`);
await assert.rejects(()=>db.query('select delete_unused_lesson($1,$2)',[admin,805]),/Test audit failure/);
assert.equal((await db.query('select count(*)::int n from lessons where id=805')).rows[0].n,1,'Failed audit rolls deletion back');
await db.exec('drop trigger test_lesson_audit on admin_audit_log; drop function test_reject_lesson_audit()');
console.log('PASS safe lesson deletion: unused only, role isolation, linked-level/assignment/Python/visit protection, atomic audit and rollback.');

await (await import("./priority-run-fixes.mjs")).checkPriorityRunFixes(db, { admin, teacher, student: newStudent, activity, as });
await (await import("./history-read-summaries.mjs")).checkHistorySummaries(db, { teacher, student: newStudent, as });
await (await import("./learning-streak.mjs")).checkLearningStreak(db, { admin, teacher, activity, as });
await (await import("./streak-run-and-daily-time.mjs")).checkStreakRunAndDailyTime(db, { admin, activity, as });
await db.close();

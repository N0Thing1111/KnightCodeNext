import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional first argument: a folder containing an isolated PGlite installation.
const requireTestPackage = createRequire(
  process.argv[2] ? resolve(process.argv[2], 'package.json') : import.meta.url,
);
const { PGlite } = requireTestPackage('@electric-sql/pglite');
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../', import.meta.url));
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text,owner_id text);
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`);
for(const file of ['202609270001_student_foundation.sql','202609270002_student_runtime_fixes.sql']) {
 await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8').replace('create extension if not exists pgcrypto;',''));
}
const teacher='00000000-0000-0000-0000-000000000001';
const student='00000000-0000-0000-0000-000000000002';
const historical='00000000-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users values ('${teacher}','teacher@test.invalid','{"role":"teacher"}'),('${student}','student@test.invalid','{}'),('${historical}','historical@test.invalid','{}');
insert into lessons(id,title,order_number) values(1,'Test lesson',1);
insert into levels(id,lesson_id,level_number,order_in_lesson,title) select n,1,n,n,'Test level '||n from generate_series(1,11) n;
insert into assignments(teacher_id,student_id,lesson_id,title) values('${teacher}','${student}',1,'Test assignment');
insert into achievements(id,name,description,requirement_type,requirement_value) values
(1,'First Steps','Complete a level','levels_completed',1),(2,'Rising Knight','Complete ten','levels_completed',10),
(3,'Code Champion','Complete all','full_course',1),(4,'On a Roll','Three days','streak',3),
(5,'Unstoppable','Seven days','streak',7),(6,'XP Hunter','1000 XP','xp',1000);
insert into student_level_progress(student_id,level_id,completed,xp_earned) values('${historical}',1,true,100);
update profiles set longest_streak=7 where id='${historical}';`);
const migration=fs.readFileSync(root+'/supabase/migrations/202610050001_achievement_awards.sql','utf8');
await db.exec(migration);
const ids=async who=>(await db.query('select achievement_id::int id from student_achievements where student_id=$1 order by achievement_id',[who])).rows.map(x=>x.id);
assert.deepEqual(await ids(historical),[1,4,5]);
assert.deepEqual(await ids(student),[]);
console.log('PASS: historical completion and longest-streak backfill; no unearned badges');
await db.exec(`select set_config('request.jwt.claim.sub','${student}',false);`);
const payload=(level,complete=true,run='achievement_test_run',seq=1)=>({run_id:run+level,sequence:seq,telemetry_version:2,attempts:1,mistakes:0,total_play_time_seconds:10,play_time_seconds:10,lines_used:2,completed_lines:2,completed:complete,scene_name:String(level),code_mode:'free'});
const save=async(level,p)=>(await db.query('select record_level_progress($1,$2::jsonb) result',[level,JSON.stringify(p)])).rows[0].result;
await save(1,payload(1,false)); assert.deepEqual(await ids(student),[]);
let result=await save(1,payload(1,true,'achievement_test_run',2));
assert.deepEqual(result.new_achievements.map(x=>x.id),[1]);
assert.deepEqual(await ids(student),[1]);
result=await save(1,payload(1,true,'achievement_test_run',2));
assert.equal(result.duplicate,true); assert.deepEqual(result.new_achievements,[]);
result=await save(1,payload(1,true,'achievement_replay_run'));
assert.deepEqual(result.new_achievements,[]); assert.equal(result.level.xp_earned,100);
console.log('PASS: incomplete run, first completion, duplicate telemetry, replay without extra badges or XP');
for(let n=2;n<=9;n++) await save(n,payload(n));
assert.deepEqual(await ids(student),[1]);
result=await save(10,payload(10)); assert.deepEqual(result.new_achievements.map(x=>x.id),[2,6]);
await db.exec('update levels set active=false where id=11');
assert.deepEqual((await db.query('select award_student_achievements($1) result',[student])).rows[0].result.map(x=>x.id),[3]);
assert.deepEqual(await ids(student),[1,2,3,6]);
await db.exec(`update profiles set current_streak=3,longest_streak=3 where id='${student}'; select award_student_achievements('${student}');`);
assert.deepEqual(await ids(student),[1,2,3,4,6]);
await db.exec(`update profiles set current_streak=7,longest_streak=7 where id='${student}'; select award_student_achievements('${student}');`);
assert.deepEqual(await ids(student),[1,2,3,4,5,6]);
await db.exec(migration);
assert.equal((await db.query('select count(*)::int n from student_notifications where student_id=$1',[student])).rows[0].n,6);
console.log('PASS: ten levels, XP threshold, active full course, three/seven-day streaks, idempotent migration and notifications');
await db.exec('update levels set active=false');
assert.deepEqual((await db.query('select award_student_achievements($1) result',[teacher])).rows[0].result,[]);
// Empty course must not award full-course achievement to a new student.
const empty='00000000-0000-0000-0000-000000000004';
await db.exec(`insert into auth.users values('${empty}','empty@test.invalid','{}'); select award_student_achievements('${empty}');`);
assert.deepEqual(await ids(empty),[]);
await db.exec(`update levels set active=true; select set_config('request.jwt.claim.sub','${empty}',false);`);
await assert.rejects(()=>save(1,payload(1)),/Level is not assigned/);
await db.exec(`select set_config('request.jwt.claim.sub','${student}',false); set role authenticated;`);
await assert.rejects(()=>db.query('select award_student_achievements($1)',[student]),/permission denied/);
result=await save(1,payload(1,true,'achievement_test_run',2)); assert.equal(result.duplicate,true);
await db.exec('reset role');
console.log('PASS: empty course, non-student exclusion, assignment validation, private helper permissions, authenticated progress RPC');
await db.close();

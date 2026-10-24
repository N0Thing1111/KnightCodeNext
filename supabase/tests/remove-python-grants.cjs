const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.KC_PGLITE_PATH || '@electric-sql/pglite');
(async () => {
 const db = new PGlite();
 const migration=fs.readFileSync(path.join(__dirname,'../migrations/20261024022719_remove_legacy_python_grants.sql'),'utf8');
 await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/python-grants-before.sql'),'utf8'));
 const admin='10000000-0000-4000-8000-000000000001', teacher='10000000-0000-4000-8000-000000000002', student='10000000-0000-4000-8000-000000000003';
 await db.exec(`INSERT INTO auth.users VALUES ('${admin}','admin@test.invalid'),('${teacher}','teacher@test.invalid'),('${student}','student@test.invalid');
 INSERT INTO profiles(id,name,email,role) VALUES ('${admin}','Admin','admin@test.invalid','admin'),('${teacher}','Teacher','teacher@test.invalid','teacher'),('${student}','Student','student@test.invalid','student');
 INSERT INTO lessons(id,title,order_number) OVERRIDING SYSTEM VALUE VALUES(1,'Fixture',1);
 INSERT INTO python_activities(id,lesson_id,content) VALUES ('20000000-0000-4000-8000-000000000001',1,'{}');
 INSERT INTO python_grants(activity_id,teacher_id,student_id) VALUES('20000000-0000-4000-8000-000000000001','${teacher}','${student}');`);
 await db.exec('BEGIN');
 await assert.rejects(db.exec(migration),/contain records/);
 await db.exec('ROLLBACK');
 await db.exec('DELETE FROM python_grants');
 await db.exec(`INSERT INTO levels(id,lesson_id,level_number,order_in_lesson,title,build_available) OVERRIDING SYSTEM VALUE VALUES(1,1,1,1,'Level',true);
 INSERT INTO student_level_progress(student_id,level_id,completed) VALUES('${student}',1,true);
 INSERT INTO assignments(teacher_id,student_id,lesson_id,title) VALUES('${teacher}','${student}',1,'Lesson assignment');
 INSERT INTO python_runs(id,activity_id,student_id,source,activity_snapshot) VALUES('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','${student}','print(1)','{}');
 INSERT INTO python_submissions(id,run_id,student_id,activity_id) VALUES('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','${student}','20000000-0000-4000-8000-000000000001');
 INSERT INTO python_reviews(submission_id,student_id,reviewer_id,reviewer_name,status,logic,application,correctness,feedback) VALUES('40000000-0000-4000-8000-000000000001','${student}','${teacher}','Teacher','needs_revision',2,2,2,'Preserve this feedback');`);
 const legacy=(await db.query('SELECT capture_school_backup($1) AS backup',[admin])).rows[0].backup;
 assert.equal(legacy.version,3); assert.ok('python_grants' in legacy.tables);
 await db.exec('BEGIN'); await db.exec(migration); await db.exec('COMMIT');
 assert.equal((await db.query("SELECT to_regclass('public.python_grants') AS name")).rows[0].name,null);
 assert.equal((await db.query("SELECT count(*)::int AS count FROM pg_proc WHERE proname='python_assign'")).rows[0].count,0);
 assert.equal((await db.query('SELECT school_restore_version() AS version')).rows[0].version,3);
 for(const role of ['anon','authenticated']) assert.equal((await db.query(`SELECT has_function_privilege('${role}','public.capture_school_backup(uuid)','EXECUTE') AS allowed`)).rows[0].allowed,false);
 const save=(await db.query('SELECT capture_school_backup($1) AS backup',[admin])).rows[0].backup;
 assert.equal(save.version,4); assert.ok(!('python_grants' in save.tables));
 const mapping=Object.fromEntries(save.tables.profiles.map(p=>[p.id,p.id]));
 // Retired rows in a legacy file must not be restored or validated as active links.
 legacy.tables.python_grants=[{id:'legacy',student_id:'retired-account'}];
 for (const backup of [legacy,save]) {
  const result=(await db.query('SELECT restore_school_backup($1,$2,$3) AS counts',[backup,mapping,admin])).rows[0].counts;
  assert.equal(result.profiles,2); assert.ok(!('python_grants' in result));
  const after=(await db.query('SELECT capture_school_backup($1) AS backup',[admin])).rows[0].backup;
  assert.deepEqual(after.tables,save.tables);
 }
 const malformed=structuredClone(save);delete malformed.tables.python_runs;
 await assert.rejects(db.query('SELECT restore_school_backup($1,$2,$3)',[malformed,mapping,admin]),/missing table python_runs/);
 await assert.rejects(db.query('SELECT capture_school_backup($1)',[student]),/Administrator required/);
 await assert.rejects(db.query('SELECT assert_teacher_deletable($1,$2)',[admin,teacher]),/linked records/);
 // Keep real linkage protection after removing the retired check.
 await db.exec(`INSERT INTO classes(teacher_id,name,section) VALUES('${teacher}','Fixture','A')`);
 await assert.rejects(db.query('SELECT assert_teacher_deletable($1,$2)',[admin,teacher]),/linked records/);
 await db.query('SELECT clear_school_data($1,$2)',[admin,'learning']);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM lessons')).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM profiles')).rows[0].n,3);
 await db.query('SELECT clear_school_data($1,$2)',[admin,'school']);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM profiles')).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM lessons')).rows[0].n,1);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND p.prosrc ILIKE '%python_grants%'")).rows[0].n,0);
 await db.close(); console.log('PASS: migration guard, table/function removal, v3/v4 restore, capture, permissions, deletion protections, both clear scopes. Local fixtures only.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});

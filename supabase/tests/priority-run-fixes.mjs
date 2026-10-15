import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
export async function checkPriorityRunFixes(db, {admin, teacher, student, activity, as}) {
 await db.exec("reset role");
 for (const name of ["202610150001_run_history_cleanup.sql", "202610150002_priority_run_fixes.sql", "202610150002_priority_run_fixes.sql"])
  await db.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
 const runId="priority_game_000000001";
 const payload={telemetry_version:2,run_id:runId,sequence:1,scene_name:"1",completed:false,
  attempts:101,mistakes:1001,play_time_seconds:86401,total_play_time_seconds:86401,lines_used:10001,completed_lines:0,code_mode:"free"};
 await as(student);
 await db.query("select record_level_progress(20,$1)",[payload]);
 await db.query("select record_code_execution(20,$1)",[{run_id:runId,scene_name:"1",execution_number:1,restart_number:101,source:"move(right)",source_truncated:false,status:"finished",warning:"",code_mode:"free",start_x:0,start_y:0,end_x:1,end_y:0,elapsed_ms:1}]);
 await db.query("select record_level_progress(20,$1)",[{...payload,sequence:2,completed:true,completed_lines:1}]);
 await db.exec("reset role");
 const total=async()=>Number((await db.query("select coalesce((select sum(history_unsuccessful_attempts) from student_level_progress where student_id=$1),0)+coalesce((select sum(greatest(attempts-1,0)) from student_level_sessions where student_id=$1),0) n",[student])).rows[0].n);
 const before=await total();
 const statsBefore=(await db.query("select completed,attempts,mistakes,xp_earned from student_level_progress where student_id=$1 and level_id=20",[student])).rows[0];
 await db.query("update student_level_sessions set started_at=now()-interval '4 days',completed_at=now()-interval '4 days' where run_id=$1",[runId]);
 await db.query("update student_telemetry_runs set updated_at=now()-interval '4 days' where run_id=$1",[runId]);
 await db.query("update student_code_executions set started_at=now()-interval '4 days',finished_at=now()-interval '4 days' where run_id=$1",[runId]);
 const cutoff=new Date(Date.now()-2*86400000).toISOString();
 const preview=async kind=>(await db.query("select manage_run_history($1,$2,$3,$4) data",[admin,kind,cutoff,student])).rows[0].data;
 const execute=async(kind,p)=>db.query("select manage_run_history($1,$2,$3,$4,null,true,$5)",[admin,kind,cutoff,student,p.fingerprint]);
 const game=await preview("game_all");assert.equal(game.count,1);
 await execute("game_all",game);
 assert.equal(await total(),before,"Cleanup preserves earlier-attempt assessment");
 assert.deepEqual((await db.query("select completed,attempts,mistakes,xp_earned from student_level_progress where student_id=$1 and level_id=20",[student])).rows[0],statsBefore);
 await assert.rejects(()=>execute("game_all",game),/changed|No matching/);
 assert.equal(await total(),before,"Rejected repeat cleanup cannot add preserved counts twice");
 await as(student);
 await db.query("select record_level_progress(20,$1)",[{...payload,sequence:2,completed:true,completed_lines:1}]);
 await db.query("select record_level_progress(20,$1)",[{...payload,sequence:3,attempts:102}]);
 await db.exec("reset role");
 assert.equal((await db.query("select attempts from student_level_sessions where run_id=$1",[runId])).rows[0].attempts,1,"Resumed run starts from retained baseline");
 assert.equal(await total(),before,"Resume after cleanup does not recount old failures");
 // Synthetic old Runs: stale, live heartbeat, finished, submitted, and normal exit.
 await db.query("update python_activities set published=true where id=$1",[activity]);
 const ids=Array.from({length:5},(_,i)=>`60000000-0000-0000-0000-00000000000${i+1}`);
 for(const id of ids) await db.query(`insert into python_runs(id,student_id,activity_id,source,activity_snapshot,started_at,last_seen_at)
 select $1,$2,id,'print(1)',jsonb_build_object('revision',revision,'content',content),now()-interval '4 days',now()-interval '4 days' from python_activities where id=$3`,[id,student,activity]);
 await as(student);
 await db.query("select python_touch_run($1)",[ids[1]]);
 await db.query("select python_abandon_run($1)",[ids[4]]);
 const finished={output:"1",error:"",inputs:[],checks:[],elapsed_ms:1};
 for(const id of [ids[2],ids[3]]) await db.query("select python_finish_run($1,'finished',$2)",[id,finished]);
 await db.query("select python_submit($1)",[ids[3]]);
 await db.query("select python_abandon_run($1)",[ids[3]]);
 await db.exec("reset role");
 assert.equal((await db.query("select status from python_runs where id=$1",[ids[3]])).rows[0].status,"finished","Late exit cannot overwrite a finished/submitted Run");
 assert.equal((await db.query("select status from python_runs where id=$1",[ids[4]])).rows[0].status,"stopped");
 await as(teacher);await assert.rejects(()=>db.query("select python_touch_run($1)",[ids[0]]),/Student required/);
 await as("30000000-0000-0000-0000-000000000001");await db.query("select python_touch_run($1)",[ids[0]]);await db.query("select python_abandon_run($1)",[ids[0]]);
 await db.exec("reset role");
 assert.equal((await db.query("select status from python_runs where id=$1",[ids[0]])).rows[0].status,"running","Other student cannot abandon this Run");
 const old=await preview("python_practice");assert.equal(old.count,1);assert.equal(old.sample[0].id,ids[0]);
 // A heartbeat after preview invalidates its deletion, even with the same filters.
 await as(student);await db.query("select python_touch_run($1)",[ids[0]]);await db.exec("reset role");
 await assert.rejects(()=>execute("python_practice",old),/changed/);
 await db.query("update python_runs set last_seen_at=now()-interval '4 days' where id=$1",[ids[0]]);
 await execute("python_practice",await preview("python_practice"));
 assert.equal((await db.query("select count(*)::int n from python_runs where id=any($1::uuid[])",[ids])).rows[0].n,4,"Only abandoned unsubmitted Run removed");
 // New backup metadata survives atomic capture/restore; old v3 files still load.
 const capture=(await db.query("select capture_school_backup($1) data",[admin])).rows[0].data;
 const mapping=Object.fromEntries(capture.tables.profiles.map(p=>[p.id,p.id]));
 await db.query("select restore_school_backup($1,$2,$3)",[capture,mapping,admin]);
 assert.equal(await total(),before,"Restored backup preserves assessment summary");
 const oldSave=structuredClone(capture);
 for(const p of oldSave.tables.student_level_progress) delete p.history_unsuccessful_attempts;
 for(const run of oldSave.tables.python_runs) delete run.last_seen_at;
 await db.query("select restore_school_backup($1,$2,$3)",[oldSave,mapping,admin]);
 assert.equal((await db.query("select history_unsuccessful_attempts from student_level_progress where student_id=$1 and level_id=20",[student])).rows[0].history_unsuccessful_attempts,0,"Older v3 saves use summary default");
 console.log("PASS priority SQL: long-session progress/executions, cleanup assessment preservation, repeat safety, resume baseline, heartbeat ownership, exit races, stale-only cleanup, preview race, new/old v3 restore.");
}

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const require=createRequire(import.meta.url), ts=require("typescript");
const tableNames=["profiles","lessons","levels","classes","class_students","assignments","student_level_progress","student_activity","achievements","student_achievements","student_notifications","student_telemetry_runs","student_level_sessions","student_code_executions","announcements","teacher_notifications"];
let rows=[], created=[], calls=[], rpcFailure=false, version=1;
const fakeDb={
 from(){const q={select(){return q},order(){return q},async range(a,b){return {data:rows.slice(a,b+1),error:null}}};return q;},
 rpc:async(name,p)=>{calls.push({name,p}); if(name==="school_restore_version")return {data:version,error:null};
 return rpcFailure?{error:{message:"foreign key violation"},data:null}:{data:Object.fromEntries(tableNames.map(t=>[t,p.p_backup.tables[t].length])),error:null};},
 auth:{admin:{createUser:async(p)=>{created.push(p);return {data:{user:{id:"new-auth-id"}},error:null};},deleteUser(){throw Error("Must never delete accounts")},updateUserById(){throw Error("Must never reset existing passwords")}}}
};
const source=readFileSync(new URL("../../src/lib/admin-restore.ts",import.meta.url),"utf8");
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,require(name){if(name==="server-only")return {};if(name==="@/lib/admin-backup")return {BACKUP_TABLES:tableNames};if(name==="@/lib/supabase/admin")return {createAdminClient:()=>fakeDb};return require(name);}
});
const {restoreSchoolBackup}=exports;
const backup={format:"KnightCode Supabase school save",version:2,tables:Object.fromEntries(tableNames.map(t=>[t,[]]))};
backup.tables.profiles=[{id:"old-teacher",email:"teacher@test.invalid",role:"teacher"},{id:"old-student",email:"student@test.invalid",role:"student"}];
backup.tables.lessons=[{id:1}];backup.tables.levels=[{id:1,lesson_id:1}];
backup.tables.classes=[{id:1,teacher_id:"old-teacher"}];
backup.tables.assignments=[{id:1,teacher_id:"old-teacher",student_id:"old-student",class_id:null,lesson_id:1,level_id:null}];
backup.tables.student_level_sessions=[{id:1,student_id:"old-student",level_id:1}];
rows=Array.from({length:1001},(_,i)=>({id:"extra"+i,email:"extra"+i+"@test.invalid",role:"student"}));
rows.push({id:"current-teacher",email:"teacher@test.invalid",role:"teacher"},{id:"current-student",email:"student@test.invalid",role:"student"});
let result=await restoreSchoolBackup(backup,"admin");
assert.equal(created.length,0);assert.equal(result.counts.assignments,1);
assert.equal(calls.at(-1).p.p_user_map["old-teacher"],"current-teacher");
assert.equal(calls.at(-1).p.p_user_map["old-student"],"current-student");
const bad=structuredClone(backup);bad.tables.classes[0].teacher_id="absent";
calls=[];await assert.rejects(()=>restoreSchoolBackup(bad,"admin"),/Broken/);assert.equal(calls.length,0);
version=0;await assert.rejects(()=>restoreSchoolBackup(backup,"admin"),/migration/);assert.equal(created.length,0);version=1;
rows=rows.filter(p=>p.email!=="student@test.invalid");
result=await restoreSchoolBackup(backup,"admin");
assert.equal(created.length,1);assert.equal(result.credentials.length,1);assert.equal(calls.at(-1).p.p_user_map["old-student"],"new-auth-id");
rpcFailure=true;
await assert.rejects(()=>restoreSchoolBackup(backup,"admin"),/not confirmed/);
console.log("PASS: paginated account matching after UUID changes, no existing password resets/deletions, nullable links, missing-account credentials, preflight migration check, invalid backup rejection, and failure reporting.");


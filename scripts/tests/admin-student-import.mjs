// Offline regression checks. No real accounts, mail, or Supabase requests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const require=createRequire(import.meta.url), ts=require('typescript');
function load(file,mocks={}) {
  const exports={};
  const source=ts.transpileModule(readFileSync(new URL('../../src/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,console,FormData,crypto:webcrypto,require:name=>name in mocks?mocks[name]:require(name)});
  return exports;
}
const utils=load('lib/import-utils.ts');
const helper=load('lib/admin-student-import.ts',{'@/lib/import-utils':utils});
const csv='\uFEFFstudent_id,name,email,username,section\r\nS_01,"Doe, Jane",JANE@example.com,jane,ICT-A\r\n';
const rows=helper.parseStudentCsv(csv);
assert.equal(rows[0].name,'Doe, Jane'); assert.equal(rows[0].email,'jane@example.com');
assert.equal(helper.studentImportIssues(rows,{name:'ICT-A',label:'ICT-A'})[0].length,0);
assert.ok(helper.studentImportIssues(rows,{name:'ICT-B',label:'ICT-B'})[0].length);
assert.ok(helper.studentImportIssues([...rows,{...rows[0],email:'different@example.com'}])[1].length,'Duplicate ID with another email is invalid');
assert.throws(()=>helper.parseStudentCsv('name,email\nJane,jane@example.com'),/headers/);
assert.throws(()=>helper.parseStudentCsv('student_id,name,email\n1,"bad,email'),/not closed/);
assert.throws(()=>helper.parseStudentCsv('student_id,name,email\n1,Name,a@example.com,extra'),/columns/);

let authorized, sectionActive, teacherActive, profiles, membershipFailure, createFailure, updateFailure, emailFailure, auditFailure;
let dbCalls, created, deleted, enrolled, mailed, updates, audit;
const actor={id:'admin-id'};
function reset() {
  authorized=true; sectionActive=true; teacherActive=true;profiles=[];membershipFailure=false;createFailure=false;updateFailure=false;emailFailure=false;auditFailure=false;
  dbCalls=0;created=[];deleted=[];enrolled=[];mailed=[];updates=[];audit=[];
}
function match(value,pattern){return String(value??'').toLowerCase()===pattern.replace(/\\([\\%_])/g,'$1').toLowerCase();}
const client={
  // Deliberately exposes no signIn, signUp, signOut or session cookie APIs.
  auth:{admin:{
    createUser:async data=>{created.push(data);return createFailure?{error:{message:'Creation failed'},data:{user:null}}:{error:null,data:{user:{id:'new-id'}}};},
    deleteUser:async id=>{deleted.push(id);return {error:null};},
  }},
  from(table) {
    let filters=[],method='read',payload;
    const q={
      select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},
      ilike:(key,value)=>{filters.push([key,value,true]);return q;},
      update:data=>{method='update';payload=data;return q;},insert:data=>{method='insert';payload=data;return q;},
      maybeSingle:async()=>execute(),single:async()=>execute(),then:resolve=>Promise.resolve(execute()).then(resolve),
    };
    function execute() {
      if(table==='classes')return {data:sectionActive?{id:1,name:'ICT-A',section:null,teacher_id:'teacher-id'}:null,error:null};
      if(table==='admin_audit_log'){audit.push(payload);return {error:auditFailure?{message:'Audit failed'}:null};}
      assert.equal(table,'profiles');
      if(method==='update'){updates.push(payload);return {data:{id:'new-id'},error:updateFailure?{message:'Update failed'}:null};}
      if(filters.some(([key,value])=>key==='id'&&value==='teacher-id'))return {data:teacherActive?{id:'teacher-id',school_code:'SCHOOL'}:null,error:null};
      const data=profiles.find(row=>filters.every(([key,value,pattern])=>pattern?match(row[key],value):row[key]===value));
      return {data:data||null,error:null};
    }
    return q;
  },
};
const action=load('app/actions/admin-student-import.ts',{
  'next/cache':{revalidatePath(){}},
  '@/lib/auth':{requireAdmin:async()=>{if(!authorized)throw Error('ADMIN_REQUIRED');return actor;}},
  '@/lib/supabase/admin':{createAdminClient:()=>{dbCalls++;return client;}},
  '@/lib/import-utils':utils,'@/lib/admin-student-import':helper,
  '@/lib/section-label':{sectionLabel:section=>section.name},
  '@/lib/sections':{requireSectionMembership:async()=>{},setStudentSection:async(...args)=>{enrolled.push(args);if(membershipFailure)throw Error('Student already belongs to a section');}},
  '@/lib/mail':{sendStudentPasswordEmail:async data=>{mailed.push(data);if(emailFailure)throw Error('Mail offline');return true;}},
});
function form(data=rows,section=1){const f=new FormData();f.set('rows',JSON.stringify(data));f.set('class_id',String(section));return f;}
const run=(data=rows,section=1)=>action.importAdminStudents({},form(data,section));
reset();authorized=false;await assert.rejects(run,/ADMIN_REQUIRED/);assert.equal(dbCalls,0);
for(const invalid of [[],Array(101).fill(rows[0]),[null]]){reset();assert.ok((await run(invalid)).error);assert.equal(created.length,0);}
reset();assert.ok((await run(rows,0)).error);assert.equal(dbCalls,0);
reset();sectionActive=false;assert.ok((await run()).error);assert.equal(created.length,0);
reset();teacherActive=false;assert.ok((await run()).error);assert.equal(created.length,0);
reset();assert.ok((await run([{...rows[0],section:'ICT-B'}])).error);assert.equal(created.length,0);
reset();
let result=await run();
assert.equal(result.result.created.length,1);assert.equal(created[0].app_metadata.role,'student');
assert.equal(updates[0].must_change_password,true);
assert.deepEqual(enrolled,[['new-id',1,'admin-id',false]]);
assert.equal(mailed[0].temporaryPassword,result.result.created[0].temp_password);
assert.ok(!JSON.stringify(audit).includes(result.result.created[0].temp_password),'Audit must never store passwords');
const existing={id:'old-id',role:'student',active:true,student_id:'S_01',email:'jane@example.com'};
reset();profiles=[existing];result=await run();
assert.equal(result.result.existing.length,1);assert.equal(created.length,0);assert.equal(mailed.length,0);assert.equal(updates.length,0);
reset();profiles=[existing];membershipFailure=true;result=await run();
assert.equal(result.result.errors.length,1);assert.equal(deleted.length,0,'Existing student is never deleted');
for(const bad of [{...existing,role:'teacher'},{...existing,active:false},{...existing,student_id:'OTHER'},{...existing,email:'other@example.com'}]){
  reset();profiles=[bad];result=await run();assert.equal(result.result.errors.length,1);assert.equal(created.length,0);assert.equal(enrolled.length,0);
}
reset();updateFailure=true;result=await run();assert.deepEqual(deleted,['new-id']);assert.equal(mailed.length,0);assert.equal(result.result.errors.length,1);
reset();membershipFailure=true;result=await run();assert.deepEqual(deleted,['new-id']);assert.equal(mailed.length,0);
reset();createFailure=true;result=await run();assert.equal(result.result.errors.length,1);assert.equal(deleted.length,0);
reset();emailFailure=true;result=await run();assert.equal(result.result.created.length,1);assert.equal(result.result.created[0].email_sent,false);assert.equal(deleted.length,0);
reset();auditFailure=true;result=await run();assert.ok(result.error);assert.equal(result.result.created.length,1,'Keep credential result when auditing fails');
console.log('PASS admin-only import: CSV parsing, preview validation, session-safe account API, section guards, identity conflicts, password preservation, cleanup, email failure and safe audit results.');

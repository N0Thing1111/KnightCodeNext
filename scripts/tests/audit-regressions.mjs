import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,mocks={}) {
 const exports={};
 const js=ts.transpileModule(readFileSync(new URL('../../src/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{exports,Buffer,File,FormData,crypto:webcrypto,URL,console,process,require:n=>n in mocks?mocks[n]:n==='server-only'?{}:require(n)});
 return exports;
}
const rules=load('lib/backup-transfer-rules.ts');
const owner='00000000-0000-0000-0000-000000000001',now=Date.now();
const filename=t=>t+'-00000000-0000-0000-0000-000000000002.knightsave';
const good=owner+'/'+filename(now);
assert.equal(rules.validateTransferPath(good,owner,now),good);
for(const bad of ['someone/'+filename(now),owner+'/../file',owner+'/'+filename(now-3*3600000),owner+'/'+filename(now+3600000)]) assert.throws(()=>rules.validateTransferPath(bad,owner,now));
const assessment=load('lib/student-assessment.ts');
assert.equal(assessment.sessionAssessment(Array.from({length:10},()=>({attempts:1,completed:true}))).unsuccessful,0,'Successful replays are not failures');
assert.equal(assessment.sessionAssessment([{attempts:1,completed:false}]).unsuccessful,0,'Unfinished first attempt is not a failure');
assert.equal(assessment.sessionAssessment([{attempts:3,completed:true},{attempts:2,completed:false}]).unsuccessful,3);
assert.equal(assessment.latestActivity(['2026-09-01',null,'bad','2026-10-12','2026-09-30']),'2026-10-12');
const {allRows,rowsForIds}=load('lib/query-pages.ts');
const source=Array.from({length:1234},(_,i)=>i);let requests=0;
const result=await allRows(()=>({range:async(a,b)=>{requests++;return {data:source.slice(a,b+1)};}}));
assert.equal(result.length,1234);assert.equal(result[1233],1233);assert.equal(requests,3);
await assert.rejects(()=>allRows(()=>({range:async()=>({error:{message:'database down'}})})),/database down/);
let chunks=0;
assert.equal((await rowsForIds(source,ids=>({range:async(a,b)=>{chunks++;assert.ok(ids.length<=100);return {data:ids.slice(a,b+1)};}}))).length,1234);
assert.equal(chunks,13);
const removed=[];const files=Array.from({length:105},(_,i)=>({name:filename(now-3*3600000-i)})); files.push({name:filename(now)});
let bucketPublic=false,downloadSize=20;
const storage={list:async(_id,o)=>({data:files.slice(o.offset,o.offset+o.limit)}),remove:async p=>{removed.push(...p);return{};},download:async()=>({data:{size:downloadSize,arrayBuffer:async()=>new Uint8Array(20).buffer}})};
const transfer=load('lib/backup-transfer.ts',{'@/lib/backup-transfer-rules':rules,'@/lib/supabase/admin':{createAdminClient:()=>({storage:{getBucket:async()=>({data:{public:bucketPublic,file_size_limit:rules.MAX_BACKUP_BYTES}}),from:()=>storage}})}});
const fresh=await transfer.prepareTransfer(owner);
assert.equal(removed.length,105);assert.ok(!removed.includes(good));rules.validateTransferPath(fresh,owner);
bucketPublic=true;await assert.rejects(()=>transfer.prepareTransfer(owner),/private/);bucketPublic=false;
await assert.rejects(()=>transfer.readTransfer('other/'+filename(now),owner),/Invalid/);
assert.equal((await transfer.readTransfer(good,owner)).length,20);
downloadSize=rules.MAX_BACKUP_BYTES+1;await assert.rejects(()=>transfer.readTransfer(good,owner),/32 MB/);
// Failed photo/password/profile saves must never remove the previous photo.
for(const scenario of ['short-password','bad-password','profile-failure','success']) {
 const events=[];
 const client={storage:{from:()=>({upload:async p=>{events.push(['upload',p]);return{};},remove:async p=>{events.push(['remove',p[0]]);return{};}})},auth:{signInWithPassword:async()=>({error:scenario==='bad-password'?{message:'bad'}:null}),updateUser:async()=>({})},from:()=>({update:()=>({eq:async()=>{events.push(['save']);return {error:scenario==='profile-failure'?{message:'save failed'}:null};}})})};
 const profile=load('app/actions/profile.ts',{'next/cache':{revalidatePath:()=>{}},'@/lib/auth':{requireStudent:async()=>({id:owner,email:'test@example.invalid',profile_image:'old-photo.png'})},'@/lib/supabase/server':{createClient:async()=>client}});
 const form=new FormData();for(const [k,v] of Object.entries({name:'Test',email:'test@example.invalid',avatar_key:'knight',theme_preference:'dark',new_password:scenario==='short-password'?'short':scenario==='bad-password'?'long-password':'',current_password:'test'}))form.set(k,v);
 form.set('profile_image',new File(['test'],'new.png',{type:'image/png'}));
 const response=await profile.updateProfile({},form);
 if(scenario==='success') {assert.ok(response.success);assert.ok(events.findIndex(e=>e[0]==='save')<events.findIndex(e=>e[0]==='remove'&&e[1]==='old-photo.png'));}
 else {assert.ok(response.error);assert.ok(!events.some(e=>e[0]==='remove'&&e[1]==='old-photo.png')); if(scenario==='short-password')assert.equal(events.length,0);else assert.ok(events.some(e=>e[0]==='remove'&&e[1]!=='old-photo.png'));}
}
console.log('PASS replay assessment, last activity, >1000-row pagination/error handling, private/owned/expired/oversize backup transfers, complete paginated cleanup, avatar preservation and failed-upload cleanup.');
// These mail/account tests use stubs only. They never contact SMTP or Supabase.
let notices=[],resetCalls=0,currentProfile={name:'Test teacher',email:'teacher@example.invalid',teacher_id:'T-1',school_code:'TEST'},roleFilter='';
const fakeDb={from:()=>({select:()=>({eq(k,v){if(k==='role')roleFilter=v;return this;},maybeSingle:async()=>({data:currentProfile})}),insert:async()=>({})}),auth:{admin:{updateUserById:async()=>{resetCalls++;return{};}}}};
const adminActions=load('app/actions/admin.ts',{
 'next/headers':{cookies:async()=>({set:()=>{}})},'next/navigation':{redirect:url=>{throw Error('REDIRECT '+url);}},'next/cache':{revalidatePath:()=>{}},
 '@/lib/auth':{requireAdmin:async()=>({id:owner})},'@/lib/supabase/admin':{createAdminClient:()=>fakeDb},'@/lib/supabase/server':{},
 '@/lib/mail':{sendTeacherPasswordEmail:async data=>{notices.push(data);return true;},sendStudentPasswordEmail:async()=>{throw Error('Wrong recipient type');}},'@/lib/sections':{}
});
const resetForm=new FormData();resetForm.set('entity','teachers');resetForm.set('id','test-teacher');
await assert.rejects(()=>adminActions.resetManagedPassword(resetForm),/REDIRECT.*notice/);
assert.equal(resetCalls,1);assert.equal(notices.length,1);assert.equal(roleFilter,'teacher');assert.equal(notices[0].reason,'reset');
currentProfile=null;await assert.rejects(()=>adminActions.resetManagedPassword(resetForm),/REDIRECT.*error/);assert.equal(resetCalls,1,'Wrong role/missing profile cannot reset an account');
// Immediate credentials survive email failure; persistent import history contains no password.
let persisted,createdPassword;
const batch={class_id:1,rows:[{student_id:'TEST-1',name:'Test student',email:'student@example.invalid',username:''}],result:null};
const importDb={from:table=>{
 const q={select:()=>q,eq:()=>q,gt:()=>q,or:()=>q,limit:()=>q,maybeSingle:async()=>({data:table==='teacher_import_batches'?batch:table==='classes'?{id:1}:null}),update:values=>{if(table==='teacher_import_batches')persisted=values;return {eq:()=>({eq:async()=>({}),then:resolve=>resolve({})})};},upsert:async()=>({})};return q;
},auth:{admin:{createUser:async d=>{createdPassword=d.password;return {data:{user:{id:'test-student'}}};},deleteUser:async()=>{throw Error('Unexpected deletion');}}}};
const imports=load('app/actions/teacher-import.ts',{'next/navigation':{redirect:url=>{throw Error('REDIRECT '+url);}},'next/cache':{revalidatePath:()=>{}},'@/lib/auth':{requireTeacher:async()=>({id:owner,school_code:'TEST'})},'@/lib/supabase/admin':{createAdminClient:()=>importDb},'@/lib/mail':{sendStudentPasswordEmail:async()=>false},'@/lib/sections':{requireSectionMembership:async()=>{},setStudentSection:async()=>{}}});
const importForm=new FormData();importForm.set('batch_id','test-batch');
const imported=await imports.confirmImport({},importForm);
assert.equal(imported.result.created[0].temp_password,createdPassword);assert.equal(imported.result.created[0].email_sent,false);
assert.equal(persisted.result.created[0].temp_password,undefined);assert.ok(!JSON.stringify(persisted).includes(createdPassword));
console.log('PASS administrator teacher-reset email/role guard and one-time import credentials without persisted passwords (including failed email).');

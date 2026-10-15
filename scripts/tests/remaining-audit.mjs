import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,mocks={}) {const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../../src/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,Date,FormData,crypto:webcrypto,process,console,require:n=>n in mocks?mocks[n]:n==='server-only'?{}:require(n)});return exports;}
const game={isGameLevelAvailable:l=>l.build_available};const completion=load('lib/lesson-completion.ts',{'@/lib/game-build':game});const assessment=load('lib/student-assessment.ts');
const queries=[];const db={from:table=>{const record={table};queries.push(record);const q={select:(...args)=>{record.select=args;return q},eq:()=>q,order:()=>q,gte:(...v)=>{record.gte=v;return q},lt:(...v)=>{record.lt=v;return q},in:()=>q,limit:n=>{record.limit=n;return q},maybeSingle:async()=>({data:{setting_value:"Test"},error:null}),range:async()=>({data:[],error:null}),then:f=>Promise.resolve({data:[],count:7,error:null}).then(f)};return q;},rpc:async ()=>({data:{recent:[],latest:[],sessions:[],days:[]},error:null})};
const pages=load('lib/query-pages.ts');const week=load('lib/activity-week.ts');
const teacher=load('lib/teacher-data.ts',{'react':{cache:f=>f},'@/lib/query-pages':pages,'@/lib/student-assessment':assessment,'@/lib/section-label':{sectionLabel:c=>c.name},'@/lib/python-data':{getPythonCompletion:async()=>({activities:[],submissions:[]})},'@/lib/lesson-completion':completion,'@/lib/game-build':game,'@/lib/supabase/admin':{createAdminClient:()=>db},'@/lib/teacher-avatar':{}});
const ctx={classes:[{id:1}],memberships:[{class_id:1,student_id:'s'}],students:[{id:'s'}],lessons:[{id:1,active:true},{id:2,active:false}],levels:[{id:1,lesson_id:1,build_available:true},{id:2,lesson_id:1,build_available:false},{id:3,lesson_id:2,build_available:true}],assignments:[{student_id:'s',lesson_id:1},{student_id:'s',lesson_id:2}],progress:[{student_id:'s',level_id:1,completed:true,attempts:6,history_unsuccessful_attempts:4}],activity:[],pythonRuns:[],sessions:[{student_id:'s',level_id:1,attempts:3,completed:true}],python:{activities:[{id:'a',lesson_id:1,published:true}],submissions:[]}};
assert.deepEqual([...teacher.assignedLevelIds(ctx,'s')],[1]);
assert.equal(teacher.teacherStudents(ctx)[0].progress_pct,50,'Game complete plus Python pending = 50%');
assert.equal(teacher.teacherStudents(ctx)[0].failed_attempts,6);
ctx.sessionSummaries=[{student_id:'s',level_id:1,unsuccessful:2}];ctx.sessions=[];assert.equal(teacher.teacherStudents(ctx)[0].failed_attempts,6,'Summary preserves cleanup counts');
ctx.python.submissions=[{student_id:'s',activity_id:'a'}];assert.equal(teacher.teacherStudents(ctx)[0].progress_pct,100);
assert.equal(teacher.assignmentCounts(ctx,{student_id:'s',lesson_id:2}).done,0,'Archived assignments cannot be completed');
ctx.assignments=[{student_id:'s',level_id:1,lesson_id:1}];ctx.python.submissions=[];assert.equal(teacher.teacherStudents(ctx)[0].progress_pct,100,'Direct game assignment does not require Python');
ctx.assignments=[{student_id:'s',lesson_id:1}];ctx.levels[0].build_available=false;assert.equal(teacher.teacherStudents(ctx)[0].total_levels,0);assert.equal(teacher.teacherStudents(ctx)[0].progress_pct,0,'Python-only lesson remains pending');
const mixed=completion.summarizeCompletion([{gamesTotal:1,gamesDone:1,pythonRequired:true,pythonDone:false}]);assert.equal(mixed.overallPct,50);
assert.equal(week.activityWeek(Date.parse('2026-10-15T16:01:00Z')).at(-1).key,'2026-10-16');
await teacher.getTeacherContext('t');assert.ok(!queries.some(q=>['student_activity','student_level_sessions','python_runs','student_achievements'].includes(q.table)),'Normal teacher pages never load full history');
queries.length=0;const admin=load('lib/admin-data.ts',{'react':{cache:f=>f},'@/lib/query-pages':pages,'@/lib/activity-week':week,'@/lib/supabase/admin':{createAdminClient:()=>db}});await admin.getAdminContext();assert.ok(!queries.some(q=>/activity|sessions|telemetry|audit_log/.test(q.table)));
queries.length=0;await admin.getAdminSessionOverview();assert.equal(queries.filter(q=>q.limit===5).length,1);assert.equal(queries.filter(q=>q.select?.[1]?.head).length,7);
class Redirect extends Error {};
async function accountScenario(kind,{existing=false,profileFails=false,sectionFails=false,cleanupFails=false}={}) {
 const removed=[],emails=[];let created=0;
 const client={auth:{admin:{createUser:async()=>{created++;return {data:{user:{id:'new-account'}},error:null}},deleteUser:async id=>{removed.push(id);return {error:cleanupFails?{message:'offline'}:null}},updateUserById:async()=>({error:null})}},from:table=>{let update=false;const q={select:()=>q,update:()=>{update=true;return q},insert:()=>q,eq:()=>q,neq:()=>q,ilike:()=>q,or:()=>q,limit:()=>q,maybeSingle:async()=>({data:table==='classes'?{id:1,teacher_id:'t',status:'active'}:existing?{id:'existing',email:'test@example.invalid'}:null,error:null}),single:async()=>({data:update?{id:'new-account'}:{email:'test@example.invalid'},error:update&&profileFails?{message:'Profile rejected'}:null}),then:f=>Promise.resolve({error:null}).then(f)};return q;}};
 const mocks={'next/headers':{cookies:async()=>({set(){}})},'next/navigation':{redirect:url=>{throw new Redirect(decodeURIComponent(url))}},'next/cache':{revalidatePath(){}},'@/lib/auth':{requireAdmin:async()=>({id:'admin'}),requireTeacher:async()=>({id:'t',school_code:'TEST'})},'@/lib/supabase/admin':{createAdminClient:()=>client},'@/lib/supabase/server':{createClient:()=>({})},'@/lib/mail':{sendStudentPasswordEmail:async p=>{emails.push(p);return true},sendTeacherPasswordEmail:async p=>{emails.push(p);return true}},'@/lib/sections':{requireSectionMembership:async()=>{},setStudentSection:async()=>{if(sectionFails)throw Error('Section rejected')}}};
 const actions=load('app/actions/'+kind+'.ts',mocks);const form=new FormData();for(const [k,v] of Object.entries({entity:sectionFails?'students':'teachers',id:existing?'existing':'',name:'Test',email:'test@example.invalid',school_code:'TEST',teacher_id:'T-1',student_id:'S-1',class_id:kind==='teacher'?'1':'0'}))form.set(k,v);
 try {await (kind==='admin'?actions.saveAdminEntity(form):actions.manualAddStudent(form));assert.fail('Expected redirect');}catch(e){assert.ok(e instanceof Redirect);if(profileFails||sectionFails)assert.match(e.message,/error=/);if(cleanupFails)assert.match(e.message,/could not be removed/);}
 if(existing)assert.deepEqual(removed,[],'Never delete existing accounts on edit/link failures');else if(profileFails||sectionFails){assert.deepEqual(removed,['new-account']);assert.equal(emails.length,0,'No welcome email for rolled-back account');}else assert.equal(emails.length,1);
 assert.equal(created,existing?0:1);
}
for(const kind of ['admin','teacher']) {await accountScenario(kind,{profileFails:true});await accountScenario(kind,{sectionFails:true});await accountScenario(kind,{profileFails:true,cleanupFails:true});await accountScenario(kind,{existing:true,sectionFails:true});await accountScenario(kind);}
console.log('PASS remaining audit: archive scope, consistent game/Python completion, preserved assessments, bounded queries, timezone, new-account rollback and cleanup failure guidance.');

const shared={...ctx,activity:[{student_id:'s',created_at:'2026-10-15T00:00:00Z'}]};
const reportData=load('lib/teacher-reports.ts',{'@/lib/teacher-data':{getTeacherContext:async()=>shared},'@/lib/supabase/admin':{createAdminClient:()=>db},'@/lib/query-pages':pages,'@/lib/report-model':{buildTeacherReport:c=>c}});
queries.length=0;
const reportResult=await reportData.getTeacherReport({id:'t',name:'Test'},{type:'activity',section:1,from:'2026-10-14',to:'2026-10-15'});
assert.equal(shared.activity.length,1,'Activity report does not mutate cached dashboard context');
assert.equal(reportResult.report.activity.length,0,'Report uses explicit full-history query, not dashboard recent list');
for(const table of ['student_activity','python_runs']){const q=queries.find(q=>q.table===table);assert.ok(q.gte&&q.lt);assert.equal(q.lt[1],'2026-10-15T16:00:00.000Z');}
console.log('PASS activity export reads its own full scoped/date-filtered history without mutating cached summaries.');

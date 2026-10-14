// Offline reporting tests. Reads source files, writes synthetic PDFs only when requested.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,mocks={}) {
  const exports={};
  const code=ts.transpileModule(readFileSync(new URL('../../src/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,console,process,Buffer,URLSearchParams,Response,URL,require:name=>name in mocks?mocks[name]:require(name)});
  return exports;
}
const game={isGameLevelAvailable:l=>l.build_available===true};
const completion=load('lib/lesson-completion.ts',{'@/lib/game-build':game});
const model=load('lib/report-model.ts',{'@/lib/game-build':game,'@/lib/lesson-completion':completion,'@/lib/section-label':{sectionLabel:c=>c.name}});
const renderer=load('lib/report-export.ts',{'@/lib/report-model':model});
const ctx={
  classes:[{id:1,name:'ICT-A',school_year:'2026–2027'},{id:2,name:'ICT-B',school_year:'2026–2027'}],
  students:[{id:'a',student_id:'STU-001',name:'María Peñaflor'},{id:'b',student_id:'STU-002',name:'Student B'},{id:'c',student_id:'STU-003',name:'Student C'}],
  memberships:[{class_id:1,student_id:'a'},{class_id:1,student_id:'b'},{class_id:2,student_id:'c'}],
  lessons:[{id:1,title:'Sequences'},{id:2,title:'Loops'}],
  levels:[{id:1,lesson_id:1,level_number:1,title:'First Steps',active:true,build_available:true},{id:2,lesson_id:1,level_number:2,title:'Future level',active:true,build_available:false},{id:3,lesson_id:2,level_number:3,title:'Future loop',active:true,build_available:false}],
  assignments:[{id:1,lesson_id:1,class_id:1,title:'Sequence lesson'},{id:2,lesson_id:1,class_id:2,title:'Other section'},{id:3,lesson_id:2,student_id:'a',level_id:3,title:'Coming soon assignment'},{id:4,lesson_id:1,student_id:'outside',title:'Transferred student'}],
  progress:[{student_id:'a',level_id:1,completed:true,attempts:2,updated_at:'2026-10-13T00:00:00Z'}],
  python:{activities:[{id:'py1',lesson_id:1,published:true}],submissions:[{student_id:'a',activity_id:'py1'}]},
  activity:[{id:1,student_id:'a',created_at:'2026-10-13T16:00:00Z',action_type:'lesson_viewed',metadata:{lesson_id:1},xp_earned:0},{id:2,student_id:'b',created_at:'2026-10-13T15:59:59Z',action_type:'lesson_viewed'},{id:3,student_id:'c',created_at:'2026-10-14T01:00:00Z',action_type:'lesson_viewed'},{id:4,student_id:'a',created_at:'2026-10-14T16:00:00Z',action_type:'lesson_viewed'}],
  pythonRuns:[{id:'r1',student_id:'b',started_at:'2026-10-14T15:59:59Z'}],sessions:[],
};
const submissions=[{id:'sub-old',student_id:'a',activity_id:'py1',submitted_at:'2026-10-12T00:00:00Z'},{id:'sub-new',student_id:'a',activity_id:'py1',submitted_at:'2026-10-13T00:00:00Z'}];
const reviews=[{id:'rev-old',submission_id:'sub-old',status:'passed',created_at:'2026-10-12T01:00:00Z'}];
const meta={teacher:'Teacher Example',school:'KnightCode Demonstration School',now:'2026-10-14T08:00:00Z'};
const original=JSON.stringify(ctx);
const filters=model.parseReportFilters({type:'class_performance',section:'1'});
const report=model.buildTeacherReport(ctx,filters,meta,submissions,reviews);
assert.equal(report.rows.length,2);assert.equal(report.rows[0][3],'1 / 1','Coming Soon does not lower game completion');
assert.equal(report.rows[0][4],'1 / 1');assert.equal(report.rows[0][5],'1 awaiting review','Old passed review must not mark newest submission passed');
assert.equal(report.rows[0][6],'1 / 1','Unavailable direct assignment excluded');assert.equal(report.rows[0][7],'100%');
assert.equal(report.summary[2].value,'1 / 2');assert.equal(report.summary[3].value,'1');
assert.equal(JSON.stringify(ctx),original,'Reporting cannot modify context/progress');
assert.throws(()=>model.buildTeacherReport(ctx,{...filters,section:999},meta,[],[]),/not assigned/);
for(const query of [{section:'bad'},{section:'-1'},{type:'activity',from:'2026-02-30'},{type:'activity',from:'2026-10-15',to:'2026-10-01'}]) assert.throws(()=>model.parseReportFilters(query));
const activity=model.buildTeacherReport(ctx,model.parseReportFilters({type:'activity',section:'1',from:'2026-10-14',to:'2026-10-14'}),meta,[],[]);
assert.equal(activity.rows.length,2,'Inclusive local dates and teacher-section scope');assert.equal(activity.summary[2].value,'1');
const challenge=model.buildTeacherReport(ctx,{...filters,type:'challenge_performance'},meta,[],[]);
assert.equal(challenge.rows.find(r=>r[0]==='2')[4],'N/A');
const assignment=model.buildTeacherReport(ctx,{...filters,type:'assignment_completion'},meta,[],[]);
assert.equal(assignment.rows.find(r=>r[0]==='Coming soon assignment')[6],'Unavailable');
assert.ok(!assignment.rows.some(r=>r[0]==='Transferred student'));
const empty=model.buildTeacherReport({...ctx,students:[],memberships:[]},filters,meta,[],[]);assert.equal(empty.rows.length,0);
const csv=renderer.reportCsv({...report,rows:[['=HYPERLINK("bad")','Name, "Quoted"','ICT-A','1 / 1','1 / 1','line1\nline2','1 / 1','100%']]});
assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(csv.includes('"Name, ""Quoted"""'));assert.ok(csv.includes('"line1\nline2"'));
for(const type of model.reportTypes){const r=model.buildTeacherReport(ctx,{...filters,type},meta,submissions,reviews);assert.ok(r.columns.length);assert.ok(r.rows.every(row=>row.length===r.columns.length));}

// Export API keeps the teacher guard and does not cache private report data.
let allow=true;
const route=load('app/api/teacher/reports/route.ts',{
  '@/lib/auth':{requireTeacher:async()=>{if(!allow)throw Error('TEACHER_REQUIRED');return {id:'teacher',name:'Teacher'};}},
  '@/lib/teacher-reports':{getTeacherReport:async(_,f)=>{if(f.section===999)throw Error('Section not assigned');return {report};}},
  '@/lib/report-model':model,'@/lib/report-export':{...renderer,reportPdf:async()=>new Uint8Array([37,80,68,70])},
});
let response=await route.GET(new Request('http://localhost/api/teacher/reports?type=class_performance&section=1&format=pdf'));
assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('content-type'),'application/pdf');
response=await route.GET(new Request('http://localhost/api/teacher/reports?section=999'));assert.equal(response.status,400);
allow=false;await assert.rejects(()=>route.GET(new Request('http://localhost/api/teacher/reports')),/TEACHER_REQUIRED/);

if(process.argv[2]) {
  const out=path.resolve(process.argv[2]);mkdirSync(out,{recursive:true});
  const sample={...report,rows:Array.from({length:85},(_,i)=>[`STU-${String(i+1).padStart(3,'0')}`,i===0?'María Peñaflor':`Example Student ${i+1}${i===4?' with a long name to verify readable wrapping without cutting information':''}`,'ICT-A',`${i%5} / 4`,`${i%3} / 2`,i%2?'1 awaiting review':'1 passed; 1 needs revision',`${i%4} / 3`,`${Math.round(i%4/3*100)}%`])};
  writeFileSync(path.join(out,'section-performance-sample.pdf'),await renderer.reportPdf(sample));
  writeFileSync(path.join(out,'empty-report.pdf'),await renderer.reportPdf(empty));
  const longReport={...assignment,rows:[['Long assignment '+('Read and practise programming logic with examples. '.repeat(90))+'END-OF-LONG-RECORD','ICT-A','No due date','2','1','50%','Available']]};
  writeFileSync(path.join(out,'long-report.pdf'),await renderer.reportPdf(longReport));
  for(const type of model.reportTypes) writeFileSync(path.join(out,type+'.pdf'),await renderer.reportPdf(model.buildTeacherReport(ctx,{...filters,type},meta,submissions,reviews)));
  console.log('Synthetic PDF fixtures written to '+out);
}
console.log('PASS: all report types, teacher/section scope, date boundaries, completion vs review, unavailable levels, CSV escaping, empty data, immutable source data, and authenticated exports.');

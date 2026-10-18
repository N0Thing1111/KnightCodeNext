// Offline regression checks: no Supabase connection, email, or real record changes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  }).outputText;
  vm.runInNewContext(code, { exports, FormData, console, process, require: name => name in mocks ? mocks[name] : require(name) });
  return exports;
}
const actor = {id: '00000000-0000-0000-0000-000000000001'};
let allowed = true, lesson = {id: 8, active: false}, operations = [], rpcError = null, queryError = null;
const client = {
  from(table) {
    const query = {
      insert(data) { operations.push({table, method:'insert', data}); if(table === 'lessons') lesson = {id:8, ...data}; return query; },
      update(data) { operations.push({table, method:'update', data}); lesson = {...lesson, ...data}; return query; },
      eq() {return query;}, select() {return query;},
      single: async () => ({data: lesson, error: queryError}),
      then(resolve) {return Promise.resolve({error: queryError}).then(resolve);},
    };
    return query;
  },
  rpc: async (name, data) => {operations.push({method:'rpc', name, data}); return {error: rpcError};},
};
const common = {
  'next/headers': {cookies: async () => ({set(){}})},
  'next/navigation': {redirect: url => {throw Error('REDIRECT ' + url);}},
  'next/cache': {revalidatePath(){}},
  '@/lib/auth': {requireAdmin: async () => {if(!allowed) throw Error('Forbidden'); return actor;}},
  '@/lib/supabase/admin': {createAdminClient: () => client},
  '@/lib/supabase/server': {}, '@/lib/mail': {}, '@/lib/sections': {},
};
const actions = load('app/actions/admin.ts', common);
function form(values) {const f=new FormData(); for(const [key,value] of Object.entries(values)) f.set(key,String(value)); return f;}
async function call(name, values) {
  operations=[];
  try {await actions[name](form({entity:'lessons', ...values})); assert.fail('Expected redirect');}
  catch(error) {if(!error.message.startsWith('REDIRECT ')) throw error; return new URL(error.message.slice(9),'http://local.test').searchParams;}
}
const input = {title:'Example',order_number:8,content:'<h2>Safe</h2><script>alert(1)</script>'};
assert.ok((await call('saveAdminEntity',input)).has('notice'));
assert.equal(lesson.active,true,'New lesson is active');
assert.equal(lesson.content,'<h2>Safe</h2>','Lesson HTML remains sanitized');
lesson.active=false;
assert.ok((await call('saveAdminEntity',{...input,id:8,title:'Edited'})).has('notice'));
assert.equal(lesson.active,false,'Editing must not silently restore an archived lesson');
for(const order_number of [0,-1,1.5,'NaN']) {
  assert.ok((await call('saveAdminEntity',{...input,order_number})).has('error'));
  assert.equal(operations.length,0);
}
queryError={code:'23505',message:'unique constraint'};
assert.match((await call('saveAdminEntity',input)).get('error'),/already used/);
queryError=null;
for(const restore of ['0','1']) {
  assert.ok((await call('setAdminEntityStatus',{id:8,restore})).has('notice'));
  assert.equal(lesson.active,restore==='1');
  assert.ok(operations.every(op=>['lessons','admin_audit_log'].includes(op.table)),'Archiving does not modify linked records');
}
assert.ok((await call('deleteAdminEntity',{id:8})).has('error'));
assert.equal(operations.length,0,'Deletion needs explicit confirmation');
rpcError={message:'This lesson has linked records. Archive it instead.'};
assert.match((await call('deleteAdminEntity',{id:8,confirm_delete:1})).get('error'),/Archive/);
assert.equal(operations.length,1,'No extra audit is written after a failed deletion');
rpcError={code:'PGRST202',message:'Missing function'};
assert.match((await call('deleteAdminEntity',{id:8,confirm_delete:1})).get('error'),/database update/);
rpcError=null;
assert.ok((await call('deleteAdminEntity',{id:8,confirm_delete:1})).has('notice'));
assert.deepEqual(JSON.parse(JSON.stringify(operations)),[{method:'rpc',name:'delete_unused_lesson',data:{p_admin:actor.id,p_lesson:8}}]);
allowed=false; operations=[];
await assert.rejects(()=>actions.deleteAdminEntity(form({entity:'lessons',id:8,confirm_delete:1})),/Forbidden/);
assert.equal(operations.length,0,'Unauthenticated calls cannot reach the database');

// A hidden parent lesson must also hide its levels and prevent direct assignment scope.
let archived=true;
const school={
  lessons:[{id:1,active:true},{id:2,active:false}],
  levels:[{id:10,lesson_id:1,active:true,level_number:1},{id:20,lesson_id:2,active:true,level_number:2}],
  assignments:[{id:1,teacher_id:'teacher',lesson_id:1},{id:2,teacher_id:'teacher',lesson_id:2},{id:3,teacher_id:'teacher',lesson_id:2,level_id:20}],
};
const studentDb={from(table) {
  let filtered=[...(school[table] || [])];
  const q={select:()=>q,order:()=>q,eq(key,value) {
    if(key==='lessons.active') filtered=filtered.filter(row=>school.lessons.find(l=>l.id===row.lesson_id)?.active===value);
    else filtered=filtered.filter(row=>row[key]===value);
    return q;
  },range:async()=>({data:filtered}),then:resolve=>Promise.resolve({data:filtered}).then(resolve)};
  return q;
}};
const schoolTime=load('lib/school-time.ts',{});
const streakHelper=load('lib/learning-streak.ts',{'./school-time':schoolTime});
const studentData=load('lib/student-data.ts',{'./learning-streak':streakHelper,
  react:{cache:fn=>fn}, '@/lib/query-pages':{allRows:async factory=>(await factory().range()).data},
  '@/lib/supabase/server':{createClient:async()=>studentDb},
  '@/lib/python-data':{}, '@/lib/lesson-completion':{}, '@/lib/game-build':{}, '@/lib/format':{},
});
for(const active of [false,true]) {
  archived=!active; school.lessons[1].active=active;
  const scope=await studentData.getAssignmentScope('student');
  assert.equal(scope.fullLessonIds.has(2),!archived);
  assert.equal(scope.directLevelIds.has(20),!archived);
  assert.equal(scope.levelIds.has(20),!archived);
  assert.equal(scope.assignments.length,3,'Archiving preserves the assignments');
}
console.log('PASS lesson create/edit/archive/restore/delete actions, HTML sanitization, role/confirmation guards, missing migration message, and archived lesson level access.');

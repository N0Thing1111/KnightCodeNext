// Offline checks only. No requests to Supabase or changes to school records.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, TextEncoder, console, require: name => name in mocks ? mocks[name] : require(name) });
  return exports;
}
const contract = load('lib/python-contract.ts');
const activityId = '10000000-0000-4000-8000-000000000001';
const actorId = '10000000-0000-4000-8000-000000000002';
const content = { title: 'Count steps', concept: 'Sequence', instructions: 'Print 2.', guide: 'Use print().', starter: '', extension: '', cases: [{ label: 'No input', inputs: [], expected: '2' }] };
let profile, signedIn, insertError, adminCalls, inserts, rpcs;
function reset() { profile = {role:'admin',active:true}; signedIn=true; insertError=null; adminCalls=0; inserts=[]; rpcs=[]; }
const db = {
  auth: {getClaims: async () => ({data:signedIn ? {claims:{sub:actorId}} : null,error:null})},
  from(table) {
    assert.equal(table,'profiles');
    const query = {
      select: () => query,
      eq(key,value) {assert.equal(key,'id');assert.equal(value,actorId);return query;},
      maybeSingle: async () => ({data:profile,error:null}),
    }; return query;
  },
  rpc: async (name,args) => {rpcs.push({name,args});return {data:null,error:null};},
};
const route = load('app/api/python/route.ts', {
  'next/server': { NextResponse: {json: (body,options={}) => ({status:options.status || 200,body})} },
  '@/lib/python-contract': contract,
  '@/lib/supabase/server': {createClient:async()=>db},
  '@/lib/supabase/admin': {createAdminClient:()=>{
    adminCalls++;
    return {from(table) {
      assert.equal(table,'python_activities');
      const q={insert(row){inserts.push(row);return q;},select:()=>q,single:async()=>({data:insertError ? null : {id:activityId},error:insertError})};
      return q;
    }};
  }},
});
const body={op:'create_activity',lesson:9,content,published:false};
const post=(value=body,origin='http://local.test')=>route.POST({headers:new Headers({origin}),nextUrl:new URL('http://local.test/api/python'),text:async()=>JSON.stringify(value)});
reset();
assert.equal((await post(body,'http://other.test')).status,403);
assert.equal(adminCalls,0);
signedIn=false;
assert.equal((await post()).status,401);
assert.equal(adminCalls,0);
for (const p of [null,{role:'student',active:true},{role:'teacher',active:true},{role:'admin',active:false}]) {
  reset(); profile=p;
  assert.equal((await post()).status,403);
  assert.equal(adminCalls,0,'Unauthorized requests must not initialize the privileged client');
}
for (const invalid of [{...body,lesson:0},{...body,lesson:1.5},{...body,lesson:Number.MAX_SAFE_INTEGER+1},{...body,content:{...content,cases:[]}},{...body,content:{...content,title:''}}]) {
  reset(); assert.equal((await post(invalid)).status,400); assert.equal(adminCalls,0);
}
for (const published of [false,true]) {
  reset(); const response=await post({...body,published});
  assert.equal(response.status,200);
  assert.equal(response.body.data.id,activityId);
  assert.deepEqual(JSON.parse(JSON.stringify(inserts)),[{lesson_id:9,content,published}]);
  assert.equal(rpcs.length,0);
}
for (const [code,status,pattern] of [['23505',409,/already has/],['23503',404,/no longer exists/]]) {
  reset(); insertError={code,message:'Database constraint'};
  const response=await post();
  assert.equal(response.status,status); assert.match(response.body.error,pattern);
  assert.equal(inserts.length,1,'Do not replace an existing activity or retry a removed lesson');
}
reset();
await post({op:'activity',activity:activityId,content,published:true});
assert.equal(adminCalls,0,'Editing stays on the existing revision-preserving RPC');
assert.equal(rpcs[0].name,'python_update_activity');
assert.equal(rpcs[0].args.p_activity,activityId);
console.log('PASS: Python creation validates content, restricts access to active admins, handles duplicates/deleted lessons, and preserves the revision update path.');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
let databaseVersion=2, databaseCalls=0;
const stubDb={rpc:async(name)=>{assert.equal(name,'school_restore_version');return {data:databaseVersion};},from:()=>{databaseCalls++;throw Error('Reached account reads');}};
const modules=new Map();
function load(file){
 const resolved=path.resolve(root,file);if(modules.has(resolved))return modules.get(resolved);
 const mod={exports:{}};modules.set(resolved,mod.exports);
 const requireStub=(name)=>{
  if(name==='server-only')return {};
  if(name==='@/lib/supabase/admin')return {createAdminClient:()=>stubDb};
  if(name==='@/lib/mail')return {};
  if(name==='@/lib/school-name')return {};
  if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
  return require(name);
 };
 const js=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:resolved})(requireStub,mod,mod.exports);
 return mod.exports;
}
(async()=>{
 const backup=load('src/lib/admin-backup.ts'), restore=load('src/lib/admin-restore.ts');
 const empty=version=>({format:'KnightCode Supabase school save',version,created_at:new Date().toISOString(),tables:Object.fromEntries([...backup.BACKUP_TABLES,...backup.PYTHON_BACKUP_TABLES].map(t=>[t,[]]))});
 for(const version of [3,4]){
  const save=empty(version);if(version===3)save.tables.python_grants=[{id:'legacy',student_id:'not-active'}];
  const file=backup.encryptBackup(save,'Fixture password only!');
  const decoded=backup.decryptBackup(file,'Fixture password only!');
  restore.validateRestoreBackup(decoded);assert.deepEqual(decoded,save);
  assert.throws(()=>backup.decryptBackup(file,'Incorrect password'),/Cannot open/);
  const bad=empty(version);delete bad.tables.python_reviews;
  assert.throws(()=>backup.decryptBackup(backup.encryptBackup(bad,'Fixture password only!'),'Fixture password only!'),/Cannot open/);
 }
 databaseVersion=2;
 await assert.rejects(restore.restoreSchoolBackup(empty(4),'admin'),/matching save format/);assert.equal(databaseCalls,0);
 for(const [ready,version] of [[2,3],[3,3],[3,4]]){
  databaseVersion=ready;
  await assert.rejects(restore.restoreSchoolBackup(empty(version),'admin'),/Reached account reads/);
 }
 databaseVersion=3;const before=databaseCalls;
 await assert.rejects(restore.restoreSchoolBackup(empty(2),'admin'),/matching save format/);assert.equal(databaseCalls,before);
 console.log('PASS: encrypted v3/v4 round trips, legacy keys, invalid files/passwords, and deployment-version gates before account mutations.');
})().catch(e=>{console.error(e);process.exitCode=1;});

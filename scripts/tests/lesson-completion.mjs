import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(file, dependencies={}) {
  const exports={};
  const js=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js,{exports,process:{env:{}},require:name=>dependencies[name]??require(name)});
  return exports;
}
const game=load('../../src/lib/game-build.ts');
const {lessonCompletion:complete}=load('../../src/lib/lesson-completion.ts',{'@/lib/game-build':game});
const levels=[{id:1,lesson_id:1,level_number:1,active:true,build_available:true},{id:2,lesson_id:1,level_number:2,active:true,build_available:false}];
const activity=[{id:'python-1',lesson_id:1,published:true}];
const progress=[{student_id:'student-a',level_id:1,completed:true,attempts:1}];
const submitted=[{student_id:'student-a',activity_id:'python-1'}];
assert.equal(complete(1,'student-a',levels,progress,activity,[]).complete,false,'Games alone do not complete a whole lesson with Python');
assert.equal(complete(1,'student-a',levels,progress,activity,[]).pct,50);
assert.equal(complete(1,'student-a',levels,progress,activity,submitted).complete,true,'Submission completes Python without a teacher review');
assert.equal(complete(1,'student-a',levels,progress,activity,[{student_id:'student-b',activity_id:'python-1'}]).pythonDone,false,'Other student submission never counts');
assert.equal(complete(1,'student-a',levels.map(l=>({...l,build_available:false})),[],activity,submitted).complete,true,'All Coming Soon games do not block Python-only completion');
assert.equal(complete(1,'student-a',[],[],activity,[]).complete,false,'Still requires a submission if there are no games');
assert.equal(complete(1,'student-a',levels,progress,[],[]).complete,true,'Game-only lesson completion is preserved');
assert.equal(complete(1,'student-a',[],[],[],[]).complete,false,'Empty curriculum is not completed automatically');
assert.equal(game.isGameLevelAvailable({...levels[0],build_available:false}),false,'Database flag overrides legacy built-in list');
console.log('PASS lesson completion: coming-soon games, submitted versus only executed Python, learner isolation, no-game lessons, legacy game-only lessons.');

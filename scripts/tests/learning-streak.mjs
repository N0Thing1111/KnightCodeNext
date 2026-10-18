import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file,mocks={}) {const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../../src/lib/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Intl,Set,require:n=>mocks[n]??require(n)});return exports;}
const time=load('school-time.ts'),{learningStreak}=load('learning-streak.ts',{'./school-time':time});
for(const tz of ['UTC','Asia/Manila','America/Los_Angeles']){
 process.env.TZ=tz;
 assert.equal(time.schoolDay('2026-10-18T15:59:59Z'),'2026-10-18');
 assert.equal(time.schoolDay('2026-10-18T16:00:00Z'),'2026-10-19');
 assert.match(time.formatSchoolDateTime('2026-10-17T05:42:00Z'),/1:42\s*PM/i);
 const now=Date.parse('2026-10-18T06:00:00Z');
 const p={current_streak:3,last_activity_date:'2026-10-18',learning_activity_dates:['2026-10-16','2026-10-17','2026-10-18']};
 const s=learningStreak(p,now);assert.equal(s.count,3);assert.equal(s.todayCounted,true);assert.equal(s.week.filter(d=>d.done).length,3);assert.equal(s.week[0].date,'2026-10-12');assert.equal(s.week[6].date,'2026-10-18');assert.match(s.message,/Today counted/);
 const next=learningStreak(p,Date.parse('2026-10-18T16:00:00Z'));assert.equal(next.count,3);assert.equal(next.todayCounted,false);assert.equal(next.week[0].date,'2026-10-19');assert.equal(next.week.filter(d=>d.done).length,0);
 assert.equal(learningStreak(p,Date.parse('2026-10-19T16:00:00Z')).count,0);
 assert.equal(learningStreak({current_streak:0,last_activity_date:null},now).count,0);
 assert.equal(learningStreak({current_streak:3,last_activity_date:'2026-10-18'},now).week.filter(d=>d.done).length,3);
 assert.equal(learningStreak({current_streak:2,last_activity_date:'2026-10-19'},now).count,0);
}
const page=readFileSync(new URL('../../src/app/(student)/dashboard/page.tsx',import.meta.url),'utf8');
assert.doesNotMatch(page,/activeDates\.has|const dayLabels/);
assert.match(page,/streak\.week\.map/);
const audit=readFileSync(new URL('../../src/app/(admin)/admin/audit/page.tsx',import.meta.url),'utf8');assert.match(audit,/formatSchoolDateTime\(r.created_at\)/);assert.doesNotMatch(audit,/toLocaleString\(\)/);
console.log('PASS: Philippine midnight/week rollover, same-day/yesterday/expired streak, legacy fallback, and 05:42 UTC -> 1:42 PM audit time under three host timezones.');

const {dailyPractice}=load('daily-practice.ts',{'./school-time':time});
const now=Date.parse('2026-10-18T06:00:00Z');
assert.equal(dailyPractice({practice_time_date:'2026-10-18',practice_game_seconds:1800,practice_python_ms:120000},now).minutes,32);
assert.equal(dailyPractice({practice_time_date:'2026-10-17',practice_game_seconds:1800,practice_python_ms:120000},now).minutes,0);
assert.equal(dailyPractice({},now).minutes,0);
assert.match(page,/dailyPractice\(student\)/);assert.doesNotMatch(page,/duration_seconds, 0/);
console.log('PASS daily saved game/Python totals and Philippine day rollover.');

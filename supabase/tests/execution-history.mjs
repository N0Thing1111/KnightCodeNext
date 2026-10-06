import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import assert from "node:assert/strict";
const requirePackage = createRequire(
  process.argv[2] ? resolve(process.argv[2], "package.json") : import.meta.url,
);
const { PGlite } = requirePackage("@electric-sql/pglite");
const root = fileURLToPath(new URL("../../", import.meta.url));
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text,owner_id text);
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
`);
for (const file of [
  "202609270001_student_foundation.sql",
  "202609270002_student_runtime_fixes.sql",
  "202610050001_achievement_awards.sql",
  "202610050002_code_execution_history.sql",
])
  await db.exec(
    fs
      .readFileSync(root + "/supabase/migrations/" + file, "utf8")
      .replace("create extension if not exists pgcrypto;", ""),
  );
const student = "00000000-0000-0000-0000-000000000001";
const teacher = "00000000-0000-0000-0000-000000000002";
const other = "00000000-0000-0000-0000-000000000003";
await db.exec(`
insert into auth.users values('${student}','student@test.invalid','{}'),('${teacher}','teacher@test.invalid','{"role":"teacher"}'),('${other}','other@test.invalid','{}');
insert into lessons(id,title,order_number) values(1,'Test',1);
insert into levels(id,lesson_id,level_number,order_in_lesson,title) values(1,1,1,1,'Test');
insert into assignments(teacher_id,student_id,lesson_id,title) values('${teacher}','${student}',1,'Test');
select set_config('request.jwt.claim.sub','${student}',false);
`);
const runId = "execution_history_test_01";
const progress = {
  telemetry_version: 2,
  run_id: runId,
  sequence: 1,
  scene_name: "1",
  attempts: 1,
  mistakes: 0,
  play_time_seconds: 10,
  total_play_time_seconds: 10,
  lines_used: 1,
  completed_lines: 0,
  completed: false,
  code_mode: "free",
};
const saveProgress = async (p) =>
  (
    await db.query("select record_level_progress(1,$1::jsonb) result", [
      JSON.stringify(p),
    ])
  ).rows[0].result;
const event = {
  run_id: runId,
  scene_name: "1",
  execution_number: 1,
  restart_number: 0,
  source: "move(right)",
  source_truncated: false,
  status: "running",
  warning: "",
  code_mode: "free",
  start_x: 0,
  start_y: 0,
  end_x: 0,
  end_y: 0,
  elapsed_ms: 0,
};
const saveRun = async (e) =>
  db.query("select record_code_execution(1,$1::jsonb)", [JSON.stringify(e)]);
await assert.rejects(() => saveRun(event), /Save level progress/);
await saveProgress(progress);
await saveRun(event);
await saveRun({ ...event, status: "finished", end_x: 2, elapsed_ms: 150 });
await saveRun(event); // A delayed start must not overwrite the final result.
await saveRun({ ...event, status: "finished", end_x: 2, elapsed_ms: 150 });
let rows = (
  await db.query(
    "select * from student_code_executions order by execution_number",
  )
).rows;
assert.equal(rows.length, 1);
assert.equal(rows[0].status, "finished");
assert.equal(Number(rows[0].end_x), 2);
await assert.rejects(
  () => saveRun({ ...event, source: "move(left)" }),
  /source cannot be replaced/,
);
const second = {
  ...event,
  execution_number: 2,
  source: "move(up)",
  start_x: 2,
  end_x: 2,
};
await saveRun(second);
await saveRun({ ...second, status: "completed", end_y: 2, elapsed_ms: 150 });
await saveProgress({
  ...progress,
  sequence: 2,
  lines_used: 2,
  completed_lines: 2,
  completed: true,
});
rows = (
  await db.query(
    "select * from student_code_executions order by execution_number",
  )
).rows;
assert.deepEqual(
  rows.map((r) => r.source),
  ["move(right)", "move(up)"],
);
assert.deepEqual(
  rows.map((r) => r.status),
  ["finished", "completed"],
);
assert.equal(rows[0].session_number, rows[1].session_number);
console.log(
  "PASS: partial solutions retain both submissions, ordered runs, immutable source, final result, retries",
);
const nextRun = "execution_history_test_02";
await saveProgress({ ...progress, run_id: nextRun });
await saveRun({ ...event, run_id: nextRun });
await saveRun({
  ...event,
  run_id: nextRun,
  status: "rejected",
  warning: "Expected a direction.",
});
await saveRun({
  ...event,
  run_id: nextRun,
  execution_number: 2,
  restart_number: 1,
  status: "interrupted",
});
rows = (
  await db.query(
    "select * from student_code_executions where run_id=$1 order by execution_number",
    [nextRun],
  )
).rows;
assert.deepEqual(
  rows.map((r) => r.status),
  ["rejected", "interrupted"],
);
assert.equal(rows[1].restart_number, 1);
assert.equal(
  (await db.query("select total_xp from profiles where id=$1", [student]))
    .rows[0].total_xp,
  100,
);
await assert.rejects(
  () => saveRun({ ...event, execution_number: 0 }),
  /Invalid Run history/,
);
await assert.rejects(
  () => saveRun({ ...event, source: "x".repeat(32769) }),
  /Invalid Run history/,
);
await assert.rejects(
  () => saveRun({ ...event, end_x: null }),
  /Invalid Run position/,
);
await assert.rejects(
  () => saveRun({ ...event, scene_name: "2" }),
  /Level is not assigned/,
);
console.log(
  "PASS: fresh visits, rejected/interrupted runs, resets, input limits, no extra XP",
);
await db.exec("set role authenticated");
await saveRun({ ...event, run_id: nextRun, execution_number: 3 });
assert.equal(
  (await db.query("select count(*)::int n from student_code_executions"))
    .rows[0].n,
  5,
);
await assert.rejects(
  () => db.exec("delete from student_code_executions"),
  /permission denied/,
);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
assert.equal(
  (await db.query("select count(*)::int n from student_code_executions"))
    .rows[0].n,
  0,
);
await assert.rejects(() => saveRun(event), /Level is not assigned/);
await db.exec("reset role");
await db.query("delete from student_level_sessions where run_id=$1", [nextRun]);
assert.equal(
  (
    await db.query(
      "select count(*)::int n from student_code_executions where run_id=$1",
      [nextRun],
    )
  ).rows[0].n,
  0,
);
console.log(
  "PASS: student isolation, write permissions, authorization, session deletion cascades",
);
await db.close();

const requireApp = createRequire(
  new URL("../../package.json", import.meta.url),
);
const { createPerformanceBridge } = requireApp(
  "./public/assets/js/performance-bridge.js",
);
const saved = [];
let retry = true;
const bridge = createPerformanceBridge(
  async (_, body) => {
    saved.push("progress:" + body.sequence);
  },
  1,
  () => {},
  async (body) => {
    if (retry) {
      retry = false;
      throw new Error("temporary connection failure");
    }
    saved.push("run:" + body.execution_number + ":" + body.status);
  },
);
await Promise.all([
  bridge.recordAttempt(progress),
  bridge.recordExecution(event),
  bridge.recordExecution({ ...event, status: "finished" }),
  bridge.completeLevel({ ...progress, sequence: 2, completed: true }),
]);
assert.deepEqual(saved, [
  "progress:1",
  "run:1:running",
  "run:1:finished",
  "progress:2",
]);
assert.equal(bridge.hasPending(), false);
await assert.rejects(
  () => bridge.recordExecution({ ...event, scene_name: "2" }),
  /scene does not match/,
);
console.log(
  "PASS: browser queue preserves progress/Run order through retries and validates scene",
);

let offline = true;
const retryBridge = createPerformanceBridge(
  async () => {},
  1,
  () => {},
  async () => {
    if (offline) throw new Error("offline");
    return { ok: true };
  },
);
const pendingRun = retryBridge.recordExecution(event);
assert.equal(await retryBridge.flush(), false);
assert.equal(retryBridge.hasPending(), true);
offline = false;
assert.equal(await retryBridge.flush(), true);
await pendingRun;
assert.equal(retryBridge.hasPending(), false);
console.log(
  "PASS: navigation flush reports failed saves and retries the original queued Run",
);

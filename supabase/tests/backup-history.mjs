import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const rows = Array.from({ length: 1005 }, (_, id) => ({
  id,
  source: `move(right) // ${id}`,
}));
const calls = [];
let rpcError = null;
const fakeDb = {
  async rpc(name, args) {
    calls.push([name, args]);
    const tables = Object.fromEntries([...exports.BACKUP_TABLES, ...exports.PYTHON_BACKUP_TABLES].map(t => [t, []]));
    tables.profiles = [{ id: "student", role: "student" }];
    tables.student_code_executions = rows;
    return { data: { format: "KnightCode Supabase school save", version: 3, created_at: new Date().toISOString(), tables }, error: rpcError };
  }
};
const source = readFileSync(
  new URL("../../src/lib/admin-backup.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const exports = {};
vm.runInNewContext(js, {
  exports,
  Buffer,
  require(name) {
    if (name === "server-only") return {};
    if (name === "@/lib/backup-transfer-rules") return { MAX_BACKUP_BYTES: 32*1024*1024, MAX_BACKUP_JSON_BYTES: 128*1024*1024 };
    if (name === "@/lib/supabase/admin")
      return { createAdminClient: () => fakeDb };
    return require(name);
  },
});
const { captureBackup, encryptBackup, decryptBackup } = exports;
const backup = await captureBackup("admin");
assert.equal(backup.version, 3);
assert.equal(backup.tables.student_code_executions.length, 1005);
assert.equal(backup.tables.profiles.length, 1);
assert.equal(calls.length, 1);
assert.equal(calls[0][0], "capture_school_backup");
assert.equal(calls[0][1].p_admin, "admin");
rpcError = { message: "lock timeout" };
await assert.rejects(() => captureBackup("admin"), /lock timeout/);
rpcError = null;
const pythonBackup = backup;
for (const t of exports.PYTHON_BACKUP_TABLES) assert.ok(Array.isArray(pythonBackup.tables[t]));
const password = "isolated-test-password";
assert.equal(
  decryptBackup(encryptBackup(pythonBackup, password), password).version,
  3,
);
const missingPython = structuredClone(pythonBackup);
delete missingPython.tables.python_runs;
assert.throws(
  () => decryptBackup(encryptBackup(missingPython, password), password),
  /Cannot open/,
);
const reopened = decryptBackup(encryptBackup(backup, password), password);
assert.equal(
  reopened.tables.student_code_executions[1004].source,
  rows[1004].source,
);
const legacy = structuredClone(backup);
legacy.version = 1;
delete legacy.tables.student_code_executions;
assert.equal(
  decryptBackup(encryptBackup(legacy, password), password).tables
    .student_code_executions.length,
  0,
);
const invalid = structuredClone(backup);
delete invalid.tables.student_code_executions;
assert.throws(
  () => decryptBackup(encryptBackup(invalid, password), password),
  /Cannot open/,
);
assert.throws(
  () => decryptBackup(encryptBackup(backup, password), "wrong password"),
  /Cannot open/,
);
console.log(
  "PASS: atomic snapshot RPC, fail-closed capture, encryption beyond 1,000 Runs, old/invalid saves",
);

const large = structuredClone(backup);
large.tables.student_code_executions = [{ source: require("node:crypto").randomBytes(4*1024*1024).toString("base64") }];
const encryptedLarge = encryptBackup(large,password);
assert.ok(encryptedLarge.length > 4.5*1024*1024);
assert.equal(decryptBackup(encryptedLarge,password).tables.student_code_executions[0].source,large.tables.student_code_executions[0].source);
assert.throws(()=>decryptBackup(Buffer.alloc(33*1024*1024),password),/Cannot open/);
console.log("PASS encrypted save above Vercel payload limit and oversize rejection.");

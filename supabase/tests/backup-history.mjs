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
const fakeDb = {
  from(table) {
    const query = {
      select() {
        return query;
      },
      order() {
        return query;
      },
      async range(start, end) {
        calls.push([table, start, end]);
        const data =
          table === "student_code_executions"
            ? rows
            : table === "profiles"
              ? [
                  { id: "admin", role: "admin" },
                  { id: "student", role: "student" },
                ]
              : [];
        return { data: data.slice(start, end + 1), error: null };
      },
    };
    return query;
  },
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
    if (name === "@/lib/supabase/admin")
      return { createAdminClient: () => fakeDb };
    return require(name);
  },
});
const { captureBackup, encryptBackup, decryptBackup } = exports;
const backup = await captureBackup();
assert.equal(backup.version, 2);
assert.equal(backup.tables.student_code_executions.length, 1005);
assert.equal(backup.tables.profiles.length, 1);
assert.ok(
  calls.some(([t, start]) => t === "student_code_executions" && start === 1000),
);
const password = "isolated-test-password";
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
  "PASS: backup pagination beyond 1,000 Runs, encryption round trip, old saves, invalid saves, admin exclusion",
);

// Uses fake SMTP and database clients: no real emails or accounts are created.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(path, mocks, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        throw Error("Unexpected dependency: " + name);
      },
      crypto: webcrypto,
      ...globals,
    },
  );
  return exports;
}
const env = {
  KC_MAIL_SMTP_HOST: "smtp.example.invalid",
  KC_MAIL_SMTP_USERNAME: "sender@example.invalid",
  KC_MAIL_SMTP_PASSWORD: "fake-test-password",
  NEXT_PUBLIC_APP_URL: "https://school.example.invalid/",
};
const messages = [];
let smtpFails = false;
const mail = load(
  "../../src/lib/mail.ts",
  {
    "server-only": {},
    nodemailer: {
      createTransport: () => ({
        sendMail: async (message) => {
          if (smtpFails) throw Error("Simulated SMTP failure");
          messages.push(message);
        },
      }),
    },
  },
  { process: { env }, console: { error() {} } },
);
const teacher = {
  name: "Teacher Test",
  email: "teacher@example.invalid",
  teacherId: "TCH-TEST",
  temporaryPassword: "fake-password",
  schoolLabel: "TEST-SCHOOL",
};
assert.equal(await mail.sendTeacherPasswordEmail(teacher), true);
assert.equal(messages[0].to.address, teacher.email);
assert.match(messages[0].text, /Teacher ID: TCH-TEST/);
assert.match(messages[0].text, /Temporary password: fake-password/);
assert.match(
  messages[0].text,
  /https:\/\/school.example.invalid\/teacher-login/,
);
assert.doesNotMatch(messages[0].text, /Student ID/);
delete env.NEXT_PUBLIC_APP_URL;
env.VERCEL_PROJECT_PRODUCTION_URL = "production.example.invalid";
await mail.sendTeacherPasswordEmail(teacher);
assert.match(
  messages.at(-1).text,
  /https:\/\/production.example.invalid\/teacher-login/,
);
delete env.VERCEL_PROJECT_PRODUCTION_URL;
await mail.sendTeacherPasswordEmail(teacher);
assert.match(messages.at(-1).text, /http:\/\/localhost:3000\/teacher-login/);
await mail.sendStudentPasswordEmail({
  ...teacher,
  studentId: "STUDENT-TEST",
  reason: "welcome",
});
assert.match(messages.at(-1).text, /Student ID: STUDENT-TEST/);
assert.match(messages.at(-1).text, /http:\/\/localhost:3000\/login/);
await mail.sendStudentPasswordEmail({
  ...teacher,
  studentId: "STUDENT-TEST",
  reason: "reset",
});
assert.match(messages.at(-1).subject, /password was reset/);
smtpFails = true;
assert.equal(await mail.sendTeacherPasswordEmail(teacher), false);
smtpFails = false;
delete env.KC_MAIL_SMTP_PASSWORD;
const sentBefore = messages.length;
assert.equal(await mail.sendTeacherPasswordEmail(teacher), false);
assert.equal(messages.length, sentBefore);

let created = [],
  mailed = [],
  cookieValues = {},
  failCreateAt = 0;
const db = {
  from(table) {
    const q = {
      select() {
        return q;
      },
      update() {
        return q;
      },
      insert() {
        return q;
      },
      eq() {
        return q;
      },
      in: async () => ({ data: [], error: null }),
      single: async () => ({ data: { email: teacher.email }, error: null }),
      maybeSingle: async () => ({
        data:
          table === "admin_settings"
            ? { setting_value: "TEST-SCHOOL" }
            : { id: "mock-id" },
        error: null,
      }),
      then(resolve) {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return q;
  },
  auth: {
    admin: {
      createUser: async (input) => {
        created.push(input);
        return failCreateAt === created.length
          ? { data: {}, error: { message: "Simulated creation failure" } }
          : { data: { user: { id: "user-" + created.length } }, error: null };
      },
      deleteUser: async () => ({ error: null }),
    },
  },
};
class Redirect extends Error {}
const mocks = {
  "@/lib/sections": {
    requireSectionMembership: async () => {},
    setStudentSection: async () => {},
  },
  "next/headers": {
    cookies: async () => ({
      set: (key, value) => {
        cookieValues[key] = JSON.parse(value);
      },
    }),
  },
  "next/navigation": {
    redirect: (url) => {
      throw new Redirect(url);
    },
  },
  "next/cache": { revalidatePath() {} },
  "@/lib/auth": { requireAdmin: async () => ({ id: "admin" }) },
  "@/lib/supabase/admin": { createAdminClient: () => db },
  "@/lib/supabase/server": {},
  "sanitize-html": () => {},
  "@/lib/mail": {
    sendTeacherPasswordEmail: async (input) => {
      mailed.push(input);
      return input.email !== "failed@example.invalid";
    },
    sendStudentPasswordEmail: async () => {
      throw Error("Teacher must not receive student email");
    },
  },
};
const { saveAdminEntity } = load("../../src/app/actions/admin.ts", mocks, {
  process: { env: {} },
});
function form(values) {
  const result = new FormData();
  for (const [k, v] of Object.entries(values)) result.set(k, v);
  return result;
}
const fields = {
  entity: "teachers",
  name: teacher.name,
  email: teacher.email,
  teacher_id: teacher.teacherId,
  school_code: "TEST-SCHOOL",
};
await assert.rejects(() => saveAdminEntity(form(fields)), Redirect);
assert.equal(mailed.length, 1);
assert.equal(mailed[0].temporaryPassword, created[0].password);
assert.equal(cookieValues.kc_admin_flash.emailSent, true);
await assert.rejects(
  () => saveAdminEntity(form({ ...fields, id: "existing" })),
  Redirect,
);
assert.equal(mailed.length, 1, "Editing an account must not resend a password");
await assert.rejects(
  () => saveAdminEntity(form({ ...fields, email: "failed@example.invalid" })),
  Redirect,
);
assert.equal(cookieValues.kc_admin_flash.emailSent, false);
assert.ok(
  cookieValues.kc_admin_flash.password,
  "Failed email still leaves credentials for admin",
);

const { importTeachers } = load(
  "../../src/app/actions/admin-import.ts",
  mocks,
  { process: { env: {} } },
);
created = [];
mailed = [];
cookieValues = {};
const rows = [
  { name: "One", email: teacher.email },
  { name: "Two", email: "failed@example.invalid" },
];
await assert.rejects(
  () => importTeachers(form({ rows: JSON.stringify(rows) })),
  Redirect,
);
assert.equal(mailed.length, 2);
assert.equal(cookieValues.kc_admin_import[0].email_sent, true);
assert.equal(cookieValues.kc_admin_import[1].email_sent, false);
for (let i = 0; i < 2; i++)
  assert.equal(mailed[i].temporaryPassword, created[i].password);
created = [];
mailed = [];
failCreateAt = 2;
await assert.rejects(
  () => importTeachers(form({ rows: JSON.stringify(rows) })),
  Redirect,
);
assert.equal(
  mailed.length,
  0,
  "Failed creation batch must not send welcome emails",
);
console.log(
  "PASS: teacher email content and login links, student email compatibility, missing SMTP/failure handling, creation vs edit, bulk recipient passwords/statuses, and no emails for failed batches.",
);

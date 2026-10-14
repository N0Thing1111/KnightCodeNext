// Offline regression checks: rubric round trips, existing API compatibility,
// and result wording. No real student records or notifications are written.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, ...globals, require: name => name in mocks ? mocks[name] : require(name) });
  return exports;
}
const ratings = load('lib/python-ratings.ts');
const contract = load('lib/python-contract.ts');
for (let saved = 0; saved <= 4; saved++) {
  assert.equal(ratings.displayedPythonRating(saved), saved + 1);
  assert.equal(ratings.storedPythonRating(ratings.displayedPythonRating(saved)), saved);
  const converted = ratings.storedPythonRating(saved + 1);
  assert.ok(contract.pythonRequestSchema.safeParse({ op: 'review', submission: '550e8400-e29b-41d4-a716-446655440000', status: 'reviewed', logic: converted, application: converted, correctness: converted, feedback: 'Example feedback' }).success);
}
for (const invalid of [0, 6, 1.5, NaN]) assert.throws(() => ratings.storedPythonRating(invalid));
for (const invalid of [-1, 5, NaN]) assert.throws(() => ratings.displayedPythonRating(invalid));
// Exercise the actual form handler, capturing the request without calling the network.
let posted;
let entries = { submission: '550e8400-e29b-41d4-a716-446655440000', logic: '1', application: '3', correctness: '5', status: 'reviewed', feedback: 'Example feedback' };
const { PythonForm } = load('components/python-forms.tsx', {
  react: { ...React, useState: initial => [initial, () => {}] },
  'next/navigation': { useRouter: () => ({ refresh() {} }) },
  '@/components/python.module.css': {},
  '@/lib/python-ratings': ratings,
  '@/lib/python-contract': contract,
}, {
  FormData: class { *[Symbol.iterator]() { yield* Object.entries(entries); } },
  fetch: async (_url, options) => { posted = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; },
});
await PythonForm({ op: 'review', children: null }).props.onSubmit({ preventDefault() {}, currentTarget: {} });
assert.deepEqual([posted.logic, posted.application, posted.correctness], [0, 2, 4]);
assert.ok(contract.pythonRequestSchema.safeParse(posted).success);
posted = undefined;
entries = { ...entries, logic: '' };
await PythonForm({ op: 'review', children: null }).props.onSubmit({ preventDefault() {}, currentTarget: {} });
assert.equal(posted, undefined, 'An unanswered rating must not be saved as the lowest band');
const { PythonPracticeChecks } = load('components/python-practice-checks.tsx', { '@/components/python.module.css': {} });
const example = { label: 'Reach exactly', inputs: ['50', '20', '30'], expected: '50\n2' };
const result = { label: example.label, expected: example.expected, actual: 'Savings 50', passed: false, error: '' };
const render = props => renderToStaticMarkup(React.createElement(PythonPracticeChecks, { cases: [example], ...props }));
const mismatch = render({ checks: [result] });
assert.match(mismatch, /Output doesn&#x27;t match/);
assert.match(mismatch, /50\n20\n30/);
assert.match(mismatch, /formatting or programming logic/);
assert.doesNotMatch(mismatch, /Check again/);
assert.match(render({ checks: [{ ...result, actual: '50\n2', passed: true }] }), /1 of 1 examples passed/);
assert.match(render({ checks: [{ ...result, error: 'ValueError' }] }), /Program error/);
assert.match(render({}), /Not checked yet/);
assert.match(render({ saved: true }), /No completed practice-check results/);
assert.match(render({ running: true }), /Run in progress/);
assert.match(render({ checks: [result], stale: true }), /edited the code/);
assert.match(render({ checks: [{ ...result, actual: '<script>alert(1)</script>' }] }), /&lt;script&gt;/);
console.log('PASS: all five rubric bands preserve saved ratings and match the API; invalid ratings rejected; practice results distinguish mismatches, errors, pending checks and edited code; output is escaped.');

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const workerSource = readFileSync(
  new URL("../../public/python/runtime-worker.js", import.meta.url),
  "utf8",
);
const activities = JSON.parse(
  readFileSync(
    new URL("../../supabase/python-content/activities.json", import.meta.url),
    "utf8",
  ).replace(/^\uFEFF/, ""),
);
const html = `<!doctype html><meta charset="utf-8"><title>Isolated Python test</title><pre id="out"></pre><script>
window.runTest=(code,answers,cases,wait=0)=>new Promise((resolve,reject)=>{
 const w=new Worker('/python/runtime-worker.js');const buffer=new SharedArrayBuffer(32776);const events=[];let index=0;let output='';
 const timer=setTimeout(()=>{w.terminate();reject(Error('Test timeout: '+JSON.stringify(events)))},90000);
 w.onerror=e=>{clearTimeout(timer);w.terminate();reject(Error(e.message||'Worker error'));};
 w.onmessage=async({data})=>{events.push(data.type);
  if(data.type==='ready')w.postMessage({type:'run',buffer,code,cases});
  if(data.type==='input'){if(index>=answers.length){clearTimeout(timer);w.terminate();reject(Error('Unexpected input request: '+data.prompt));return;}
   await new Promise(r=>setTimeout(r,wait));const bytes=new TextEncoder().encode(answers[index++]);new Uint8Array(buffer,8).set(bytes);const control=new Int32Array(buffer,0,2);Atomics.store(control,1,bytes.length);Atomics.store(control,0,1);Atomics.notify(control,0);
  }
  if(data.type==='output')output+=data.text;
  if(data.type==='done'||data.type==='load-error'){clearTimeout(timer);w.terminate();resolve({...data,events,liveOutput:output});}
 };
});
</script>`;
const server = createServer((req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  if (req.url === "/python/runtime-worker.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src https://cdn.jsdelivr.net 'wasm-unsafe-eval'; connect-src https://cdn.jsdelivr.net; worker-src 'none'",
    );
    res.end(workerSource);
  } else if (req.url === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  } else {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const profile = mkdtempSync(join(tmpdir(), "knightcode-python-runtime-"));
const executable =
  process.env.KC_TEST_BROWSER ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = spawn(
  executable,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    "--user-data-dir=" + profile,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let socket, send;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try {
      port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(
        "\n",
      )[0];
      break;
    } catch {
      await delay(100);
    }
  }
  if (!port) throw Error("Test browser did not start");
  const tabs = await (
    await fetch("http://127.0.0.1:" + port + "/json/list")
  ).json();
  socket = new WebSocket(
    tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((r, j) => {
    socket.onopen = r;
    socket.onerror = j;
  });
  let id = 0;
  const pending = new Map();
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const p = pending.get(m.id);
    if (p) {
      pending.delete(m.id);
      if (m.error) p.reject(Error(m.error.message));
      else p.resolve(m.result);
    }
  };
  send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      socket.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await send("Page.navigate", {
    url: "http://127.0.0.1:" + server.address().port + "/",
  });
  for (let i = 0; i < 50; i++) {
    if (await evaluate('typeof window.runTest === "function"')) break;
    await delay(100);
  }
  assert.equal(await evaluate("crossOriginIsolated"), true);
  const solutions = [
    "quantity=int(input())\nmoney=int(input())\ntotal=35*quantity\nprint(total)\nprint(money-total)",
    'fuel=int(input())\nif fuel<5:\n    print("Low fuel")\nprint("Check complete")',
    'money=int(input())\nif money>=35:\n    print("Buy")\n    print(money-35)\nelse:\n    print("Save more")',
    'balance=int(input())\ndeposit=int(input())\nwithdrawal=int(input())\nbalance+=deposit\nif balance>=withdrawal:\n    print(balance-withdrawal)\nelse:\n    print("Declined")\n    print(balance)',
    "count=int(input())\ntotal=0\nfor i in range(count):\n    total+=int(input())\nprint(total)",
    "target=int(input())\nsavings=0\ndeposits=0\nwhile savings<target:\n    savings+=int(input())\n    deposits+=1\nprint(savings)\nprint(deposits)",
    "visitors=int(input())\ntotal=0\nfor i in range(visitors):\n    age=int(input())\n    if age<12:\n        total+=5\n    else:\n        total+=10\nprint(total)",
  ];
  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    const result = await evaluate(
      `runTest(${JSON.stringify(solutions[i])},${JSON.stringify(a.cases[0].inputs)},${JSON.stringify(a.cases)},${i === 0 ? 1200 : 0})`,
    );
    assert.equal(result.type, "done", JSON.stringify(result));
    assert.equal(result.error, "", JSON.stringify(result));
    assert.equal(result.checks.length, 3);
    assert.ok(
      result.checks.every((c) => c.passed),
      JSON.stringify(result),
    );
    assert.equal(result.output.trim(), a.cases[0].expected);
    assert.ok(result.events.includes("input"));
    console.log(
      "PASS activity " + (i + 1) + " interactive input and all examples",
    );
  }
  const bad = await evaluate(`runTest("if True\\n print(1)",[],[])`);
  assert.match(bad.error, /SyntaxError/);
  console.log("PASS syntax error capture");
  const restricted = await evaluate(
    `runTest("import js\\nprint(js.fetch is None)\\nprint(js.indexedDB is None)\\nprint(js.postMessage is None)",[],[])`,
  );
  assert.equal(restricted.output.trim(), "True\nTrue\nTrue");
  console.log(
    "PASS no exposed fetch, browser database, or raw worker messaging",
  );
  console.log(
    "PASS standalone isolated worker checks; no app login, database, or real student records used.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (send && socket?.readyState === WebSocket.OPEN) {
    try {
      await send("Browser.close");
    } catch {}
  }
  socket?.close();
  browser.kill();
  server.close();
  console.log("Temporary browser profile: " + profile);
}

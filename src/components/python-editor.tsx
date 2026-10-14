"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pythonRequestSchema, type PythonActivity, type PythonResult } from "@/lib/python-contract";
import { PythonPracticeChecks } from "@/components/python-practice-checks";
import { PythonCodeEditor } from "@/components/python-code-editor";
import styles from "@/components/python.module.css";

async function api(body: unknown) {
  const response = await fetch("/api/python", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Saving failed.");
  return result;
}
type Pending = {
  op: "finish";
  id: string;
  status: "finished" | "error" | "stopped" | "timeout";
  result: PythonResult;
};
export function PythonEditor({
  activity,
  studentId,
  initialSource,
  initialRun = null,
}: {
  activity: PythonActivity;
  studentId: string;
  initialSource: string;
  initialRun?: { id: string; source: string } | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialSource);
  const [busy, setBusy] = useState(false);
  const [canStop, setCanStop] = useState(false);
  const [message, setMessage] = useState(
    "Your draft is loaded. Run saves the submitted source before executing it.",
  );
  const [transcript, setTranscript] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [checks, setChecks] = useState<PythonResult["checks"]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [lastRun, setLastRun] = useState<{ id: string; source: string } | null>(
    initialRun,
  );
  const [saving, setSaving] = useState(false);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buffer = useRef<SharedArrayBuffer | null>(null);
  const current = useRef<{
    id: string;
    source: string;
    output: string;
    inputs: string[];
    elapsed: number;
    resumed: number;
    budget: number;
  } | null>(null);
  const mounted = useRef(true);
  const recoveryKey = "kc-python-recovery:" + studentId + ":" + activity.id;
  const hydrated = useRef(false);
  const savedSource = useRef(initialSource);
  const allowLeave = useRef(false);
  const unsaved = useRef(false);
  // A tab-local recovery copy is scoped to the signed-in student and activity.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = sessionStorage.getItem(recoveryKey);
        if (raw) {
          const restored = JSON.parse(raw);
          if (typeof restored.source === "string" && restored.source.length <= 32768) {
            setCode(restored.source);
            const checked = pythonRequestSchema.safeParse(restored.pending);
            if (checked.success && checked.data.op === "finish") {
              setPending(checked.data);
              const run = restored.lastRun;
              setLastRun(run?.id === checked.data.id && typeof run.source === "string" && run.source.length <= 32768 ? run : null);
            }
            setMessage("Recovered work from this browser tab. Save your draft or retry saving the pending result.");
          }
        }
      } catch { /* A blocked/full browser store does not prevent editing. */ }
      hydrated.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [recoveryKey]);
  useEffect(() => {
    unsaved.current = code !== savedSource.current || !!pending || saving || busy;
    if (!hydrated.current) return;
    try {
      if (code !== savedSource.current || pending) sessionStorage.setItem(recoveryKey, JSON.stringify({ source: code, pending, lastRun }));
      else sessionStorage.removeItem(recoveryKey);
    } catch { /* The exit warning remains available if browser storage is unavailable. */ }
  }, [code, pending, saving, busy, recoveryKey, lastRun]);
  function kill() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    worker.current?.terminate();
    worker.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    const warn = (event: BeforeUnloadEvent) => {
      if (!allowLeave.current && (worker.current || unsaved.current)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || !unsaved.current) return;
      const url = new URL(link.href, location.href);
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      if (confirm("You have unsaved Python work or a result still waiting to save. Stay here to save it. Leave anyway?")) {
        allowLeave.current = true;
        location.assign(url.href);
      }
    };
    document.addEventListener("click", leave, true);
    window.addEventListener("beforeunload", warn);
    return () => {
      mounted.current = false;
      kill();
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
    };
  }, []);
  async function saveResult(payload: Pending) {
    setSaving(true);
    try {
      await api(payload);
      if (!mounted.current) return;
      setPending(null);
      router.refresh();
      setMessage(
        "Run saved. Review the result, revise, or submit this Run to your teacher.",
      );
    } catch (error) {
      if (!mounted.current) return;
      setPending(payload);
      setMessage(
        (error as Error).message +
          " Your result remains here. Retry saving before another Run.",
      );
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  function pauseClock() {
    if (timer.current) clearTimeout(timer.current);
    const c = current.current;
    if (c?.resumed) {
      const elapsed = performance.now() - c.resumed;
      c.elapsed += elapsed;
      c.budget -= elapsed;
      c.resumed = 0;
    }
  }
  function startClock() {
    const c = current.current;
    if (!c) return;
    c.resumed = performance.now();
    timer.current = setTimeout(
      () =>
        void finish(
          "timeout",
          "Execution stopped after ten seconds of active execution.",
        ),
      Math.max(1, c.budget),
    );
  }
  async function finish(
    status: Pending["status"],
    error = "",
    details?: PythonResult,
  ) {
    const c = current.current;
    if (!c) return;
    pauseClock();
    kill();
    current.current = null;
    setBusy(false);
    setCanStop(false);
    setPrompt(null);
    if (error) setTranscript((t) => t + "\n" + error);
    const result: PythonResult = details || {
      output: c.output,
      error,
      inputs: c.inputs,
      checks: [],
      elapsed_ms: 0,
    };
    result.elapsed_ms = Math.min(120000, Math.round(c.elapsed));
    setChecks(result.checks);
    setLastRun({ id: c.id, source: c.source });
    const payload: Pending = { op: "finish", id: c.id, status, result };
    setPending(payload);
    await saveResult(payload);
  }
  async function run() {
    if (busy || saving || pending) return;
    if (
      !window.crossOriginIsolated ||
      typeof SharedArrayBuffer === "undefined"
    ) {
      setMessage(
        "Interactive Python needs an isolated page. Open this page with a full browser reload in current Edge or Chrome. If it persists, the Python response headers need checking.",
      );
      return;
    }
    if (!code.trim()) {
      setMessage("Write a program first.");
      return;
    }
    setBusy(true);
    setChecks([]);
    setLastRun(null);
    setTranscript("");
    setMessage("Saving source code...");
    const id = crypto.randomUUID();
    try {
      await api({ op: "start", activity: activity.id, revision: activity.revision, id, source: code });
      savedSource.current = code;
      if (!mounted.current) return;
      current.current = {
        id,
        source: code,
        output: "",
        inputs: [],
        elapsed: 0,
        resumed: 0,
        budget: 10000,
      };
      setCanStop(true);
      setMessage("Loading Python. The first download can take a little while.");
      buffer.current = new SharedArrayBuffer(32776);
      const w = new Worker("/python/runtime-worker.js");
      worker.current = w;
      timer.current = setTimeout(
        () =>
          void finish(
            "error",
            "Python could not load within two minutes. Check the network/CDN connection.",
          ),
        120000,
      );
      w.onerror = () =>
        void finish(
          "error",
          "The Python worker could not start. Check the browser connection and try again.",
        );
      w.onmessage = ({ data }) => {
        if (worker.current !== w || !current.current) return;
        if (data.type === "ready") {
          if (timer.current) clearTimeout(timer.current);
          setMessage("Running. Your teacher can review this Run.");
          startClock();
          w.postMessage({
            type: "run",
            code: current.current.source,
            buffer: buffer.current,
            cases: activity.content.cases,
          });
        } else if (data.type === "input") {
          pauseClock();
          setPrompt(String(data.prompt));
          setAnswer("");
          setMessage(
            "Waiting for your answer. Waiting time does not count toward the execution limit.",
          );
          setTranscript((t) => t + String(data.prompt));
        } else if (data.type === "resumed") {
          startClock();
          setMessage("Running...");
        } else if (data.type === "output") {
          const text = String(data.text || "");
          if (current.current.output.length + text.length > 20000) {
            void finish("stopped", "Output limit reached.");
            return;
          }
          current.current.output += text;
          setTranscript((t) => t + text);
        } else if (data.type === "checking") {
          setMessage("Checking the example situations...");
        } else if (data.type === "done") {
          void finish(
            data.error ? "error" : "finished",
            String(data.error || ""),
            {
              output: String(data.output || "").slice(0, 20000),
              error: String(data.error || "").slice(0, 6000),
              inputs: current.current.inputs,
              checks: data.checks || [],
              elapsed_ms: 0,
            },
          );
        } else if (data.type === "load-error") {
          void finish("error", String(data.error));
        }
      };
    } catch (error) {
      if (current.current) await finish("error", (error as Error).message);
      else {
        setBusy(false);
        setMessage((error as Error).message + " Nothing ran.");
      }
    }
  }
  function sendAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (!buffer.current || !current.current || prompt === null) return;
    if (answer.length > 4096) {
      setMessage("Use an answer shorter than 4,097 characters.");
      return;
    }
    const bytes = new TextEncoder().encode(answer);
    const control = new Int32Array(buffer.current, 0, 2);
    new Uint8Array(buffer.current, 8).set(bytes);
    current.current.inputs.push(answer);
    setTranscript((t) => t + answer + "\n");
    setPrompt(null);
    Atomics.store(control, 1, bytes.length);
    Atomics.store(control, 0, 1);
    Atomics.notify(control, 0);
  }
  async function draft() {
    setSaving(true);
    try {
      await api({ op: "draft", activity: activity.id, source: code });
      savedSource.current = code;
      setMessage("Draft saved to your account.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function submit() {
    if (!lastRun || lastRun.source !== code) return;
    setSaving(true);
    try {
      await api({ op: "submit", id: lastRun.id });
      router.refresh();
      setMessage(
        "Submitted for teacher review. Further revisions create separate Runs and submissions.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
    <section className={styles.card}>
      <span className={styles.kicker}>CODING WORKSPACE</span>
      <h2>Write, run, and improve</h2>
      <p>
        Write your program on the left. Output appears on the right. When Python
        asks for input, enter your answer below the output.
      </p>
      <div className={styles.grid}>
        <div>
          <label className={styles.paneTitle} htmlFor="python-source">
            Your Python program
          </label>
          <PythonCodeEditor value={code} onChange={setCode} readOnly={busy} />
        </div>
        <div>
          <h3 className={styles.paneTitle}>Output & input</h3>
          <pre className={styles.terminal} aria-label="Program output">
            {transcript || "Run your program to see its output here."}
          </pre>
          {prompt !== null && (
            <form onSubmit={sendAnswer}>
              <label htmlFor="python-answer">
                {prompt || "Enter your answer"}
              </label>
              <input
                id="python-answer"
                autoFocus
                value={answer}
                maxLength={4096}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <button className={styles.primary} type="submit">
                Enter answer
              </button>
            </form>
          )}
        </div>
      </div>
      <div className={styles.actions} aria-label="Python program actions">
        <button
          className={styles.primary}
          disabled={busy || saving || !!pending}
          onClick={run}
        >
          Run Python
        </button>
        <button
          className={styles.stop}
          disabled={!canStop}
          onClick={() => void finish("stopped", "Stopped by the student.")}
        >
          Stop
        </button>
        <button disabled={busy || saving || !!pending} onClick={draft}>
          Save draft
        </button>

        <button
          disabled={busy || saving || !!pending}
          className={styles.quiet}
          onClick={() => {
            if (
              confirm(
                "Replace your editor contents with the starter code? Saved Runs remain in your history.",
              )
            )
              setCode(activity.content.starter);
          }}
        >
          Reset editor
        </button>
        {pending && (
          <button disabled={saving} onClick={() => void saveResult(pending)}>
            Retry saving result
          </button>
        )}
      </div>
      <p className={styles.notice} role="status">
        {message}
      </p>
      <p>
        Run records your coding process; Submit sends that Run for review. Save
        your draft before leaving. Closing during execution may leave a Run
        marked “Result pending.”
      </p>
    </section>
    <PythonPracticeChecks cases={activity.content.cases} checks={checks} running={busy} stale={checks.length > 0 && lastRun?.source !== code} />
    <section className={styles.card + " " + styles.submissionSection} aria-label="Submit your work">
      <span className={styles.kicker}>SUBMISSION</span>
      <h2>Submit your work</h2>
      <p>Ready for your teacher to review your approach? Submit your latest saved Run. Practice checks are guidance; you can submit a Run even if some examples do not pass.</p>
      <p>{pending ? "Save the pending result before submitting." : !lastRun ? "Run your program and wait for its result to save first." : lastRun.source !== code ? "Your code has changed. Run it again before submitting this version." : "Your latest saved Run is ready to submit."}</p>
      <div className={styles.actions}>
        <button
          disabled={
            busy || saving || !!pending || !lastRun || lastRun.source !== code
          }
          className={styles.submit}
          onClick={submit}
        >
          Submit this Run
        </button>
        <a href="#history">View submissions and teacher feedback</a>
      </div>
      <p>After submitting, open that Run in the history below to read its teacher feedback.</p>
    </section>
    </>
  );
}

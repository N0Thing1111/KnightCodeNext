import type { PythonContent, PythonResult } from "@/lib/python-contract";
import styles from "@/components/python.module.css";

export function PythonPracticeChecks({ cases, checks = [], running = false, stale = false, saved = false }: {
  cases: PythonContent["cases"];
  checks?: PythonResult["checks"];
  running?: boolean;
  stale?: boolean;
  saved?: boolean;
}) {
  const passed = checks.filter(check => check.passed && !check.error).length;
  return (
    <section className={styles.card} aria-label="Check your solution">
      <span className={styles.kicker}>PRACTICE FEEDBACK</span>
      <h2>Check your solution</h2>
      <p>After your interactive program finishes without an error, the same code runs again with each example input below. These inputs may differ from the ones you entered in the terminal.</p>
      <p className={styles.notice}>These checks compare printed output; they do not grade your programming logic. Your teacher reviews your code separately. Print the words, numbers, and line breaks requested by the task. Extra labels or messages can cause an output mismatch. Surrounding whitespace is ignored.</p>
      <p className={styles.checkSummary} role="status">
        {running ? "Run in progress. Example results will appear when it finishes." : checks.length
          ? `${passed} of ${cases.length} practice checks successful. Open an example to compare its input and output.`
          : saved ? "No completed practice-check results were saved for this Run. This is not a failed check or a grade."
          : "Not checked yet. You can inspect the examples now, then use Run Python to check your solution."}
      </p>
      {stale && <p className={styles.notice}>You have edited the code since these results. Run Python again to check your changes.</p>}
      <div className={styles.checkList}>
        {cases.map((example, index) => {
          const check = checks[index];
          const kind = !check ? "pending" : check.error ? "error" : check.passed ? "passed" : "mismatch";
          const label = { pending: "Not checked", error: "Program error", passed: "Successful", mismatch: "Output doesn't match" }[kind];
          return (
            <details className={styles.checkItem} key={index}>
              <summary><span className={styles.checkTitle}>Example {index + 1}: {example.label}</span><span className={styles.checkStatus} data-result={kind}>{label}</span></summary>
              <div className={styles.checkBody}>
                <div className={styles.comparison}>
                  <div><h3>Test input</h3><small>Answers supplied in this order</small><pre>{example.inputs.join("\n") || "(No input required)"}</pre></div>
                  <div><h3>Expected output</h3><small>What the task asks the program to print</small><pre>{(check?.expected ?? example.expected) || "(No printed output expected)"}</pre></div>
                  <div><h3>Your output for this example</h3><small>Output from this test, not your terminal session</small><pre>{check ? check.actual || "(No output)" : "Run Python to see this example's output."}</pre></div>
                </div>
                {kind === "mismatch" && <p>The printed output differs. Compare the values, wording, and line order above. A mismatch alone does not tell you whether the issue is formatting or programming logic.</p>}
                {check?.error && <div><h3>Error in this example</h3><p>The program could not finish this example. Read the error, revise your code, and try again.</p><pre>{check.error}</pre></div>}
                {kind === "passed" && <p>The printed output matches this example. This is not an activity grade. Your teacher decides Passed or Needs revision.</p>}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { previewRunHistory, clearRunHistory } from "@/app/actions/admin-run-history";
import { historyCategories, type HistoryFilters, type HistoryCleanupResponse } from "@/lib/run-history-contract";
import styles from "./run-history-cleanup.module.css";

export function RunHistoryCleanup({ students, sections, defaultBefore, maxBefore }: {
  students: { id: string; name: string; email?: string; class_id: number }[];
  sections: { id: number; name: string }[];
  defaultBefore: string;
  maxBefore: string;
}) {
  const [filters, setFilters] = useState<HistoryFilters>({ kind: "python_practice", before: defaultBefore, student: "", section: "" });
  const [response, setResponse] = useState<HistoryCleanupResponse>({});
  const [busy, setBusy] = useState(false);
  const category = historyCategories.find(c => c.value === filters.kind)!;
  const visibleStudents = students.filter(s => !filters.section || s.class_id === Number(filters.section));
  function change(next: Partial<HistoryFilters>) {
    setFilters(previous => ({ ...previous, ...next }));
    setResponse({});
  }
  async function submit(event: FormEvent<HTMLFormElement>, execute = false) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    for (const [key, value] of Object.entries(filters)) data.set(key, value);
    if (execute) data.set("proof", response.proof || "");
    setBusy(true);
    try {
      setResponse(await (execute ? clearRunHistory(data) : previewRunHistory(data)));
    } catch {
      setResponse({ error: execute ? "Cleanup was not confirmed. Check Audit history before retrying." : "Could not load the preview. Try again." });
    } finally {
      if (execute) form.reset();
      setBusy(false);
    }
  }
  const preview = response.preview;
  return <div className={styles.root}>
    <section className="teacher-card">
      <h3>Run history cleanup</h3>
      <p className="admin-note">Clear old history without resetting students. Game progress, XP, achievements, Python drafts, submissions, teacher reviews, and assignment completion stay intact. Download a save file first if you may need the original code later.</p>
      <form onSubmit={event => submit(event)}>
        <fieldset disabled={busy} className={`admin-form ${styles.fields}`}>
          <legend className={styles.legend}>1. Choose the history to clear</legend>
          <label className="wide">History category
            <select value={filters.kind} onChange={e => change({ kind: e.target.value as HistoryFilters["kind"] })}>
              {historyCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <p className={`admin-note wide ${styles.description}`}>{category.description}</p>
          <label>Last activity before (Philippine date)
            <input type="date" required value={filters.before} max={maxBefore} onChange={e => change({ before: e.target.value })} />
          </label>
          <label>Section
            <select value={filters.section} onChange={e => change({ section: e.target.value, student: "" })}>
              <option value="">All sections, including unassigned students</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="wide">Student
            <select value={filters.student} onChange={e => change({ student: e.target.value })}>
              <option value="">All students in the selection</option>
              {visibleStudents.map(s => <option key={s.id} value={s.id}>{s.name} — {s.email || ""}</option>)}
            </select>
          </label>
          <p className="admin-note wide">The cutoff excludes its entire date and anything newer. Recent activity within 24 hours and Python Runs still awaiting results are protected. Section filtering uses current enrolment. Each confirmation affects at most 500 records.</p>
          <button className="teacher-btn" type="submit">{busy ? "Please wait…" : "Preview matching history"}</button>
        </fieldset>
      </form>
    </section>
    <div aria-live="polite">
      {response.error && <p role="alert" className="teacher-alert error">{response.error}</p>}
      {response.notice && <p role="status" className="teacher-alert success">{response.notice}</p>}
    </div>
    {preview && <section className="teacher-card">
      <h3>2. Review this selection</h3>
      <p><strong>{category.label}</strong> · Before {filters.before} (Philippine time)</p>
      <p><strong>{preview.count}</strong> {filters.kind.startsWith("game_") ? "sessions" : "Runs"} in this batch; {preview.total} matching in total.
        {filters.kind.startsWith("game_") && ` Their ${preview.executions} command records will also be deleted.`}
      </p>
      <p className="admin-note">{preview.count ? "Sample below: the first 10 records in this batch. The selection is checked again when you confirm." : "Nothing matches these filters. No history will be changed."}</p>
      {preview.sample.length > 0 && <div className="teacher-table-wrap" tabIndex={0} role="region" aria-label="Cleanup preview">
        <table className={`teacher-table ${styles.table}`}>
          <thead><tr><th>Student</th><th>Level / activity</th><th>Status</th><th>Last activity (PH)</th></tr></thead>
          <tbody>{preview.sample.map(row => <tr key={row.id}>
            <td>{row.student}<small className={styles.secondary}>{row.student_number}</small></td>
            <td>{row.item}</td><td>{row.status}</td>
            <td>{new Date(row.last_activity).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {preview.count > 0 && <form className={styles.confirm} onSubmit={event => submit(event, true)}>
        <fieldset disabled={busy} className={`admin-form ${styles.fields}`}>
          <legend className={styles.legend}>3. Confirm this batch</legend>
          <p className="admin-note wide">{filters.kind === "python_submitted"
            ? "The original code and execution details cannot be recovered without an earlier save file. Submissions, reviews, and completion will remain visible."
            : "Deleted history cannot be recovered without an earlier save file. This is separate from resetting learning records."}</p>
          <label>Type CLEAR RUN HISTORY<input name="confirmation" autoComplete="off" required pattern="CLEAR RUN HISTORY" /></label>
          <label>Your administrator password<input type="password" name="admin_password" autoComplete="current-password" required /></label>
          <button className="teacher-btn" type="submit">{busy ? "Please wait…" : filters.kind === "python_submitted" ? "Clear submitted code/output" : "Delete this batch of history"}</button>
        </fieldset>
      </form>}
    </section>}
  </div>;
}

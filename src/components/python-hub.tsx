import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPythonActivities, getPythonRoster } from "@/lib/python-data";
import { PythonPracticeChecks } from "@/components/python-practice-checks";
import { displayedPythonRating, pythonRatingBands, pythonRatingCriteria } from "@/lib/python-ratings";
import { PythonForm } from "@/components/python-forms";
import type { Profile } from "@/types/database";
import type { PythonRun } from "@/lib/python-contract";
import { pythonRunStatusLabel } from "@/lib/python-run-status";
import styles from "@/components/python.module.css";
const when = (value: string) =>
  new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
export async function PythonHub({
  actor,
  params = {},
  lessonId,
}: {
  actor: Profile;
  lessonId?: number;
  params: Record<string, string | undefined>;
}) {
  const allActivities = await getPythonActivities();
  const activities = allActivities?.filter(
    (a) => !lessonId || a.lesson_id === lessonId,
  );
  if (!activities)
    return (
      <div className={styles.root} id="history">
        <h1>Python activities</h1>
        <p className={styles.notice}>
          Python activities are not enabled yet. The new database migrations
          need to be applied before use. Existing game features continue to
          work.
        </p>
      </div>
    );
  const db = await createClient();
  const staff = actor.role !== "student";
  const base =
    actor.role === "admin"
      ? "/admin/results"
      : staff
        ? "/teacher/results"
        : `/lesson/${lessonId}/python`;
  const roster = staff
    ? await getPythonRoster(actor)
    : { students: [], sections: [] };
  const q = (params.q || "").trim().toLowerCase();
  const section = Number(params.section) || 0;
  let students = roster.students.filter(
    (s) =>
      (!section || s.class_id === section) &&
      (!q || `${s.name} ${s.student_id} ${s.email}`.toLowerCase().includes(q)),
  );
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.page || "1", 10) || 1),
  );
  let query = db
    .from("python_runs")
    .select("*", { count: "exact" })
    .order("sequence", { ascending: false });
  if (staff && (q || section || params.student))
    query = query.in(
      "student_id",
      params.student
        ? students.filter((s) => s.id === params.student).map((s) => s.id)
        : students.length
          ? students.map((s) => s.id)
          : ["00000000-0000-0000-0000-000000000000"],
    );
  if (params.activity && activities.some((a) => a.id === params.activity))
    query = query.eq("activity_id", params.activity);
  if (!staff)
    query = query.in(
      "activity_id",
      activities.map((a) => a.id),
    );
  const result = await query.range((page - 1) * 20, page * 20 - 1);
  if (result.error) throw Error(result.error.message);
  const runs = (result.data || []) as PythonRun[];
  // A notification may refer to an older Run outside the current results page.
  let selected: PythonRun | undefined;
  if (
    params.run &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.run,
    )
  ) {
    const detail = await db
      .from("python_runs")
      .select("*")
      .eq("id", params.run)
      .maybeSingle();
    if (detail.error) throw Error(detail.error.message);
    selected = detail.data as PythonRun | undefined;
    if (
      selected &&
      !staff &&
      !activities.some((a) => a.id === selected?.activity_id)
    )
      selected = undefined;
  }
  const visibleRuns = selected ? [...runs, selected] : runs;
  // RLS selected these Runs first; profile lookup reveals names only for authorized rows.
  if (staff && visibleRuns.length) {
    const ids = [...new Set(visibleRuns.map((r) => r.student_id))];
    const profiles = await createAdminClient()
      .from("profiles")
      .select("id,name,student_id,email")
      .in("id", ids);
    if (profiles.error) throw Error(profiles.error.message);
    students = [
      ...roster.students,
      ...(profiles.data || [])
        .filter((p) => !roster.students.some((s) => s.id === p.id))
        .map((p) => ({ ...p, class_id: 0 })),
    ];
  }
  const runIds = [...new Set(visibleRuns.map((r) => r.id))];
  const submissions = runIds.length
    ? await db.from("python_submissions").select("*").in("run_id", runIds)
    : { data: [], error: null };
  if (submissions.error) throw Error(submissions.error.message);

  let previous: PythonRun | undefined;
  if (selected) {
    const p = await db
      .from("python_runs")
      .select("*")
      .eq("student_id", selected.student_id)
      .eq("activity_id", selected.activity_id)
      .lt("sequence", selected.sequence)
      .order("sequence", { ascending: false })
      .limit(1);
    if (p.error) throw Error(p.error.message);
    previous = p.data?.[0] as PythonRun | undefined;
  }
  const submission = (submissions.data || []).find(
    (s) => s.run_id === selected?.id,
  );
  const reviews = submission
    ? await db
        .from("python_reviews")
        .select("*")
        .eq("submission_id", submission.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };
  if (reviews.error) throw Error(reviews.error.message);
  const url = (overrides: Record<string, string>) => {
    const search = new URLSearchParams(
      Object.fromEntries(
        Object.entries({
          ...params,
          ...(staff ? { type: "python" } : {}),
          ...overrides,
        }).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    );
    return base + "?" + search.toString();
  };
  return (
    <div className={styles.root} id="history">
      <section className={styles.card}>
        <h2>{staff ? "Python runs" : "Your Python runs and feedback"}</h2>
        {staff && (
          <form className={styles.filterForm} method="get" action={base}>
            {staff && <input type="hidden" name="type" value="python" />}
            <div className={styles.filters}>
              {staff && (
                <>
                  <label>
                    Student name, ID, or email
                    <input
                      name="q"
                      defaultValue={params.q}
                      placeholder="Name, student ID, or email"
                    />
                  </label>
                  <label>
                    Section
                    <select name="section" defaultValue={params.section || ""}>
                      <option value="">All sections</option>
                      {roster.sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label>
                Activity
                <select name="activity" defaultValue={params.activity || ""}>
                  <option value="">All activities</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.content.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.actions}>
              <button>Search / filter</button>
              <a href={staff ? base + "?type=python" : base}>Clear filters</a>
            </div>
          </form>
        )}
        <p className={styles.tableHint}>
          Times are shown in Philippine time. Scroll the table sideways on
          smaller screens.
        </p>
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Python run history"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Started</th>
                {staff && <th>Student</th>}
                <th>Activity</th>
                <th>Run outcome</th>
                <th>Submission</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>
                    <time dateTime={r.started_at}>
                      {new Date(r.started_at).toLocaleDateString("en-PH", {
                        timeZone: "Asia/Manila",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      <small>
                        {new Date(r.started_at).toLocaleTimeString("en-PH", {
                          timeZone: "Asia/Manila",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </small>
                    </time>
                  </td>
                  {staff && (
                    <td className={styles.studentCell}>
                      <strong>
                        {students.find((s) => s.id === r.student_id)?.name ||
                          "Student"}
                      </strong>
                      <small>
                        {
                          students.find((s) => s.id === r.student_id)
                            ?.student_id
                        }
                      </small>
                    </td>
                  )}
                  <td className={styles.activityCell}>
                    <span className={styles.badge}>Python</span>
                    <strong>{r.activity_snapshot.content.title}</strong>
                    <small>Revision {r.activity_snapshot.revision}</small>
                  </td>
                  <td>
                    <span className={styles.status} data-status={r.status}>
                      {pythonRunStatusLabel(r)}
                    </span>
                    {r.result.history_cleared_at && <small>Code/output cleared</small>}
                  </td>
                  <td>
                    {submissions.data?.some((s) => s.run_id === r.id)
                      ? "Submitted"
                      : "Practice Run"}
                  </td>
                  <td>
                    <a
                      className={styles.button}
                      href={url({ run: r.id }) + "#run-review"}
                    >
                      Review Run
                    </a>
                  </td>
                </tr>
              ))}
              {!runs.length && (
                <tr>
                  <td colSpan={staff ? 6 : 5} className={styles.empty}>
                    No runs match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.tableFooter}>
          <p>
            {result.count || 0} Runs · Page {page}
          </p>
          <nav aria-label="Run history pages">
            {page > 1 && (
              <a href={url({ page: String(page - 1), run: "" })}>
                Previous page{" "}
              </a>
            )}
            {page * 20 < (result.count || 0) && (
              <a href={url({ page: String(page + 1), run: "" })}>Next page</a>
            )}
          </nav>
        </div>
      </section>
      {selected && (
        <>
        <section className={styles.card} id="run-review">
          <h2>{selected.activity_snapshot.content.title}: Run review</h2>
          {staff && (
            <p>
              Student:{" "}
              {students.find((s) => s.id === selected.student_id)?.name ||
                "Student"}{" "}
              · {students.find((s) => s.id === selected.student_id)?.student_id}
            </p>
          )}
          <p>
            {pythonRunStatusLabel(selected)} · Original activity revision{" "}
            {selected.activity_snapshot.revision}.{" "}
            {selected.result.elapsed_ms !== undefined
              ? `Active execution: ${(selected.result.elapsed_ms / 1000).toFixed(2)} seconds (excludes waiting for input).`
              : ""}
          </p>
          {selected.result.history_cleared_at && <p className={styles.notice}>Code, input answers, output, and example-check details were cleared by an administrator on {when(selected.result.history_cleared_at)}. The submission and teacher feedback below were preserved.</p>}
          <details>
            <summary>Instructions used for this Run</summary>
            <p>{selected.activity_snapshot.content.instructions}</p>
          </details>
          {!selected.result.history_cleared_at && <>
          <div className={styles.grid}>
            <div>
              <h3>Previous retained Run</h3>
              <pre>
                {previous?.result.history_cleared_at
                  ? "Code/output for this earlier Run was cleared by an administrator."
                  : previous?.source || "No earlier retained Run for this activity."}
              </pre>
            </div>
            <div>
              <h3>This Run</h3>
              <pre>{selected.source}</pre>
            </div>
          </div>
          {previous && !previous.result.history_cleared_at && (
            <p>
              {previous.source === selected.source
                ? "The source is unchanged from the previous Run."
                : "The source changed. Compare both versions above."}
            </p>
          )}
          <div className={styles.grid}>
            <div>
              <h3>Input answers, in order</h3>
              <pre>
                {selected.result.inputs
                  ?.map((value, i) => `${i + 1}. ${value}`)
                  .join("\n") || "No saved answers"}
              </pre>
            </div>
            <div>
              <h3>Printed output</h3>
              <pre>{selected.result.output || "No saved output"}</pre>
              {selected.result.error && (
                <>
                  <h3>Error / interruption</h3>
                  <pre>{selected.result.error}</pre>
                </>
              )}
            </div>
          </div>
          </>}
          </section>
          {!selected.result.history_cleared_at && <PythonPracticeChecks
            cases={selected.activity_snapshot.content.cases}
            checks={selected.result.checks}
            saved
          />}
          <section className={styles.card} aria-label="Submission status">
            <span className={styles.kicker}>SUBMISSION</span>
            <h2>{submission ? "Submitted for teacher review" : "Practice Run — not submitted"}</h2>
            <p>{submission
              ? `Submitted ${when(submission.submitted_at)}. Reviews below belong to this submission. Each resubmission keeps its own review history.`
              : "Running code saves practice history. It does not submit your work for marking. Use Submit this Run in the coding workspace when you are ready."}</p>
          </section>
          <section className={`${styles.card} ${styles.feedbackSection}`} aria-label="Teacher feedback">
            <span className={styles.kicker}>TEACHER REVIEW</span>
            <h2>Teacher feedback</h2>
            <p>Your teacher evaluates your programming logic, use of the lesson concept, and correctness. Practice-check results are separate from these ratings.</p>
            {!submission && <p className={styles.notice}>This Run has not been submitted, so it has no teacher review yet.</p>}
            {submission && !reviews.data?.length && <p className={styles.notice}>Awaiting teacher review. Your submission is saved; no rating has been given yet.</p>}
            {reviews.data?.map((r, index) => (
              <article className={styles.reviewCard} key={r.id}>
                <div className={styles.reviewHeading}>
                  <h3>{index === 0 ? "Latest feedback" : "Earlier feedback"}</h3>
                  <span className={styles.status}>{r.status === "passed" ? "Passed" : r.status === "needs_revision" ? "Needs revision" : "No outcome recorded"}</span>
                </div>
                <p>Reviewed by <strong>{r.reviewer_name}</strong> · {when(r.created_at)}</p>
                <div className={styles.ratings}>
                  {pythonRatingCriteria.map(({ key, label }) => (
                    <div className={styles.rating} key={key}>
                      <span>{label}</span>
                      <strong>{displayedPythonRating(r[key])}<small> / 5</small></strong>
                      <small>{pythonRatingBands[r[key]]}</small>
                    </div>
                  ))}
                </div>
                <p>Rubric total: <strong>{displayedPythonRating(r.logic) + displayedPythonRating(r.application) + displayedPythonRating(r.correctness)} / 15</strong>. Each criterion uses a 1–5 rating; the review outcome is set by your teacher.</p>
                <div className={styles.writtenFeedback}>
                  <h3>Teacher&apos;s comments</h3>
                  <p>{r.feedback}</p>
                </div>
              </article>
            ))}
            {staff && submission && selected.result.history_cleared_at && <p className={styles.notice}>Existing feedback is retained. New reviews are unavailable here because the original code has been cleared.</p>}
            {staff && submission && !selected.result.history_cleared_at && (
              <div className={styles.reviewForm}>
                <h3>Write a review</h3>
                <PythonForm op="review" submitLabel="Save review and notify student">
                  <input type="hidden" name="submission" value={submission.id} />
                  <label>Review outcome
                    <select name="status" required defaultValue="">
                      <option value="" disabled>Choose an outcome</option>
                      <option value="passed">Passed</option>
                      <option value="needs_revision">Needs revision</option>
                    </select>
                  </label>
                  <p>Rate each criterion from 1 to 5 using the descriptions below. Do not deduct points just for extra Runs or longer time. The total does not automatically set the review outcome.</p>
                  <div className={styles.ratings}>
                    {pythonRatingCriteria.map(({ key, label, description }) => (
                      <label key={key}>{label}
                        <small>{description}</small>
                        <select name={key} required defaultValue="">
                          <option value="" disabled>Choose a rating</option>
                          {pythonRatingBands.map((band, i) => <option value={i + 1} key={band}>{i + 1} — {band}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <label>Feedback<textarea name="feedback" required maxLength={4000} placeholder="Explain what worked and the next step the student should take." /></label>
                </PythonForm>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

import { getStudentLearningData } from "@/lib/student-data";
import { getStudentSection } from "@/lib/student-section";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPythonActivities } from "@/lib/python-data";
import { PythonEditor } from "@/components/python-editor";
import { PythonHub } from "@/components/python-hub";
import styles from "@/components/python.module.css";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const student = await requireStudent();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const activity = (await getPythonActivities())?.find(
    (a) => a.lesson_id === id,
  );
  if (!activity) notFound();
  const learning = await getStudentLearningData(student.id);
  if (!learning.scope.fullLessonIds.has(id)) notFound();
  const independent = learning.scope.independent;
  const section = await getStudentSection();
  const db = await createClient();
  const [access, draft, lesson, latest, workflow] = await Promise.all([
    db.rpc("python_can_start", { p_activity: activity.id }),
    db
      .from("python_drafts")
      .select("source")
      .eq("activity_id", activity.id)
      .eq("student_id", student.id)
      .maybeSingle(),
    db.from("lessons").select("title,order_number").eq("id", id).maybeSingle(),
    db
      .from("python_runs")
      .select("id,source,result,started_at")
      .eq("activity_id", activity.id)
      .eq("student_id", student.id)
      .neq("status", "running")
      .order("sequence", { ascending: false })
      .limit(1),
    db.rpc("python_activity_state", { p_activity: activity.id }),
  ]);
  if (access.error || draft.error || lesson.error || latest.error || workflow.error)
    throw Error("Unable to load your lesson activity. Please try again.");
  const assessment = workflow.data as { state: "ready" | "awaiting_review" | "needs_revision" | "passed"; run_id?: string; review_id?: string };
  const revisionReview = !independent && assessment.state === "needs_revision" && assessment.review_id
    ? await db.from("python_reviews").select("created_at,updated_at,revision_requested_at").eq("id", assessment.review_id).single()
    : null;
  if (revisionReview?.error) throw Error("Unable to load your latest assessment.");
  const lastRun = latest.data?.[0];
  const eligibleRun = lastRun && !lastRun.result?.history_cleared_at &&
    (!revisionReview || new Date(lastRun.started_at).getTime() > new Date(revisionReview.data!.revision_requested_at || revisionReview.data!.updated_at || revisionReview.data!.created_at).getTime()) ? lastRun : null;
  const reviewLocked = !independent && (assessment.state === "awaiting_review" || assessment.state === "passed");
  const historyParams = await searchParams;
  if (!historyParams.run && assessment.run_id) historyParams.run = assessment.run_id;
  return (
    <main className="page-container lesson-page">
      <a className="back-link" href={"/lesson/" + id + "#python-activity"}>
        ← Back to lesson
      </a>
      <section className="lesson-detail-hero">
        <div className="lesson-detail-copy">
          <span className="eyebrow">
            LESSON {lesson.data?.order_number} · PYTHON PRACTICE
          </span>
          <h1>{activity.content.title}</h1>
          <p>
            Apply what you practiced in {lesson.data?.title || "this lesson"}.
          </p>
          <div className="detail-meta">
            <span>{activity.content.concept}</span>
            <span>
              {section.archived ? "Section archived - history only" : independent ? (access.data ? "Independent practice" : "Complete available games first") : assessment.state === "passed" ? "Passed - activity complete" : assessment.state === "awaiting_review" ? "Submitted - awaiting review" : assessment.state === "needs_revision" ? "Needs revision" : access.data
                ? "Available game practice complete"
                : activity.published ? "Complete the available game levels first" : "History and feedback only"}
            </span>
          </div>
        </div>
      </section>
      {independent && <p className={styles.notice}>{learning.scope.independentPython.includes(activity.id) ? "Independent practice completed. You can continue practicing or return to Lessons." : "Independent practice: finish the available games and complete a successful Python run to unlock the next lesson. No teacher assessment is required."}</p>}
      <div className={styles.root}>
        {section.archived ? (<section className={styles.card}><h2>Previous Python work</h2><p>This section is archived. New runs and submissions are closed. Your saved draft and teacher feedback remain available.</p><h3>Saved draft</h3><pre>{draft.data?.source || "No saved draft."}</pre></section>) : reviewLocked ? (
          <section className={styles.card}>
            <h2>{assessment.state === "passed" ? "Activity passed" : "Awaiting teacher review"}</h2>
            <p>{assessment.state === "passed" ? "You have completed this activity. Further runs and submissions are closed. Your submitted code and teacher feedback remain available below." : "Your submission is saved. Wait for your teacher's assessment before starting another run. If it needs revision, the editor will reopen for a new attempt."}</p>
            <a href="#run-review">View submitted code and feedback</a>
          </section>
        ) : access.data ? (
          <>
            <section className={styles.card}>
              <span className={styles.kicker}>YOUR TASK</span>
              <h2>What your program should do</h2>
              <p>{activity.content.instructions}</p>
              <p className={styles.notice}>Output format matters in the example checks. Print only the words and values the task requests, in the shown order and on the shown lines. Extra messages can cause an output mismatch even when your calculation is correct. {independent ? "Practice completion is not a teacher assessment." : "Your teacher evaluates your approach separately."}</p>
              <div className={styles.grid}>
                <details open>
                  <summary>Python help</summary>
                  <p>{activity.content.guide}</p>
                </details>
                <details>
                  <summary>Example inputs and outputs</summary>
                  {activity.content.cases.map((c, i) => (
                    <div key={i}>
                      <h3>{c.label}</h3>
                      <div className={styles.grid}>
                        <div>
                          <small>Input (one answer at a time)</small>
                          <pre>{c.inputs.join("\n") || "No input"}</pre>
                        </div>
                        <div>
                          <small>Expected output</small>
                          <pre>{c.expected}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </details>
              </div>
              <details>
                <summary>Extra challenge (optional)</summary>
                <p>{activity.content.extension}</p>
              </details>
            </section>
            {!independent && assessment.state === "needs_revision" && <p className={styles.notice}>Your latest submission needs revision. Read the feedback below, revise your code, then run it again and submit the new attempt.</p>}
            <PythonEditor
              independent={independent}
              key={activity.id}
              activity={activity}
              studentId={student.id}
              initialSource={draft.data?.source ?? activity.content.starter}
              initialRun={eligibleRun}
            />
          </>
        ) : (
          <section className={styles.card}>
            <span className={styles.kicker}>ACTIVITY LOCKED</span>
            <h2>{activity.published ? "Finish this lesson’s available game levels first" : "This activity is unavailable for new work"}</h2>
            <p>
              {activity.published ? "Finish the available games in this lesson to begin its Python activity." : "Your previous Runs and teacher feedback remain available below. New Runs are disabled while the activity is unpublished."}
            </p>
            <a className="btn btn-primary" href={"/lesson/" + id}>
              Return to lesson
            </a>
          </section>
        )}
      </div>
      <PythonHub actor={student} lessonId={id} params={historyParams} />
    </main>
  );
}

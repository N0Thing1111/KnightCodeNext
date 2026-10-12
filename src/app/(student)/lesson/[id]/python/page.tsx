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
  const db = await createClient();
  const [access, draft, lesson, latest] = await Promise.all([
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
      .select("id,source")
      .eq("activity_id", activity.id)
      .eq("student_id", student.id)
      .neq("status", "running")
      .order("sequence", { ascending: false })
      .limit(1),
  ]);
  if (access.error || draft.error || lesson.error || latest.error)
    throw Error("Unable to load your lesson activity. Please try again.");
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
              {access.data
                ? "Available game practice complete"
                : activity.published ? "Complete the available game levels first" : "History and feedback only"}
            </span>
          </div>
        </div>
      </section>
      <div className={styles.root}>
        {access.data ? (
          <>
            <section className={styles.card}>
              <span className={styles.kicker}>YOUR TASK</span>
              <h2>What your program should do</h2>
              <p>{activity.content.instructions}</p>
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
            <PythonEditor
              key={activity.id}
              activity={activity}
              studentId={student.id}
              initialSource={draft.data?.source ?? activity.content.starter}
              initialRun={latest.data?.[0] ?? null}
            />
          </>
        ) : (
          <section className={styles.card}>
            <span className={styles.kicker}>ACTIVITY LOCKED</span>
            <h2>{activity.published ? "Finish this lesson’s available game levels first" : "This activity is unavailable for new work"}</h2>
            <p>
              {activity.published ? "Your lesson assignment includes this activity. Finish its available games to begin." : "Your previous Runs and teacher feedback remain available below. New Runs are disabled while the activity is unpublished."}
            </p>
            <a className="btn btn-primary" href={"/lesson/" + id}>
              Return to lesson
            </a>
          </section>
        )}
      </div>
      <PythonHub actor={student} lessonId={id} params={await searchParams} />
    </main>
  );
}

import Link from "next/link";
import type { PythonActivity } from "@/lib/python-contract";
import { pythonRatingCriteria } from "@/lib/python-ratings";
import styles from "./teacher-lesson-python.module.css";

export function TeacherLessonPython({ activities }: { activities: PythonActivity[] | null }) {
  return (
    <section className={"teacher-card " + styles.root} aria-labelledby="lesson-python-heading">
      <h3 id="lesson-python-heading">Python activity</h3>
      <p className="teacher-note">Read-only preview of the current activity. Students submit their code for teacher review; practice checks are feedback, not a grade.</p>
      {activities === null ? (
        <p className="teacher-note">Python activities are not enabled for this deployment yet.</p>
      ) : activities.length === 0 ? (
        <p className="teacher-note">No Python activity is available for this lesson. Ask the administrator to add or publish one.</p>
      ) : activities.map((activity) => (
        <article className={styles.activity} key={activity.id}>
          <div className="teacher-card-head">
            <div>
              <h4>{activity.content.title}</h4>
              <p className="teacher-note">{activity.content.concept} &middot; Revision {activity.revision} &middot; {activity.published ? "Published" : "Unpublished - not available to students"}</p>
            </div>
            <Link className="teacher-btn" prefetch={false} href={"/teacher/results?type=python&activity=" + encodeURIComponent(activity.id)}>
              View student Python runs
            </Link>
          </div>
          <div className={styles.block}>
            <h4>Student instructions</h4>
            <p className={styles.text}>{activity.content.instructions}</p>
          </div>
          <details className={styles.details}>
            <summary>Guide and starter code</summary>
            <div className={styles.block}>
              <h4>Guide</h4>
              <p className={styles.text}>{activity.content.guide}</p>
              <h4>Starter code</h4>
              {activity.content.starter ? <pre tabIndex={0} aria-label="Starter code"><code>{activity.content.starter}</code></pre> : <p className="teacher-note">Students start with an empty editor.</p>}
              {activity.content.extension && <>
                <h4>Extension task</h4>
                <p className={styles.text}>{activity.content.extension}</p>
              </>}
            </div>
          </details>
          <details className={styles.details}>
            <summary>Practice checks and expected output ({activity.content.cases.length})</summary>
            <p className="teacher-note">Each check supplies the inputs below in order and compares the program output with the expected output. Passing the checks does not replace your review of the student&apos;s logic.</p>
            {activity.content.cases.map((check, index) => (
              <div className={styles.check} key={index}>
                <h4>{check.label}</h4>
                <div className={styles.columns}>
                  <div>
                    <h5>Inputs, in order</h5>
                    {check.inputs.length ? <ol>{check.inputs.map((input, inputIndex) => <li key={inputIndex}><code>{input === "" ? "(empty input)" : input}</code></li>)}</ol> : <p className="teacher-note">No input required.</p>}
                  </div>
                  <div>
                    <h5>Expected output</h5>
                    {check.expected ? <pre tabIndex={0} aria-label={check.label + " expected output"}><code>{check.expected}</code></pre> : <p className="teacher-note">No output expected.</p>}
                  </div>
                </div>
              </div>
            ))}
          </details>
        </article>
      ))}
      {activities && activities.length > 0 && <details className={styles.details}>
        <summary>What to review in student submissions</summary>
        <ul>{pythonRatingCriteria.map((criterion) => <li key={criterion.key}><strong>{criterion.label}:</strong> {criterion.description}</li>)}</ul>
        <p className="teacher-note">Rate each criterion from 1 to 5, then choose Passed or Needs revision and give written feedback. Submitting counts toward assignment completion; the teacher review is separate.</p>
      </details>}
    </section>
  );
}

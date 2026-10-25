import { PythonForm } from "@/components/python-forms";
import { displayedPythonRating, pythonRatingBands, pythonRatingCriteria } from "@/lib/python-ratings";
import styles from "@/components/python.module.css";

type Assessment = { id: string; version: number; status: string; logic: number; application: number; correctness: number; feedback: string };
export function PythonAssessmentForm({ submissionId, previous }: { submissionId: string; previous?: Assessment }) {
  return <PythonForm op={previous ? "edit_review" : "review"} submitLabel={previous ? "Save feedback changes" : "Save assessment and notify student"}>
    <input type="hidden" name="submission" value={submissionId} />
    {previous && <>
      <input type="hidden" name="expected_review" value={previous.id} />
      <input type="hidden" name="expected_version" value={previous.version} />
      <p>Save changes to this feedback. No additional feedback is created. For the latest submission, Needs revision reopens the activity and Passed closes it. Editing an older submission does not change the latest submission&apos;s state. The student is notified when feedback changes.</p>
    </>}
    <label>Review outcome
      <select name="status" required defaultValue={previous?.status === "passed" || previous?.status === "needs_revision" ? previous.status : ""}>
        <option value="" disabled>Choose an outcome</option>
        <option value="passed">Passed</option>
        <option value="needs_revision">Needs revision</option>
      </select>
    </label>
    <p>Rate each criterion from 1 to 5. The total does not automatically set the outcome. Do not deduct points just for extra runs or longer time.</p>
    <div className={styles.ratings}>
      {pythonRatingCriteria.map(({ key, label, description }) => <label key={key}>{label}<small>{description}</small>
        <select name={key} required defaultValue={previous ? displayedPythonRating(previous[key]) : ""}>
          <option value="" disabled>Choose a rating</option>
          {pythonRatingBands.map((band, i) => <option value={i+1} key={band}>{i+1} - {band}</option>)}
        </select>
      </label>)}
    </div>
    <label>Feedback<textarea name="feedback" required maxLength={4000} defaultValue={previous?.feedback ?? ""} placeholder="Explain what worked and the next step the student should take." /></label>
  </PythonForm>;
}

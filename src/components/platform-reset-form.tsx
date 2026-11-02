"use client";
import Link from "next/link";
import { SearchableSelect } from "@/components/searchable-select";
import { useActionState, useState } from "react";
import { managePlatformData } from "@/app/actions/platform-data";
import {
  resetPhrase,
  resetRecordLabels,
  type ResetMode,
  type ResetTarget,
  type ResetState,
} from "@/lib/platform-reset";
type Option = { id: string; label: string };
export function PlatformResetForm({
  platform,
  students,
  sections,
  teachers,
}: {
  platform: boolean;
  students: Option[];
  sections: Option[];
  teachers: Option[];
}) {
  const [mode, setMode] = useState<ResetMode>(
    platform ? "platform_keep" : "learning",
  );
  const [target, setTarget] = useState<ResetTarget>(
    platform ? "all" : "student",
  );
  const [targetId, setTargetId] = useState("");
  const [state, action, pending] = useActionState<ResetState, FormData>(
    managePlatformData,
    {},
  );
  const options =
    target === "student"
      ? students
      : target === "section"
        ? sections
        : teachers;
  const needsId = ["student", "section", "teacher"].includes(target);
  const preview = state.preview;
  const matches =
    preview &&
    preview.mode === mode &&
    preview.target === target &&
    preview.target_id === (needsId ? targetId : null);
  return (
    <form action={action} className="platform-reset-form">
      <section className="teacher-card">
        <h2>{platform ? "Platform reset" : "Learning reset"}</h2>
        <p>
          {platform
            ? "Reset records for every teacher and learner. Choose below whether to keep their accounts."
            : "Reset all learning progress for selected learners. Keep accounts, memberships, assignments, and learning content."}
        </p>
        {!platform && (target === "section" || target === "teacher") && (
          <p className="admin-note">
            Section and teacher scopes include current students, even in
            archived accounts or sections. All their learning history is
            cleared, including earlier and independent work.
          </p>
        )}
        <details className="admin-copy-details">
          <summary>What changes?</summary>
          {platform ? (
            <>
              <p>
                <strong>Removed:</strong> learning records, sections,
                memberships, join requests, assignments, and announcements.
              </p>
              <p>
                <strong>Kept:</strong> lessons, game definitions, Python
                activities and checks, achievement definitions, admin accounts,
                settings, audit history, and backups.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Cleared:</strong> game progress, Python drafts, runs,
                submissions, feedback, earned achievements, notifications, XP,
                and streaks. Independent learning restarts at lesson 1.
              </p>
              <p>
                <strong>Kept:</strong> accounts, memberships, join requests,
                assignments, lessons, game levels, and Python activities.
              </p>
            </>
          )}
          <p>New activity can create records after the reset.</p>
        </details>
        <p className="admin-note">
          <Link href="/admin/backup">Back up first</Link>. Restores roll back
          everyone&apos;s records. Pause games and code runs before resetting.
        </p>
        <div className="admin-form">
          {platform ? (
            <label>
              Account handling
              <select
                name="mode"
                value={mode}
                disabled={pending}
                onChange={(e) => setMode(e.target.value as ResetMode)}
              >
                <option value="platform_keep">
                  Keep teacher and student accounts
                </option>
                <option value="platform_delete">
                  Delete teacher and student accounts too
                </option>
              </select>
            </label>
          ) : (
            <input type="hidden" name="mode" value="learning" />
          )}
          {platform ? (
            <>
              <input type="hidden" name="target" value="all" />
              <p>
                {mode === "platform_keep"
                  ? "Accounts, passwords, and verification stay. Removing sections makes students independent learners."
                  : "Permanently deletes teacher and student accounts. Restored accounts need temporary passwords; old passwords cannot be recovered."}
              </p>
            </>
          ) : (
            <label>
              Reset scope
              <select
                name="target"
                value={target}
                disabled={pending}
                onChange={(e) => {
                  setTarget(e.target.value as ResetTarget);
                  setTargetId("");
                }}
              >
                <option value="student">Selected student</option>
                <option value="section">Selected section</option>
                <option value="teacher">
                  Selected teacher&apos;s students
                </option>
                <option value="independent">
                  All independent learners (no section)
                </option>
                <option value="all">All learners</option>
              </select>
            </label>
          )}
          {needsId && (
            <SearchableSelect
              key={target}
              label={
                target === "student"
                  ? "Student"
                  : target === "section"
                    ? "Section"
                    : "Teacher"
              }
              name="target_id"
              options={options}
              value={targetId}
              onChange={setTargetId}
              disabled={pending}
            />
          )}
          <button
            className="teacher-btn"
            name="operation"
            value="preview"
            disabled={pending || (needsId && !targetId)}
            formNoValidate
          >
            {pending ? "Working..." : "Preview affected records"}
          </button>
        </div>
      </section>
      {state.error && (
        <p className="teacher-alert error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="teacher-alert" role="status">
          {state.message}
        </p>
      )}
      {matches && (
        <section className="teacher-card admin-danger">
          <h3>Review: {preview.target_label}</h3>
          <p>
            {preview.student_ids.length}{" "}
            {preview.student_ids.length === 1 ? "learner" : "learners"}{" "}
            affected. Counts and membership are rechecked at confirmation.
            Changes require a new preview.
          </p>
          <details className="reset-affected-learners">
            <summary>
              View affected learners ({preview.student_ids.length})
            </summary>
            <ul>
              {preview.student_ids.map((id) => (
                <li key={id}>
                  {students.find((s) => s.id === id)?.label || id}
                </li>
              ))}
            </ul>
          </details>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Records affected</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(preview.counts).map(([key, value]) => (
                  <tr key={key}>
                    <td>
                      {resetRecordLabels[key] || key.replaceAll("_", " ")}
                    </td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <input type="hidden" name="preview" value={JSON.stringify(preview)} />
          <div className="admin-form" key={JSON.stringify(preview)}>
            <label>
              Type {resetPhrase(mode)}
              <input
                name="confirmation"
                required
                autoComplete="off"
                disabled={pending}
              />
            </label>
            <label>
              Your administrator password
              <input
                type="password"
                name="admin_password"
                required
                autoComplete="current-password"
                disabled={pending}
              />
            </label>
            <button
              className="teacher-btn"
              name="operation"
              value="reset"
              disabled={pending || (!platform && !preview.student_ids.length)}
            >
              {pending ? "Working..." : "Permanently reset these records"}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}

import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getAssignmentScope, getStudentLearningData } from "@/lib/student-data";
import { createClient } from "@/lib/supabase/server";

export default async function AssignmentsPage() {
  const student = await requireStudent();
  const supabase = await createClient();
  const [scope, learning] = await Promise.all([
    getAssignmentScope(student.id),
    getStudentLearningData(student.id),
  ]);
  const progress = new Map(learning.progress.map((row) => [row.level_id, row]));
  const teacherIds = [
    ...new Set(scope.assignments.map((row) => row.teacher_id)),
  ];
  const classIds = [
    ...new Set(scope.assignments.map((row) => row.class_id).filter(Boolean)),
  ] as number[];
  const [{ data: teachers }, { data: classes }] = await Promise.all([
    teacherIds.length
      ? supabase.from("profiles").select("id,name").in("id", teacherIds)
      : { data: [] },
    classIds.length
      ? supabase.from("classes").select("id,name,section").in("id", classIds)
      : { data: [] },
  ]);
  const teacherMap = new Map((teachers ?? []).map((row) => [row.id, row.name]));
  const classMap = new Map((classes ?? []).map((row) => [row.id, row]));
  const statusFor = (assignment: (typeof scope.assignments)[number]) => {
    if (assignment.level_id) {
      const row = progress.get(assignment.level_id);
      return row?.completed
        ? "completed"
        : row?.attempts
          ? "started"
          : "assigned";
    }
    const levels = learning.levels.filter(
      (level) => level.lesson_id === assignment.lesson_id,
    );
    return levels.length &&
      levels.every((level) => progress.get(level.id)?.completed)
      ? "completed"
      : levels.some((level) => progress.get(level.id)?.attempts)
        ? "started"
        : "assigned";
  };
  const completed = scope.assignments.filter(
    (row) => statusFor(row) === "completed",
  ).length;
  return (
    <main className="page-container lessons-page">
      <section className="page-hero lessons-hero">
        <div>
          <span className="eyebrow">TEACHER ASSIGNMENTS</span>
          <h1>My Assignments</h1>
          <p>
            Review the lessons and challenges assigned to you, including
            instructions and due dates.
          </p>
        </div>
        <div className="page-hero-stat">
          <strong>{scope.assignments.length}</strong>
          <span>assignment{scope.assignments.length === 1 ? "" : "s"}</span>
          <small>{completed} completed</small>
        </div>
      </section>
      <section className="levels-library">
        <div className="section-heading-row">
          <div>
            <span className="panel-kicker">ASSIGNED WORK</span>
            <h2>From your teachers</h2>
            <p>
              Open an assignment to read its lesson or play its selected
              challenge.
            </p>
          </div>
        </div>
        <div className="level-modern-list">
          {!scope.assignments.length && (
            <div className="empty-state">
              You do not have any assignments yet.
            </div>
          )}
          {scope.assignments.map((assignment) => {
            const level = learning.levels.find(
              (row) => row.id === assignment.level_id,
            );
            const lesson = learning.lessons.find(
              (row) => row.id === (assignment.lesson_id ?? level?.lesson_id),
            );
            const isLevel = Boolean(level);
            const status = statusFor(assignment);
            const group = assignment.class_id
              ? classMap.get(assignment.class_id)
              : null;
            const href = isLevel
              ? `/play/${level!.id}`
              : `/lesson/${lesson!.id}`;
            return (
              <article
                className="level-modern-row"
                id={`assignment-${assignment.id}`}
                key={assignment.id}
              >
                <div
                  className={`level-number-badge ${status === "completed" ? "done" : ""}`}
                >
                  {isLevel ? "⚔" : "▤"}
                </div>
                <div className="level-info">
                  <span className="muted-kicker">
                    {teacherMap.get(assignment.teacher_id) ?? "Teacher"}
                    {group ? ` · ${sectionLabel(group)}` : " · Individual"}
                  </span>
                  <h3>{assignment.title}</h3>
                  <p>
                    {assignment.instructions ||
                      (isLevel
                        ? `Level ${level!.level_number} · ${level!.title}`
                        : `Lesson ${lesson!.order_number} · ${lesson!.title}`)}
                  </p>
                  <small>
                    {isLevel
                      ? `Level ${level!.level_number} · ${level!.title}`
                      : `Lesson ${lesson!.order_number} · ${lesson!.title}`}{" "}
                    ·{" "}
                    {assignment.due_date
                      ? `Due ${new Date(assignment.due_date).toLocaleString()}`
                      : "No due date"}
                  </small>
                </div>
                <div className={`level-status ${status}`}>
                  <i />
                  {status[0].toUpperCase() + status.slice(1)}
                </div>
                <Link
                  href={href}
                  className={`btn ${status === "completed" ? "btn-secondary" : "btn-primary"}`}
                >
                  {status === "completed" ? "Review" : "Open"} <span>→</span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

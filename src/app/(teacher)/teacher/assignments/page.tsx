import { isGameLevelAvailable } from "@/lib/game-build";
import { sectionLabel } from "@/lib/section-label";
import { requireTeacher } from "@/lib/auth";
import {
  assignmentCounts,
  getTeacherContext,
  teacherStudents,
} from "@/lib/teacher-data";
import { deleteAssignment } from "@/app/actions/teacher";
import { Alerts, Hero } from "@/components/teacher-ui";
import { AssignmentForm } from "./assignment-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    t = await requireTeacher(),
    ctx = await getTeacherContext(t.id),
    students = teacherStudents(ctx);
  return (
    <>
      <Hero
        eyebrow="LEARNING TASKS"
        title="Assignments"
        description="Create assignments linked to the existing lessons and challenges. Completion is reflected from real student progress."
      />
      <Alerts searchParams={q} />
      <section className="teacher-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">CREATE ASSIGNMENT</span>
            <h3>Assign a lesson or challenge</h3>
          </div>
        </div>
        <AssignmentForm
          classes={ctx.classes
            .filter((c) => c.status === "active")
            .map((c) => ({ id: c.id, name: c.name, section: c.section }))}
          students={students.map((s) => ({
            id: s.id,
            name: s.name,
            studentId: s.student_id ?? "",
            classIds: ctx.memberships
              .filter((m) => m.student_id === s.id)
              .map((m) => m.class_id),
          }))}
          lessons={ctx.lessons.map((l) => ({ id: l.id, title: l.title, pythonTitle: ctx.python.activities.some(a => a.lesson_id === l.id && a.published) ? "This lesson's Python activity" : undefined }))}
          levels={ctx.levels.filter(l => ctx.lessons.some(lesson => lesson.id === l.lesson_id)).map((l) => ({
            id: l.id,
            levelNumber: l.level_number,
            lessonId: l.lesson_id,
            available: isGameLevelAvailable(l),
            title: l.title,
          }))}
          defaultClassId={q.class_id || "0"}
          defaultLessonId={q.lesson_id || "0"}
        />
      </section>
      <section className="teacher-card assignment-tracker-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">ASSIGNMENT TRACKER</span>
            <h3>{ctx.assignments.length} assignments</h3>
          </div>
        </div>
        <div className="teacher-table-wrap">
          <table className="teacher-table assignment-tracker-table">
            <colgroup>
              <col className="assignment-col-main" />
              <col className="assignment-col-target" />
              <col className="assignment-col-content" />
              <col className="assignment-col-due" />
              <col className="assignment-col-progress" />
              <col className="assignment-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Target</th>
                <th>Content</th>
                <th>Due</th>
                <th>Completion</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ctx.assignments.length ? (
                ctx.assignments.map((a) => {
                  const c = ctx.classes.find((c) => c.id === a.class_id),
                    s = students.find((s) => s.id === a.student_id),
                    l = ctx.lessons.find((l) => l.id === a.lesson_id),
                    lv = ctx.levels.find((l) => l.id === a.level_id),
                    counts = assignmentCounts(ctx, a);
                  return (
                    <tr key={a.id} id={"assignment-" + a.id}>
                      <td>
                        <div className="assignment-main-cell">
                          <strong>{a.title}</strong>
                          {a.instructions && <p>{a.instructions}</p>}
                        </div>
                      </td>
                      <td>
                        <div className="assignment-target-cell">
                          <strong>
                            {c
                              ? sectionLabel(c)
                              : (s?.name ?? "Former section member")}
                          </strong>
                          <small>
                            {c
                              ? c.subject
                              : (s?.student_id ?? "Historical assignment")}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="assignment-content-pill">
                          {lv?.title ?? l?.title ?? "KnightCode"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            a.due_date
                              ? "assignment-due"
                              : "assignment-due empty"
                          }
                        >
                          {a.due_date
                            ? new Date(a.due_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "No due date"}
                        </span>
                      </td>
                      <td>
                        <div className="assignment-completion">
                          <div>
                            <strong>
                              {counts.done} / {counts.target}
                            </strong>
                            <span>
                              {counts.target
                                ? Math.round(
                                    (counts.done / counts.target) * 100,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                          <span className="assignment-progress-track">
                            <i
                              style={{
                                width:
                                  (counts.target
                                    ? Math.round(
                                        (counts.done / counts.target) * 100,
                                      )
                                    : 0) + "%",
                              }}
                            />
                          </span>
                          <small>{!a.level_id && ctx.python.activities.some(py => py.lesson_id === a.lesson_id && py.published) ? "games + Python submitted" : "game completed"}</small>
                        </div>
                      </td>
                      <td className="assignment-action-cell">
                        <form action={deleteAssignment}>
                          <input type="hidden" name="id" value={a.id} />
                          <button
                            className="assignment-delete"
                            aria-label={"Delete " + a.title}
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="teacher-empty">
                      No assignments created yet.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

import { getPythonActivities } from "@/lib/python-data";
import { TeacherLessonPython } from "@/components/teacher-lesson-python";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { getTeacherContext, teacherStudents } from "@/lib/teacher-data";
import { Back, Hero } from "@/components/teacher-ui";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    t = await requireTeacher(),
    ctx = await getTeacherContext(t.id),
    lesson = ctx.lessons.find((l) => String(l.id) === id);
  if (!lesson) notFound();
  const activities = await getPythonActivities();
  const students = teacherStudents(ctx),
    levels = ctx.levels.filter((l) => l.lesson_id === lesson.id);
  return (
    <>
      <Back href="/teacher/lessons" label="Back to Lessons" />
      <Hero
        eyebrow={"LESSON " + lesson.order_number}
        title={lesson.title}
        description={lesson.description}
      >
        <Link
          prefetch={false}
          className="teacher-btn primary"
          href={"/teacher/assignments?lesson_id=" + lesson.id}
        >
          Assign This Lesson
        </Link>
      </Hero>
      <section className="teacher-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">OBJECTIVE</span>
            <h3>What students should learn</h3>
          </div>
        </div>
        <p className="teacher-note">{lesson.learning_objective}</p>
      </section>
      <section className="teacher-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">CURRICULUM CONTENT</span>
            <h3>Lesson material</h3>
          </div>
        </div>
        <div
          className="lesson-content"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      </section>
      <TeacherLessonPython activities={activities === null ? null : activities.filter((activity) => activity.lesson_id === lesson.id)} />
      <section className="teacher-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">PRACTICE LEVELS</span>
            <h3>
              {levels.length} level{levels.length === 1 ? "" : "s"} in this
              lesson
            </h3>
          </div>
        </div>
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Difficulty</th>
                <th>Description</th>
                <th>Completed by</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>
                      #{l.level_number} · {l.title}
                    </strong>
                  </td>
                  <td>{l.difficulty}</td>
                  <td>{l.description}</td>
                  <td>
                    {
                      new Set(
                        ctx.progress
                          .filter(
                            (p) =>
                              p.level_id === l.id &&
                              p.completed &&
                              students.some((s) => s.id === p.student_id),
                          )
                          .map((p) => p.student_id),
                      ).size
                    }{" "}
                    / {students.length} students
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="teacher-note">
          This is a read-only view of the KnightCode curriculum — levels
          aren&apos;t playable here. To see how an individual student did on a
          specific level, open their page from Student Monitoring.
        </p>
      </section>
    </>
  );
}

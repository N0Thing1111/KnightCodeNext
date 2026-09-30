import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { getTeacherContext } from "@/lib/teacher-data";
import { Hero } from "@/components/teacher-ui";
export default async function Page() {
  const t = await requireTeacher(),
    ctx = await getTeacherContext(t.id);
  return (
    <>
      <Hero
        eyebrow="KNIGHTCODE CURRICULUM"
        title="Lessons"
        description="Review the curriculum and see which lessons or challenges you have assigned."
      >
        <Link
          prefetch={false}
          className="teacher-btn primary"
          href="/teacher/assignments"
        >
          + Create Assignment
        </Link>
      </Hero>
      <section className="teacher-card">
        <div className="teacher-card-head">
          <div>
            <span className="teacher-eyebrow">AVAILABLE CURRICULUM</span>
            <h3>{ctx.lessons.length} lessons</h3>
          </div>
          <Link prefetch={false} href="/teacher/assignments">
            View all assignments →
          </Link>
        </div>
        <div className="teacher-lesson-grid">
          {ctx.lessons.map((l) => {
            const levels = ctx.levels.filter(
                (x) => x.lesson_id === l.id,
              ).length,
              count = ctx.assignments.filter(
                (a) => a.lesson_id === l.id,
              ).length;
            return (
              <article className="teacher-lesson-card" key={l.id}>
                <div className="lesson-number">{l.order_number}</div>
                <div>
                  <span className="teacher-eyebrow">
                    LESSON {l.order_number}
                  </span>
                  <h3>{l.title}</h3>
                  <p>{l.description}</p>
                  <small>
                    {levels} playable level{levels === 1 ? "" : "s"} · {count}{" "}
                    assignment{count === 1 ? "" : "s"} · {l.learning_objective}
                  </small>
                  <div>
                    <Link
                      prefetch={false}
                      className="teacher-btn small"
                      href={"/teacher/lesson/" + l.id}
                    >
                      View Lesson
                    </Link>
                    <Link
                      prefetch={false}
                      className="teacher-btn small primary"
                      href={"/teacher/assignments?lesson_id=" + l.id}
                    >
                      Assign
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

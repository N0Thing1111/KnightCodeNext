import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LessonViewBeacon } from "@/components/lesson-view-beacon";
import { requireStudent } from "@/lib/auth";
import { getStudentLearningData } from "@/lib/student-data";
import { isGameLevelAvailable } from "@/lib/game-build";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const student = await requireStudent(),
    data = await getStudentLearningData(student.id),
    lesson = data.lessons.find((row) => row.id === id);
  if (!lesson) redirect("/lessons?locked=1");
  const levels = data.levels.filter((level) => level.lesson_id === id),
    progress = new Map(data.progress.map((row) => [row.level_id, row])),
    completed = levels.filter(
      (level) => progress.get(level.id)?.completed,
    ).length,
    pct = levels.length ? Math.round((completed / levels.length) * 100) : 0,
    nextLevel = levels.find(
      (level) =>
        !progress.get(level.id)?.completed &&
        data.playable.has(level.id) &&
        isGameLevelAvailable(level.level_number),
    );
  return (
    <main className="page-container lesson-page">
      <LessonViewBeacon lessonId={id} />
      <Link className="back-link" href="/lessons">
        ← Back to Lessons
      </Link>
      <section className="lesson-detail-hero">
        <div className="lesson-detail-copy">
          <span className="eyebrow">LESSON {lesson.order_number}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
          <div className="detail-meta">
            <span>🎯 Concept lesson</span>
            <span>⚔ {levels.length} practice levels</span>
            <span>✓ {completed} completed</span>
          </div>
        </div>
        <div className="lesson-progress-card">
          <div className="progress-card-head">
            <strong>{pct}%</strong>
            <span>Lesson progress</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${pct}%` }} />
          </div>
          <small>
            {completed} of {levels.length} levels complete
          </small>
          {nextLevel && (
            <Link
              className="btn btn-primary btn-block"
              href={`/play/${nextLevel.id}`}
            >
              Continue to Level {nextLevel.level_number} <span>→</span>
            </Link>
          )}
        </div>
      </section>
      <div className="lesson-layout">
        <article className="lesson-content-card">
          <div className="objective-card">
            <span>🎯</span>
            <div>
              <b>Learning Objective</b>
              <p>{lesson.learning_objective}</p>
            </div>
          </div>
          <div
            className="lesson-rich-content"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        </article>
        <aside className="lesson-side-card panel">
          <span className="panel-kicker">LESSON MAP</span>
          <h2>Practice as you learn</h2>
          <p>
            Read the concept, review the examples, then use each level to turn
            the idea into code.
          </p>
          <div className="lesson-side-stats">
            <div>
              <strong>{levels.length}</strong>
              <span>Levels</span>
            </div>
            <div>
              <strong>{completed}</strong>
              <span>Complete</span>
            </div>
            <div>
              <strong>{pct}%</strong>
              <span>Progress</span>
            </div>
          </div>
          <Link className="btn btn-secondary btn-block" href="/lessons#levels">
            Browse all challenges <span>→</span>
          </Link>
        </aside>
      </div>
      <section className="levels-section">
        <div className="section-heading-row">
          <div>
            <span className="panel-kicker">PRACTICE LEVELS</span>
            <h2>Apply the concept</h2>
            <p>
              Each puzzle is linked directly to your existing KnightCode
              progress.
            </p>
          </div>
        </div>
        <div className="level-modern-list">
          {levels.map((level) => {
            const row = progress.get(level.id),
              buildAvailable = isGameLevelAvailable(level.level_number),
              canPlay = data.playable.has(level.id) && buildAvailable,
              status = row?.completed
                ? "Completed"
                : !buildAvailable
                  ? "Coming Soon"
                  : !canPlay
                    ? "Locked"
                    : row?.attempts
                      ? "In Progress"
                      : "Not Started";
            return (
              <article className="level-modern-row" key={level.id}>
                <div
                  className={`level-number-badge ${row?.completed ? "done" : !canPlay ? "locked" : ""}`}
                >
                  {canPlay ? level.level_number : "🔒"}
                </div>
                <div className="level-info">
                  <span className="muted-kicker">{level.difficulty}</span>
                  <h3>{level.title}</h3>
                  <p>{level.description}</p>
                </div>
                <div
                  className={`level-status ${status.toLowerCase().replaceAll(" ", "-")}`}
                >
                  <i />
                  {status}
                </div>
                {canPlay ? (
                  <Link
                    href={`/play/${level.id}`}
                    className={`btn ${row?.completed ? "btn-secondary" : "btn-primary"}`}
                  >
                    {row?.completed ? "Replay" : "Play Level"} <span>→</span>
                  </Link>
                ) : (
                  <span className="btn btn-locked">
                    {buildAvailable ? "Locked" : "Coming Soon"} <span>🔒</span>
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

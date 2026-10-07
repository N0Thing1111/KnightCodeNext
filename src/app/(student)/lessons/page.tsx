import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getStudentLearningData, getViewedLessonIds } from "@/lib/student-data";
import { isGameLevelAvailable } from "@/lib/game-build";

const icons = ["🧭", "🧱", "⚙", "◈", "🛡", "∞", "✦"];
export default async function LessonsPage() {
  const student = await requireStudent();
  const [data, viewed] = await Promise.all([
    getStudentLearningData(student.id),
    getViewedLessonIds(student.id),
  ]);
  const progress = new Map(data.progress.map((row) => [row.level_id, row]));
  const availableCount = data.levels.filter((level) =>
    isGameLevelAvailable(level.level_number),
  ).length;
  return (
    <main className="page-container lessons-page">
      <section className="page-hero lessons-hero">
        <div>
          <span className="eyebrow">LEARNING PATH</span>
          <h1>Master programming, one quest at a time.</h1>
          <p>
            Learn a concept, practice it in KnightCode, then move forward when
            you&apos;re ready.
          </p>
        </div>
        <div className="page-hero-stat">
          <strong>{data.lessons.length}</strong>
          <span>lesson{data.lessons.length === 1 ? "" : "s"}</span>
          <small>
            {availableCount} available game level
            {availableCount === 1 ? "" : "s"}
          </small>
        </div>
      </section>
      <section className="section-heading-row" id="lessons">
        <div>
          <span className="panel-kicker">YOUR CURRICULUM</span>
          <h2>Lessons assigned by your teacher.</h2>
          <p>
            Your available lessons and challenges appear here when a teacher
            assigns them to you or your section.
          </p>
        </div>
      </section>
      <section className="lesson-modern-grid">
        {!data.lessons.length && (
          <div className="empty-state">
            No lessons have been assigned yet. Check back after your teacher
            posts an assignment.
          </div>
        )}
        {data.lessons.map((lesson, index) => {
          const levels = data.levels.filter(
            (level) => level.lesson_id === lesson.id,
          );
          const done = levels.filter(
            (level) => progress.get(level.id)?.completed,
          ).length;
          const pct = levels.length
            ? Math.round((done / levels.length) * 100)
            : 0;
          const started =
            done > 0 ||
            levels.some(
              (level) => (progress.get(level.id)?.attempts ?? 0) > 0,
            ) ||
            viewed.has(lesson.id);
          const status =
            pct === 100 ? "Completed" : started ? "In Progress" : "Not Started";
          return (
            <article className="lesson-modern-card" key={lesson.id}>
              <div className="lesson-card-top">
                <span className="lesson-number">
                  {String(lesson.order_number).padStart(2, "0")}
                </span>
                <span
                  className={`status-chip status-${status.toLowerCase().replaceAll(" ", "-")}`}
                >
                  {status}
                </span>
              </div>
              <div className="lesson-icon">{icons[index] ?? "⚔"}</div>
              <span className="muted-kicker">LESSON {lesson.order_number}</span>
              <h3>{lesson.title}</h3>
              <p>{lesson.description}</p>
              <div className="objective-mini">
                <span>🎯</span>
                <div>
                  <b>Learning objective</b>
                  <small>{lesson.learning_objective}</small>
                </div>
              </div>
              <div className="card-progress">
                <div>
                  <span>
                    {done} / {levels.length} levels
                  </span>
                  <b>{pct}%</b>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
              <Link
                className={`btn ${started ? "btn-secondary" : "btn-primary"} btn-block`}
                href={`/lesson/${lesson.id}`}
              >
                {pct === 100
                  ? "Review Lesson"
                  : started
                    ? "Continue Lesson"
                    : "Start Lesson"}{" "}
                <span>→</span>
              </Link>
            </article>
          );
        })}
      </section>
      <section className="levels-library" id="levels">
        <div className="section-heading-row">
          <div>
            <span className="panel-kicker">PLAYABLE LEVELS</span>
            <h2>Challenge Library</h2>
            <p>Use the lesson concepts in progressively harder grid puzzles.</p>
          </div>
          <span className="library-count">
            {availableCount} available · {data.levels.length} planned
          </span>
        </div>
        <div className="level-modern-list">
          {!data.levels.length && (
            <div className="empty-state">
              No playable levels have been assigned yet.
            </div>
          )}
          {data.levels.map((level) => {
            const row = progress.get(level.id);
            const buildAvailable = isGameLevelAvailable(level.level_number);
            const canPlay = data.playable.has(level.id) && buildAvailable;
            const status = row?.completed
              ? "Completed"
              : !buildAvailable
                ? "Coming Soon"
                : !canPlay
                  ? "Locked"
                  : row?.attempts
                    ? "In Progress"
                    : "Not Started";
            const lesson = data.lessons.find(
              (item) => item.id === level.lesson_id,
            );
            return (
              <article className="level-modern-row" key={level.id}>
                <div
                  className={`level-number-badge ${canPlay ? "" : "locked"}`}
                >
                  {canPlay ? level.level_number : "🔒"}
                </div>
                <div className="level-info">
                  <span className="muted-kicker">
                    Lesson {lesson?.order_number} · {level.difficulty}
                  </span>
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
                    {row?.completed ? "Replay" : "Play"} <span>→</span>
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

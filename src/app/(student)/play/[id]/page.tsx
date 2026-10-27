import { getStudentSection } from "@/lib/student-section";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UnityPlayer } from "@/components/unity-player";
import { requireStudent } from "@/lib/auth";
import { getStudentLearningData } from "@/lib/student-data";
import { isGameLevelAvailable } from "@/lib/game-build";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const student = await requireStudent();
  const section = await getStudentSection();
  if (section.archived) return <main className="page-container"><h1>Game attempts are closed</h1><p>Your section is archived. Your saved progress remains available.</p><Link href="/lessons">View lessons and progress</Link></main>;
  const data = await getStudentLearningData(student.id);
  const level = data.levels.find((row) => row.id === id);
  if (!level) redirect("/lessons?locked=1");
  if (!data.playable.has(id)) redirect("/lessons?sequence_locked=1#levels");
  const lesson = data.lessons.find((row) => row.id === level.lesson_id);
  const progress = data.progress.find((row) => row.level_id === id) ?? null;
  return (
    <main className="page-container play-page">
      <Link className="back-link" href={`/lesson/${level.lesson_id}`}>
        ← Back to {lesson?.title}
      </Link>
      <section className="play-top">
        <div>
          <span className="eyebrow">
            LEVEL {level.level_number} · {lesson?.title}
          </span>
          <h1>{level.title}</h1>
          <p>{level.description}</p>
          <div className="detail-meta">
            <span>◈ {level.difficulty}</span>
            <span>⌘ {progress?.attempts ?? 0} level starts/restarts</span>
            <span>⭐ {progress?.xp_earned ?? 0} XP earned</span>
          </div>
        </div>
        <div className="play-status-card">
          <span
            className={`status-dot ${progress?.completed ? "complete" : ""}`}
          />
          <div>
            <b>{progress?.completed ? "Completed" : "Ready to Play"}</b>
            <small>
              {progress?.completed
                ? "You can replay this level anytime."
                : "Your progress will save automatically."}
            </small>
          </div>
        </div>
      </section>
      {isGameLevelAvailable(level) ? (
        <UnityPlayer level={level} initial={progress} />
      ) : (
        <section className="panel game-unavailable">
          <span className="game-unavailable-icon">⚒</span>
          <h2>This challenge is still being forged.</h2>
          <p>
            The lesson content is ready, but Level {level.level_number} is not
            included in the current Unity WebGL build. No game was loaded and no
            attempt was recorded.
          </p>
          <Link className="btn btn-primary" href={`/lesson/${level.lesson_id}`}>
            Return to lesson
          </Link>
        </section>
      )}
    </main>
  );
}

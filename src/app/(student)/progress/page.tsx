import Link from "next/link";
import { isGameLevelAvailable } from "@/lib/game-build";
import styles from "./progress.module.css";
import { requireStudent } from "@/lib/auth";
import { formatDuration, formatDate } from "@/lib/format";
import {
  getAchievements,
  getStudentLearningData,
  getStudentStats,
} from "@/lib/student-data";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const student = await requireStudent(),
    supabase = await createClient();
  const [stats, learning, achievements, activityResult] = await Promise.all([
    getStudentStats(student),
    getStudentLearningData(student.id),
    getAchievements(student.id),
    supabase
      .from("student_activity")
      .select("id,action_type,xp_earned,duration_seconds,created_at,level_id,metadata")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (activityResult.error) throw Error("Unable to load your learning history. Please try again.");
  const { gamesTotal, gamesDone, pythonTotal, pythonDone, tasksTotal, tasksDone, overallPct } = stats;
  const availableIds = new Set(learning.levels.filter(isGameLevelAvailable).map(l => l.id));
  const gamesStarted = learning.progress.filter(p => availableIds.has(p.level_id) && !p.completed && (p.attempts > 0 || p.play_time_seconds > 0)).length;
  const comingSoon = learning.levels.length - availableIds.size;
  const nextLesson = learning.lessons.find(l => {
    const c = learning.completion.get(l.id)!;
    return c.total > 0 && !c.complete;
  });
  const nextCompletion = nextLesson ? learning.completion.get(nextLesson.id)! : null;
  const nextIsPython = !!nextCompletion && nextCompletion.gamesDone === nextCompletion.gamesTotal && nextCompletion.pythonRequired && !nextCompletion.pythonDone;
  const levelMap = new Map(learning.levels.map((level) => [level.id, level])),
    history = activityResult.data ?? [],
    earnedCount = achievements.filter((a) => a.earned_at).length,
    xpInLevel = stats.xp % 500,
    xpToNext = xpInLevel ? 500 - xpInLevel : 500;
  return (
    <main className={`page-container progress-page ${styles.page}`}>
      <section className="page-hero">
        <div>
          <span className="eyebrow">YOUR JOURNEY</span>
          <h1>My Progress</h1>
          <p>
            See how far you&apos;ve come, what you&apos;ve completed, and what
            to conquer next.
          </p>
        </div>
        <div className="page-hero-stat">
          <strong>{overallPct}%</strong>
          <span>{tasksTotal ? "assigned work complete" : "no available tasks yet"}</span>
          <small>
            {tasksDone} of {tasksTotal} assigned tasks
          </small>
        </div>
      </section>
      <section className="metric-grid">
        <article className="metric-card metric-card-progress">
          <span>Assigned Work</span>
          <strong>{overallPct}%</strong>
          <div className="progress-track">
            <span style={{ width: `${overallPct}%` }} />
          </div>
          <small>{gamesDone} games completed · {pythonDone} Python activities submitted</small>
        </article>
        <article className="metric-card">
          <span>XP Earned</span>
          <strong>{stats.xp.toLocaleString()}</strong>
          <small>
            Level {stats.level} · {stats.rank}
          </small>
        </article>
        <article className="metric-card">
          <span>Current Streak</span>
          <strong>{stats.streak} days</strong>
          <small>Keep learning consistently</small>
        </article>
        <article className="metric-card">
          <span>Game Practice Time</span>
          <strong>{formatDuration(stats.playTimeSeconds)}</strong>
          <small>
            {stats.attempts.toLocaleString()} attempts ·{" "}
            {stats.mistakes.toLocaleString()} mistakes
          </small>
        </article>
      </section>
      <section className={styles.breakdown} aria-label="Learning breakdown">
        <article className="panel">
          <span className="panel-kicker">GAME PRACTICE</span>
          <h2>Available game levels</h2>
          <p className={styles.total}><strong>{gamesDone} / {gamesTotal}</strong> completed</p>
          <div className="progress-track" role="progressbar" aria-label="Available games completed" aria-valuenow={gamesDone} aria-valuemin={0} aria-valuemax={gamesTotal || 1}>
            <span style={{ width: (gamesTotal ? gamesDone / gamesTotal * 100 : 0) + "%" }} />
          </div>
          <dl className={styles.stats}>
            <div><dt>Practicing</dt><dd>{gamesStarted}</dd></div>
            <div><dt>Not started</dt><dd>{Math.max(0, gamesTotal - gamesDone - gamesStarted)}</dd></div>
            <div><dt>Coming Soon</dt><dd>{comingSoon}</dd></div>
          </dl>
          <p className={styles.note}>Coming Soon levels are excluded from completion. Practicing means saved progress without a completion; it is not a live status.</p>
        </article>
        <article className="panel">
          <span className="panel-kicker">PYTHON APPLICATION</span>
          <h2>Python activities</h2>
          <p className={styles.total}><strong>{pythonDone} / {pythonTotal}</strong> submitted</p>
          <div className="progress-track" role="progressbar" aria-label="Python activities submitted" aria-valuenow={pythonDone} aria-valuemin={0} aria-valuemax={pythonTotal || 1}>
            <span style={{ width: (pythonTotal ? pythonDone / pythonTotal * 100 : 0) + "%" }} />
          </div>
          <dl className={styles.stats}>
            <div><dt>Not submitted</dt><dd>{pythonTotal - pythonDone}</dd></div>
            <div><dt>Lessons completed</dt><dd>{stats.lessonsCompleted} / {learning.lessons.length}</dd></div>
          </dl>
          <p className={styles.note}>{pythonTotal ? "Each activity counts once, even after resubmission. Submission counts toward completion; your teacher’s review and rating are separate." : "No published Python activities are included in your current whole-lesson assignments."}</p>
        </article>
      </section>
      <section className={"panel " + styles.next} aria-label="Next learning step">
        <div>
          <span className="panel-kicker">NEXT STEP</span>
          <h2>{nextLesson ? nextLesson.title : tasksTotal ? "Your available assigned work is complete" : "Ready when your lessons are available"}</h2>
          <p className={styles.note}>{nextLesson
            ? nextIsPython ? "Your available games are complete. Open the lesson to continue its Python activity and submit your work." : "Continue the available game levels in this lesson, then complete its Python activity if assigned."
            : tasksTotal ? "You can revisit your lessons, practice again, or check your teacher’s feedback." : "Your teacher’s available lesson tasks will appear here. Coming Soon games do not count against your progress."}</p>
        </div>
        <Link className="btn btn-secondary" href={nextLesson ? "/lesson/" + nextLesson.id : "/lessons"}>{nextLesson ? "Continue lesson" : "View lessons"}</Link>
      </section>
      <section className="progress-content-grid">
        <article className="panel lesson-progress-panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-kicker">ASSIGNED CURRICULUM</span>
              <h2>Lesson Progress</h2>
            </div>
            <span className="muted-kicker">
              {stats.lessonsCompleted} completed
            </span>
          </div>
          <div className="lesson-progress-list">
            {!learning.lessons.length && (
              <div className="empty-state">
                No lessons have been assigned yet.
              </div>
            )}
            {learning.lessons.map((lesson) => {
              const completion = learning.completion.get(lesson.id)!;
              const pct = completion.pct;
              const lessonLevelIds = new Set(learning.levels.filter(l => l.lesson_id === lesson.id).map(l => l.id));
              const practice = learning.progress.filter(p => lessonLevelIds.has(p.level_id));
              const attempts = practice.reduce((sum, p) => sum + p.attempts, 0);
              const seconds = practice.reduce((sum, p) => sum + p.play_time_seconds, 0);
              return (
                <Link
                  href={`/lesson/${lesson.id}`}
                  className="lesson-progress-item"
                  key={lesson.id}
                >
                  <div className="lesson-progress-meta">
                    <span>
                      <b>Lesson {lesson.order_number}</b>
                      {lesson.title}
                    </span>
                    <strong>
                      {completion.gamesTotal ? `${completion.gamesDone}/${completion.gamesTotal} games` : "No available games"}
                    </strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className={styles.lessonDetails}>
                    <span>{completion.total ? pct + "% complete" : "Waiting for available content"}</span>
                    {completion.pythonRequired && <span className={styles.tag}>{completion.pythonDone ? "Python submitted" : "Python not submitted"}</span>}
                  </div>
                  <small>{attempts} game attempts · {formatDuration(seconds)} game practice</small>
                </Link>
              );
            })}
          </div>
        </article>
        <article className="panel progress-ring-panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-kicker">EXPERIENCE</span>
              <h2>XP Level</h2>
            </div>
          </div>
          <div
            className="progress-ring-large"
            style={{ "--pct": `${stats.xpPct}%` } as React.CSSProperties}
          >
            <div>
              <strong>{stats.level}</strong>
              <small>XP Level</small>
            </div>
          </div>
          <h3>{stats.rank}</h3>
          <p>{xpToNext.toLocaleString()} XP until the next level.</p>
          <div className="progress-track">
            <span style={{ width: `${stats.xpPct}%` }} />
          </div>
          <small>{xpInLevel.toLocaleString()} / 500 XP this level</small>
        </article>
      </section>
      <section className="panel history-panel">
        <div className="panel-title-row">
          <div>
            <span className="panel-kicker">YOUR RECORD</span>
            <h2>Recent Game &amp; Lesson Activity</h2>
          </div>
          <span className="muted-kicker">
            Latest {history.length} activities
          </span>
        </div>
        {!history.length ? (
          <div className="empty-state">
            No activity yet. Start your first challenge from the Lessons page.
          </div>
        ) : (
          <div className="history-table-wrap" role="region" aria-label="Recent learning activity" tabIndex={0}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Content</th>
                  <th>XP</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const lessonId = Number((item.metadata as { lesson_id?: number } | null)?.lesson_id);
                  const viewedLesson = learning.lessons.find(l => l.id === lessonId);
                  const actionLabel = item.action_type === "level_completed" ? "Completed" : item.action_type === "lesson_viewed" ? "Lesson viewed" : item.action_type === "level_attempted" ? "Game practice" : "Learning activity";
                  const level = item.level_id
                    ? levelMap.get(item.level_id)
                    : undefined;
                  return (
                    <tr key={item.id}>
                      <td data-label="Activity">
                        <span
                          className={`history-type ${item.action_type === "level_completed" ? "success" : ""}`}
                        >
                          {item.action_type === "level_completed" ? "✓" : "⌘"}
                        </span>
                        {actionLabel}
                      </td>
                      <td data-label="Content">
                        {level?.title ?? viewedLesson?.title ?? "Learning session"}
                        {level && <small>Level {level.level_number}</small>}
                      </td>
                      <td data-label="XP">{item.xp_earned ? `+${item.xp_earned}` : "—"}</td>
                      <td data-label="Time">
                        {item.duration_seconds
                          ? formatDuration(item.duration_seconds)
                          : "—"}
                      </td>
                      <td data-label="Date">{formatDate(item.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel achievements-progress-panel">
        <div className="panel-title-row">
          <div>
            <span className="panel-kicker">COLLECTION</span>
            <h2>Achievements</h2>
          </div>
          <span className="muted-kicker">{earnedCount} earned</span>
        </div>
        <div className="achievement-grid">
          {achievements.map((a) => (
            <div
              className={`achievement-card ${a.earned_at ? "earned" : "locked"}`}
              key={a.id}
            >
              <span className="achievement-icon">{a.icon}</span>
              <div>
                <b>{a.name}</b>
                <p>{a.description}</p>
                <small>
                  {a.earned_at
                    ? `Earned ${formatDate(a.earned_at)}`
                    : "Keep learning to unlock"}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
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
      .select("id,action_type,xp_earned,duration_seconds,created_at,level_id")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const levelMap = new Map(learning.levels.map((level) => [level.id, level])),
    history = activityResult.data ?? [],
    earnedCount = achievements.filter((a) => a.earned_at).length,
    xpInLevel = stats.xp % 500,
    xpToNext = xpInLevel ? 500 - xpInLevel : 500;
  return (
    <main className="page-container progress-page">
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
          <strong>{stats.overallPct}%</strong>
          <span>complete</span>
          <small>
            {stats.challengesDone} of {stats.totalLevels} levels
          </small>
        </div>
      </section>
      <section className="metric-grid">
        <article className="metric-card metric-card-progress">
          <span>Overall Progress</span>
          <strong>{stats.overallPct}%</strong>
          <div className="progress-track">
            <span style={{ width: `${stats.overallPct}%` }} />
          </div>
          <small>{stats.challengesDone} levels completed</small>
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
          <span>Play Time</span>
          <strong>{formatDuration(stats.playTimeSeconds)}</strong>
          <small>
            {stats.attempts.toLocaleString()} attempts ·{" "}
            {stats.mistakes.toLocaleString()} mistakes
          </small>
        </article>
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
                      {completion.gamesDone}/{completion.gamesTotal} games
                    </strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <small>{pct}% complete{learning.completion.get(lesson.id)?.pythonRequired && (learning.completion.get(lesson.id)?.pythonDone ? " (Python submitted)" : " (Python pending)")}</small>
                </Link>
              );
            })}
          </div>
        </article>
        <article className="panel progress-ring-panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-kicker">LEVEL STATUS</span>
              <h2>Current Level</h2>
            </div>
          </div>
          <div
            className="progress-ring-large"
            style={{ "--pct": `${stats.xpPct}%` } as React.CSSProperties}
          >
            <div>
              <strong>{stats.level}</strong>
              <small>Level</small>
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
            <h2>Learning History</h2>
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
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Level</th>
                  <th>XP</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const level = item.level_id
                    ? levelMap.get(item.level_id)
                    : undefined;
                  return (
                    <tr key={item.id}>
                      <td>
                        <span
                          className={`history-type ${item.action_type === "level_completed" ? "success" : ""}`}
                        >
                          {item.action_type === "level_completed" ? "✓" : "⌘"}
                        </span>
                        {item.action_type === "level_completed"
                          ? "Completed"
                          : "Attempted"}
                      </td>
                      <td>
                        {level?.title ?? "Learning session"}
                        {level && <small>Level {level.level_number}</small>}
                      </td>
                      <td>{item.xp_earned ? `+${item.xp_earned}` : "—"}</td>
                      <td>
                        {item.duration_seconds
                          ? formatDuration(item.duration_seconds)
                          : "—"}
                      </td>
                      <td>{formatDate(item.created_at)}</td>
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

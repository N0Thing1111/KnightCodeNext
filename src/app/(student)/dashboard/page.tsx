import { Fragment } from "react";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { formatDuration } from "@/lib/format";
import {
  getAchievements,
  getStudentLearningData,
  getStudentStats,
} from "@/lib/student-data";
import { createClient } from "@/lib/supabase/server";
import { isGameLevelAvailable } from "@/lib/game-build";

export default async function DashboardPage() {
  const student = await requireStudent();
  const supabase = await createClient();
  const [stats, learning, achievements, activityResult] = await Promise.all([
    getStudentStats(student),
    getStudentLearningData(student.id),
    getAchievements(student.id),
    supabase
      .from("student_activity")
      .select("id,action_type,xp_earned,duration_seconds,created_at,level_id")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const progress = new Map(learning.progress.map((row) => [row.level_id, row]));
  const playableLevels = learning.levels.filter(
    (level) =>
      learning.playable.has(level.id) &&
      isGameLevelAvailable(level),
  );
  const nextLevel =
    playableLevels.find((level) => !progress.get(level.id)?.completed) ??
    playableLevels[0];
  const allLevelsComplete = Boolean(
    playableLevels.length &&
    playableLevels.every((level) => progress.get(level.id)?.completed),
  );
  const currentLesson = nextLevel
    ? learning.lessons.find((lesson) => lesson.id === nextLevel.lesson_id)
    : undefined;
  const lessonLevels = nextLevel
    ? learning.levels.filter((level) => level.lesson_id === nextLevel.lesson_id)
    : [];
  const lessonDone = lessonLevels.filter(
    (level) => progress.get(level.id)?.completed,
  ).length;
  const lessonPct = currentLesson ? learning.completion.get(currentLesson.id)?.pct || 0 : 0;
  const nextIndex = nextLevel
    ? learning.levels.findIndex((level) => level.id === nextLevel.id)
    : 0;
  const upcoming = learning.levels.slice(
    Math.max(0, nextIndex),
    Math.max(0, nextIndex) + 5,
  );
  const levelMap = new Map(learning.levels.map((level) => [level.id, level]));
  const recent = (activityResult.data ?? [])
    .filter((row) => !row.level_id || levelMap.has(row.level_id))
    .slice(0, 5);
  const earned = achievements.filter((badge) => badge.earned_at).slice(0, 4);
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const activeDates = new Set(
    (activityResult.data ?? []).map((row) =>
      new Date(row.created_at).toISOString().slice(0, 10),
    ),
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMinutes = Math.floor(
    (activityResult.data ?? [])
      .filter((row) => row.created_at.startsWith(todayKey))
      .reduce((sum, row) => sum + row.duration_seconds, 0) / 60,
  );
  const goalPct = Math.min(100, Math.round((todayMinutes / 30) * 100));
  const xpInLevel = stats.xp % 500;
  const xpToNext = xpInLevel ? 500 - xpInLevel : 500;
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <main className="page-container dashboard-page quest-dashboard">
      <section className="dashboard-welcome">
        <div>
          <h1>Your next move, {student.name}.</h1>
          <p>Think it through. Write your code. See where it takes you.</p>
        </div>
        <Link className="welcome-link" href="/lessons">
          View learning path <span>→</span>
        </Link>
      </section>
      <div className="quest-stage">
        <article className="panel continue-card">
          <div className="panel-title-row">
            <div>
              <h2>
                {allLevelsComplete ? "Keep exploring" : "Continue your quest"}
              </h2>
            </div>
            <Link href="/lessons">All lessons →</Link>
          </div>
          {nextLevel && currentLesson ? (
            <>
              <div className="continue-content">
                <div className="continue-art">
                  <span>⌘</span>
                  <small>LEVEL {nextLevel.level_number}</small>
                </div>
                <div className="continue-copy">
                  <span className="muted-kicker">
                    Lesson {currentLesson.order_number} · {currentLesson.title}
                  </span>
                  <h3>{nextLevel.title}</h3>
                  <p>{nextLevel.description}</p>
                  <div className="inline-progress">
                    <span style={{ width: `${lessonPct}%` }} />
                  </div>
                  <small>
                    {lessonDone} of {lessonLevels.length} levels complete
                  </small>
                </div>
              </div>
              <div className="card-actions">
                <Link
                  className="btn btn-primary quest-play"
                  href={`/play/${nextLevel.id}`}
                >
                  {allLevelsComplete ? "Replay Level" : "Play Level"}{" "}
                  <span>↗</span>
                </Link>
                <Link
                  className="btn btn-secondary"
                  href={`/lesson/${currentLesson.id}`}
                >
                  {allLevelsComplete ? "Review Lesson" : "Continue Lesson"}{" "}
                  <span>→</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">
              No lessons have been assigned yet. Your teacher&apos;s assignments
              will appear here.
            </div>
          )}
        </article>
        <section
          className="dashboard-hero quest-rank"
          aria-label="KnightCode progress summary"
        >
          <div className="hero-character">
            <div className="hero-character-glow">
              <img
                src="/assets/img/knight-logo.png"
                alt="KnightCode knight crest"
              />
            </div>
            <span className="crest-orbit orbit-a" aria-hidden="true" />
            <span className="crest-orbit orbit-b" aria-hidden="true" />
          </div>
          <div className="hero-level-copy">
            <h2>{stats.rank}</h2>
            <strong>Level {stats.level}</strong>
            <p>
              {xpToNext.toLocaleString()} XP to Level {stats.level + 1}
            </p>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-icon">⭐</span>
            <b>{stats.xp.toLocaleString()}</b>
            <small>Total XP</small>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-icon">🔥</span>
            <b>{stats.streak}</b>
            <small>Day streak</small>
          </div>
          <div className="hero-progress">
            <div className="hero-progress-head">
              <span>Level {stats.level} Progress</span>
              <strong>{stats.xpPct}%</strong>
            </div>
            <div className="progress-track progress-track-hero">
              <span style={{ width: `${stats.xpPct}%` }} />
            </div>
            <small>{xpInLevel.toLocaleString()} / 500 XP this level</small>
          </div>
        </section>
      </div>
      <section className="panel learning-path-card">
        <div className="panel-title-row">
          <div>
            <h2>Your Learning Path</h2>
            <p>
              Move through the seven programming concepts and their playable
              levels.
            </p>
          </div>
          <Link href="/lessons">Explore lessons →</Link>
        </div>
        <div className="learning-path">
          {learning.lessons.map((lesson, index) => {
            const completion = learning.completion.get(lesson.id)!;
            const pct = completion.pct,
              state =
                pct >= 100
                  ? "completed"
                  : nextLevel?.lesson_id === lesson.id
                    ? "current"
                    : "upcoming";
            return (
              <Fragment key={lesson.id}>
                <Link
                  className={`path-node ${state}`}
                  href={`/lesson/${lesson.id}`}
                  aria-label={`Lesson ${lesson.order_number} ${lesson.title}`}
                >
                  <span className="path-dot">
                    {state === "completed" ? "✓" : lesson.order_number}
                  </span>
                  <span className="path-copy">
                    <b>{lesson.title}</b>
                    <small>
                      {completion.gamesDone}/{completion.gamesTotal} available levels
                      {learning.completion.get(lesson.id)?.pythonRequired && (learning.completion.get(lesson.id)?.pythonDone ? " + Python submitted" : " + Python pending")}
                    </small>
                  </span>
                  <span className="path-percent">{pct}%</span>
                </Link>
                {index < learning.lessons.length - 1 && (
                  <span
                    className={`path-connector ${pct >= 100 ? "complete" : ""}`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </section>
      <section className="dashboard-grid dashboard-grid-mid">
        <article className="panel activity-summary-card">
          <div className="panel-title-row">
            <div>
              <h2>Activity Summary</h2>
            </div>
            <Link href="/progress">Details →</Link>
          </div>
          <div className="summary-stat-grid">
            <div>
              <span className="summary-icon">◷</span>
              <small>Total play time</small>
              <strong>{formatDuration(stats.playTimeSeconds)}</strong>
            </div>
            <div>
              <span className="summary-icon">⌘</span>
              <small>Total attempts</small>
              <strong>{stats.attempts.toLocaleString()}</strong>
            </div>
            <div>
              <span className="summary-icon summary-danger">×</span>
              <small>Total mistakes</small>
              <strong>{stats.mistakes.toLocaleString()}</strong>
            </div>
            <div>
              <span className="summary-icon summary-success">✓</span>
              <small>Levels completed</small>
              <strong>
                {stats.challengesDone}/{stats.totalLevels}
              </strong>
            </div>
          </div>
          <div className="summary-footer">
            <span>Assigned work progress (games + Python)</span>
            <strong>{stats.overallPct}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${stats.overallPct}%` }} />
          </div>
        </article>
        <article className="panel streak-card">
          <div className="panel-title-row">
            <div>
              <h2>Current Streak</h2>
            </div>
            <span className="streak-flame">🔥</span>
          </div>
          <div className="streak-number">
            <strong>{stats.streak}</strong>
            <span>days</span>
          </div>
          <p>
            {stats.streak > 0
              ? "Great momentum. Complete another challenge today to keep your streak alive."
              : "Complete a challenge today to start your learning streak."}
          </p>
          <div className="week-row" aria-label="This week's activity">
            {dayLabels.map((label, index) => {
              const date = new Date(monday);
              date.setDate(monday.getDate() + index);
              const done = activeDates.has(date.toISOString().slice(0, 10));
              return (
                <span key={index}>
                  <small>{label}</small>
                  <i className={`day-dot ${done ? "done" : ""}`}>
                    {done ? "✓" : ""}
                  </i>
                </span>
              );
            })}
          </div>
        </article>
        <article className="panel progress-overview-card">
          <div className="panel-title-row">
            <div>
              <h2>Progress Overview</h2>
            </div>
            <Link href="/progress">Open →</Link>
          </div>
          <div className="overview-flex">
            <div
              className="donut"
              style={{ "--pct": `${stats.overallPct}%` } as React.CSSProperties}
            >
              <strong>{stats.overallPct}%</strong>
              <small>complete</small>
            </div>
            <div className="overview-list">
              <div>
                <span>Levels</span>
                <b>
                  {stats.challengesDone}/{stats.totalLevels}
                </b>
              </div>
              <div>
                <span>Python submitted</span>
                <b>{stats.pythonDone}/{stats.pythonTotal}</b>
              </div>
              <div>
                <span>XP</span>
                <b>{stats.xp.toLocaleString()}</b>
              </div>
            </div>
          </div>
        </article>
      </section>
      <div className="quest-practice-row">
        <article className="panel challenge-card">
          <div className="panel-title-row">
            <div>
              <h2>Put it into practice</h2>
            </div>
            <span className="challenge-badge">+XP</span>
          </div>
          {allLevelsComplete ? (
            <>
              <div className="challenge-art">
                <span>✓</span>
                <div>
                  <b>Assigned work complete</b>
                  <small>All assigned levels finished</small>
                </div>
              </div>
              <h3>You&apos;ve completed every assigned challenge.</h3>
              <p>
                Review an assigned lesson or replay a completed level whenever
                you want to sharpen your skills.
              </p>
              <Link
                className="btn btn-primary btn-block"
                href="/lessons#levels"
              >
                Review Challenges <span>→</span>
              </Link>
            </>
          ) : nextLevel ? (
            <>
              <div className="challenge-art">
                <span>⚔</span>
                <div>
                  <b>Level {nextLevel.level_number}</b>
                  <small>{nextLevel.difficulty}</small>
                </div>
              </div>
              <h3>{nextLevel.title}</h3>
              <p>Put your instructions to the test in the puzzle room.</p>
              <Link
                className="btn btn-primary btn-block"
                href={`/play/${nextLevel.id}`}
              >
                Start Challenge <span>→</span>
              </Link>
            </>
          ) : (
            <div className="empty-state">
              No challenge has been assigned yet.
            </div>
          )}
        </article>
        <section className="daily-goal-strip">
          <div>
            <span className="goal-icon">⚡</span>
            <div>
              <strong>Today&apos;s learning goal</strong>
              <small>{todayMinutes} of 30 minutes logged today</small>
            </div>
          </div>
          <div className="goal-progress">
            <span style={{ width: `${goalPct}%` }} />
          </div>
          <b>{goalPct}%</b>
        </section>
      </div>
      <section className="dashboard-grid dashboard-grid-bottom">
        <article className="panel upcoming-card">
          <div className="panel-title-row">
            <div>
              <h2>Upcoming Levels</h2>
            </div>
            <Link href="/lessons#levels">All levels →</Link>
          </div>
          <div className="upcoming-list">
            {!upcoming.length ? (
              <div className="empty-state">
                You have reached the end of the active levels. 🎉
              </div>
            ) : (
              upcoming.map((level) => {
                const canPlay =
                    learning.playable.has(level.id) &&
                    isGameLevelAvailable(level),
                  row = progress.get(level.id),
                  isNext = nextLevel?.id === level.id,
                  status = row?.completed
                    ? "Completed"
                    : !canPlay
                      ? "Locked"
                      : isNext
                        ? "Next up"
                        : row?.attempts
                          ? "In progress"
                          : "Upcoming";
                return canPlay ? (
                  <Link
                    className="upcoming-item"
                    href={`/play/${level.id}`}
                    key={level.id}
                  >
                    <span className="number-box">{level.level_number}</span>
                    <span>
                      <b>{level.title}</b>
                      <small>{level.difficulty}</small>
                    </span>
                    <em
                      className={`upcoming-status ${status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {status}
                    </em>
                  </Link>
                ) : (
                  <div className="upcoming-item locked" key={level.id}>
                    <span className="number-box">🔒</span>
                    <span>
                      <b>{level.title}</b>
                      <small>{level.difficulty}</small>
                    </span>
                    <em className="upcoming-status locked">Locked</em>
                  </div>
                );
              })
            )}
          </div>
        </article>
        <article className="panel recent-card">
          <div className="panel-title-row">
            <div>
              <h2>Recent Activity</h2>
            </div>
            <Link href="/progress">View history →</Link>
          </div>
          {!recent.length ? (
            <div className="empty-state">
              Your learning activity will appear here after your first
              challenge.
            </div>
          ) : (
            <div className="activity-feed">
              {recent.map((item) => (
                <div className="feed-row" key={item.id}>
                  <span
                    className={`feed-icon ${item.action_type === "level_completed" ? "success" : ""}`}
                  >
                    {item.action_type === "level_completed" ? "✓" : "⌘"}
                  </span>
                  <div>
                    <b>
                      {item.action_type === "level_completed"
                        ? "Completed"
                        : "Played"}{" "}
                      {item.level_id
                        ? `Level ${levelMap.get(item.level_id)?.level_number} · ${levelMap.get(item.level_id)?.title}`
                        : "Learning session"}
                    </b>
                    <small>{new Date(item.created_at).toLocaleString()}</small>
                  </div>
                  <strong>
                    {item.xp_earned ? `+${item.xp_earned} XP` : ""}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="panel achievements-card">
          <div className="panel-title-row">
            <div>
              <h2>Latest Achievements</h2>
            </div>
            <Link href="/profile#achievements">View all →</Link>
          </div>
          {!earned.length ? (
            <div className="empty-state">
              Complete your first level to unlock a badge.
            </div>
          ) : (
            <div className="achievement-mini-grid">
              {earned.map((badge) => (
                <div className="achievement-mini" key={badge.id}>
                  <span>{badge.icon}</span>
                  <div>
                    <b>{badge.name}</b>
                    <small>{badge.description}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

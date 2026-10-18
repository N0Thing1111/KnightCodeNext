import { lessonCompletion } from "@/lib/lesson-completion";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import {
  assignedLevelIds,
  assignmentCounts,
  avatar,
  formatTime,
  getTeacherContext,
  teacherStudents,
} from "@/lib/teacher-data";
import { resetStudentPassword } from "@/app/actions/teacher";
import { Back } from "@/components/teacher-ui";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, q, t, jar] = await Promise.all([
      params,
      searchParams,
      requireTeacher(),
      cookies(),
    ]),
    ctx = await getTeacherContext(t.id),
    summary = teacherStudents(ctx).find((s) => s.id === id);
  if (!summary) notFound();
  const cls = ctx.memberships
      .filter((m) => m.student_id === id)
      .map((m) => ctx.classes.find((c) => c.id === m.class_id))
      .filter(Boolean),
    scope = assignedLevelIds(ctx, id),
    progress = ctx.levels
      .filter((l) => scope.has(Number(l.id)))
      .map((l) => ({
        ...l,
        ...ctx.progress.find((p) => p.student_id === id && p.level_id === l.id),
      })),
    assignments = ctx.assignments
      .filter(
        (a) => a.student_id === id || cls.some((c) => c!.id === a.class_id),
      )
      .slice(0, 10);
  const [activityResult, achievementResult] = await Promise.all([
    createAdminClient().from("student_activity").select("*").eq("student_id", id).order("created_at", { ascending: false }).order("id").limit(30),
    createAdminClient().from("student_achievements").select("*,achievements(*)").eq("student_id", id),
  ]);
  if (activityResult.error || achievementResult.error) throw Error("Unable to load student activity.");
  const activity = activityResult.data || [], ach = achievementResult.data || [];
  const sessionPage = Math.max(
    1,
    Math.min(100000, Math.floor(Number(q.sessions)) || 1),
  );
  const {
    data: savedSessions,
    count: sessionCount,
    error: sessionError,
  } = await createAdminClient()
    .from("student_level_sessions")
    .select("*", { count: "exact" })
    .eq("student_id", id)
    .in("level_id", [...scope])
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .range((sessionPage - 1) * 50, sessionPage * 50 - 1);
  if (sessionError) throw new Error("Unable to load student sessions.");
  const sessions = savedSessions ?? [];
  let flash: any = null;
  try {
    flash = JSON.parse(jar.get("kc_teacher_flash")?.value || "null");
  } catch {}
  const assignedLessons = new Set(ctx.assignments.filter(a => !a.level_id && (a.student_id === id || cls.some(c => c!.id === a.class_id))).map(a => Number(a.lesson_id)));
  const completedLessons = ctx.lessons.filter(l => assignedLessons.has(Number(l.id)) && lessonCompletion(Number(l.id), id, ctx.levels, ctx.progress, ctx.python.activities, ctx.python.submissions).complete).length;
  return (
    <>
      <Back href="/teacher/monitoring" label="Back to monitoring" />
      {q.error && <div className="teacher-alert error">{q.error}</div>}
      {flash && (
        <div className="teacher-alert success">
          ✓ {flash.message} <strong>{flash.password}</strong>{" "}
          <span className="teacher-note">
            {flash.emailSent
              ? "The new password was also emailed to " + flash.email + "."
              : "Email delivery failed or is not configured. Copy and share this password securely."}
          </span>
        </div>
      )}
      <section className="student-hero">
        <div className="student-profile-large">
          <span className="teacher-avatar xl">
            {avatar(summary.avatar_key)}
          </span>
          <div>
            <span className="teacher-eyebrow">STUDENT PROFILE</span>
            <h2>{summary.name}</h2>
            <p>
              {summary.student_id} · {summary.email}
              {summary.username ? " · @" + summary.username : ""}
            </p>
            <div className="student-class-tags">
              {cls.map((c) => (
                <span key={c!.id}>{sectionLabel(c!)}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="student-hero-metrics">
          <div>
            <small>Level</small>
            <strong>{summary.level}</strong>
          </div>
          <div>
            <small>XP</small>
            <strong>{summary.xp.toLocaleString()}</strong>
          </div>
          <div>
            <small>Progress</small>
            <strong>{Math.round(summary.progress_pct)}%</strong>
          </div>
          <div>
            <small>Streak</small>
            <strong>🔥 {summary.streak}</strong>
          </div>
        </div>
      </section>
      <section className="teacher-card">
        <Head eyebrow="ACCOUNT ACCESS" title="Sign-in credentials" />
        <p className="teacher-note">
          Student ID <strong>{summary.student_id}</strong>
          {summary.username ? ", username " + summary.username + "," : ""} and
          email <strong>{summary.email}</strong> can all be used to sign in. If
          the original temporary password wasn&apos;t saved, reset it below —
          the new one is shown once here and emailed to the student when mail
          delivery is available.
        </p>
        <form action={resetStudentPassword}>
          <input type="hidden" name="student_id" value={id} />
          <button className="teacher-btn">Reset Password</button>
        </form>
      </section>
      <div className="teacher-grid three">
        <section className="teacher-card">
          <Head eyebrow="LEARNING" title="Progress Summary" />
          <div className="detail-stat-list">
            <Row a="Lessons completed" b={completedLessons} />
            <Row a="Challenges completed" b={summary.completed_levels} />
            <Row a="Challenge attempts" b={summary.attempts} />
            <Row a="Mistakes" b={summary.mistakes} />
            <Row
              a="Last activity"
              b={
                summary.last_activity
                  ? new Date(summary.last_activity).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
                  : "Never"
              }
            />
          </div>
        </section>
        <section className="teacher-card">
          <Head eyebrow="ACHIEVEMENTS" title={ach.length + " earned"} />
          {ach.length ? (
            <div className="achievement-list">
              {ach.slice(0, 6).map((a: any) => (
                <div key={a.achievement_id}>
                  <span>{a.achievements?.icon}</span>
                  <p>
                    <strong>{a.achievements?.name}</strong>
                    <small>{a.achievements?.description}</small>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="teacher-empty">No achievements earned yet.</div>
          )}
        </section>
        <section className="teacher-card">
          <Head eyebrow="ASSIGNMENTS" title="Recent" />
          {assignments.length ? (
            assignments.map((a) => {
              const counts = assignmentCounts(ctx, a),
                l =
                  ctx.levels.find((x) => x.id === a.level_id) ??
                  ctx.lessons.find((x) => x.id === a.lesson_id);
              return (
                <div className="assignment-row" key={a.id}>
                  <div>
                    <strong>{a.title}</strong>
                    <small>{l?.title ?? "KnightCode"}</small>
                  </div>
                  <span
                    className={
                      "status-badge " + (counts.done ? "completed" : "assigned")
                    }
                  >
                    {counts.done ? "Completed" : "Assigned"}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="teacher-empty">
              No assignments for this student.
            </div>
          )}
        </section>
      </div>
      <details className="teacher-card">
        <summary style={{ cursor: "pointer", padding: "8px 0" }}>
          <span className="teacher-eyebrow">ACTIVITY TIMELINE</span>{" "}
          <strong>Recent KnightCode activity</strong>{" "}
          <span className="teacher-note">(expand / collapse)</span>
        </summary>
        <div
          className="timeline"
          style={{ maxHeight: "24rem", overflowY: "auto", marginTop: 16 }}
        >
          {activity.length ? (
            activity.map((a) => {
              const lv = ctx.levels.find((x) => x.id === a.level_id);
              return (
                <div className="timeline-item" key={a.id}>
                  <span />
                  <time>{new Date(a.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</time>
                  <div>
                    <strong>
                      {String(a.action_type).replaceAll("_", " ")}
                    </strong>
                    <p>
                      {lv?.title ?? "KnightCode activity"}{" "}
                      {a.xp_earned ? "· +" + a.xp_earned + " XP" : ""}
                    </p>
                    {a.duration_seconds > 0 && (
                      <small>
                        {Math.round(a.duration_seconds / 60)} min session
                      </small>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="teacher-empty">No activity has been recorded.</div>
          )}
        </div>
      </details>
      <section className="teacher-card">
        <Head eyebrow="LEVEL-BY-LEVEL" title="Learning Progress" />
        <p className="teacher-note">
          Total lines includes submitted nonblank code across attempts; Best
          Lines is the fewest accepted lines in a completed attempt.
        </p>
        <div className="teacher-table-wrap">
          <table className="teacher-table session-readable-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Mistakes</th>
                <th>Time Spent</th>
                <th>Best Time</th>
                <th>Total Lines Submitted</th>
                <th>Best Lines</th>
                <th>XP</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <strong>
                      #{p.level_number} · {p.title}
                    </strong>
                  </td>
                  <td>{p.difficulty}</td>
                  <td>
                    <span
                      className={
                        "status-badge " + (p.completed ? "on" : "muted")
                      }
                    >
                      {p.completed
                        ? "Completed"
                        : p.attempts
                          ? "Started"
                          : "Not started"}
                    </span>
                  </td>
                  <td>{p.attempts ?? 0}</td>
                  <td>{p.mistakes ?? 0}</td>
                  <td>{formatTime(p.play_time_seconds)}</td>
                  <td>{formatTime(p.best_time_seconds)}</td>
                  <td>{p.lines_used ?? "—"}</td>
                  <td>{p.best_lines_used ?? "—"}</td>
                  <td>{p.xp_earned ?? 0}</td>
                  <td>
                    {p.completed_at
                      ? new Date(p.completed_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="teacher-card" id="level-sessions">
        <Head eyebrow="ATTEMPT RESULTS" title="Level Sessions" />
        <p>
          <Link className="teacher-btn" href={`/teacher/results?student=${id}`}>
            Search this student’s sessions →
          </Link>
        </p>
        <div className="teacher-table-wrap">
          <table className="teacher-table session-readable-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Session</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Mistakes</th>
                <th>Play Time</th>
                <th>Lines</th>
                <th>Code Mode</th>
                <th>Started</th>
                <th>Run history</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length ? (
                sessions.map((s: any) => {
                  const lv = ctx.levels.find((x) => x.id === s.level_id);
                  return (
                    <tr key={s.id}>
                      <td>
                        #{lv?.level_number} · {lv?.title}
                      </td>
                      <td>{s.session_number}</td>
                      <td>{s.completed ? "Completed" : "Unfinished"}</td>
                      <td>{s.attempts}</td>
                      <td>{s.mistakes}</td>
                      <td>{formatTime(s.play_time_seconds)}</td>
                      <td>{s.completed_lines ?? s.lines_used}</td>
                      <td>{s.code_mode ?? "—"}</td>
                      <td>{new Date(s.started_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
                      <td>
                        <Link
                          className="teacher-btn"
                          href={`/teacher/student/${id}/sessions/${s.id}`}
                        >
                          Review Runs
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10}>
                    <div className="teacher-empty">
                      No session results recorded.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(sessionCount ?? 0) > 50 && (
          <nav className="run-pagination" aria-label="Session history pages">
            {sessionPage > 1 && (
              <Link
                className="teacher-btn"
                href={`?sessions=${sessionPage - 1}#level-sessions`}
              >
                Previous 50
              </Link>
            )}
            <span>
              Page {sessionPage} of {Math.ceil((sessionCount ?? 0) / 50)}
            </span>
            {sessionPage * 50 < (sessionCount ?? 0) && (
              <Link
                className="teacher-btn"
                href={`?sessions=${sessionPage + 1}#level-sessions`}
              >
                Next 50
              </Link>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
function Head({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="teacher-card-head">
      <div>
        <span className="teacher-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
    </div>
  );
}
function Row({ a, b }: { a: string; b: React.ReactNode }) {
  return (
    <div>
      <span>{a}</span>
      <b>{b}</b>
    </div>
  );
}

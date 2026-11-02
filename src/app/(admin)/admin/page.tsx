import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getAdminContext, getAdminSessionOverview } from "@/lib/admin-data";
import { getStoredBackupOverview } from "@/lib/automatic-backups";
import { isGameLevelAvailable } from "@/lib/game-build";
import { formatSchoolDateTime } from "@/lib/school-time";

export default async function Page() {
  await requireAdmin();
  const [ctx, sessions, backups] = await Promise.all([
    getAdminContext(),
    getAdminSessionOverview(),
    getStoredBackupOverview().catch(() => null),
  ]);
  const students = ctx.profiles.filter((p) => p.role === "student");
  const teachers = ctx.profiles.filter((p) => p.role === "teacher");
  const activeStudents = students.filter((p) => p.active);
  const members = new Set(ctx.class_students.map((m) => m.student_id));
  const enrolled = activeStudents.filter((p) => members.has(p.id)).length;
  const independent = activeStudents.length - enrolled;
  const pendingTeachers = teachers.filter(
    (p) => p.onboarding_status === "pending",
  ).length;
  const latestSave = backups?.latestSave;
  const weeklyAttempt = backups?.weeklyAttempt;
  const weeklyStatus = !backups
    ? "Unavailable"
    : !weeklyAttempt
      ? "No weekly attempt recorded"
      : weeklyAttempt.status === "ready"
        ? "Completed"
        : weeklyAttempt.status === "running"
          ? "In progress"
          : weeklyAttempt.status === "failed"
            ? "Failed — check backup history"
            : "Expired under retention policy";
  const max = Math.max(1, ...sessions.week.map((day) => day.count));
  return (
    <div className="admin-platform-overview">
      <header className="admin-platform-heading">
        <div>
          <h2>Platform overview</h2>
          <p>Manage accounts, learning content, and platform records.</p>
        </div>
        <Link className="teacher-btn" href="/admin/audit">
          View audit history
        </Link>
      </header>
      <dl className="admin-platform-totals" aria-label="Platform totals">
        <div>
          <dt>Active learners</dt>
          <dd>{activeStudents.length}</dd>
          <small>{students.length} student accounts in total</small>
        </div>
        <div>
          <dt>Active teachers</dt>
          <dd>{teachers.filter((p) => p.active).length}</dd>
          <small>{teachers.length} teacher accounts in total</small>
        </div>
        <div>
          <dt>Active sections</dt>
          <dd>{ctx.classes.filter((c) => c.status === "active").length}</dd>
          <small>Managed by teachers</small>
        </div>
        <div>
          <dt>Game sessions over seven days</dt>
          <dd>{sessions.week.reduce((sum, day) => sum + day.count, 0)}</dd>
          <small>Starts, including unfinished sessions</small>
        </div>
      </dl>
      <div className="admin-platform-columns">
        <section
          className="teacher-card admin-platform-panel"
          aria-labelledby="participation-title"
        >
          <h3 id="participation-title">Accounts and participation</h3>
          <p className="teacher-note">
            Active learners, with or without a section.
          </p>
          <dl className="admin-platform-facts">
            <div>
              <dt>Learners in a section</dt>
              <dd>{enrolled}</dd>
            </div>
            <div>
              <dt>Independent learners</dt>
              <dd>{independent}</dd>
            </div>
            <div>
              <dt>Teacher accounts awaiting email verification</dt>
              <dd>{pendingTeachers}</dd>
            </div>
          </dl>
          <p className="teacher-note">
            Active accounts only; section memberships include archived sections.
          </p>
          <div className="admin-actions">
            <Link className="teacher-btn" href="/admin/manage/students">
              Student accounts
            </Link>
            <Link className="teacher-btn" href="/admin/manage/teachers">
              Teacher accounts
            </Link>
          </div>
        </section>
        <section
          className="teacher-card admin-platform-panel"
          aria-labelledby="backups-title"
        >
          <h3 id="backups-title">Backups and recovery</h3>
          <p className="teacher-note">
            Stored recovery points for platform records.
          </p>
          {backups ? (
            <>
              <dl className="admin-platform-facts">
                <div>
                  <dt>Latest available save</dt>
                  <dd>
                    {latestSave
                      ? formatSchoolDateTime(latestSave.snapshot_at)
                      : "No saved backups yet"}
                  </dd>
                </div>
                <div>
                  <dt>Latest weekly attempt</dt>
                  <dd
                    className={
                      weeklyAttempt?.status === "failed"
                        ? "admin-platform-warning"
                        : undefined
                    }
                  >
                    {weeklyStatus}
                  </dd>
                </div>
              </dl>
              {weeklyAttempt && (
                <p className="teacher-note">
                  Attempt started{" "}
                  {formatSchoolDateTime(weeklyAttempt.started_at)} (UTC+8).
                  Check history for backup issues.
                </p>
              )}
              {!latestSave && (
                <p className="teacher-note">
                  Create a backup before making changes you may need to undo.
                </p>
              )}
            </>
          ) : (
            <p className="teacher-alert error" role="status">
              Backup status could not be loaded. Open backup history to retry
              and check the connection.
            </p>
          )}
          <Link className="teacher-btn primary" href="/admin/backup">
            Open backups
          </Link>
        </section>
        <section
          className="teacher-card admin-platform-panel"
          aria-labelledby="usage-title"
        >
          <div className="teacher-card-head">
            <h3 id="usage-title">Game activity over seven days</h3>
            <Link href="/admin/results">Inspect learning records</Link>
          </div>
          {sessions.week.some((day) => day.count > 0) ? (
            <div
              className="teacher-bars admin-platform-bars"
              aria-label="Game sessions started each day"
            >
              {sessions.week.map((day) => (
                <div key={day.label}>
                  <span
                    aria-hidden="true"
                    style={{
                      height:
                        Math.max(2, Math.round((day.count / max) * 100)) + "%",
                    }}
                  />
                  <small>{day.label}</small>
                  <b>{day.count}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="teacher-empty">
              No game sessions were started in the last seven days.
            </p>
          )}
          <p className="teacher-note">
            Game starts only, including unfinished sessions. Excludes Python
            runs; not a measure of mastery.
          </p>
        </section>
        <section
          className="teacher-card admin-platform-panel"
          aria-labelledby="content-title"
        >
          <h3 id="content-title">Shared learning content</h3>
          <p className="teacher-note">
            Content for class assignments and independent learning.
          </p>
          <div className="admin-platform-links">
            <Link href="/admin/manage/lessons">
              <span>
                <strong>Lessons and Python activities</strong>
                <small>
                  {ctx.lessons.filter((l) => l.active).length} active lessons.
                  Edit Python activities inside each lesson.
                </small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/admin/manage/levels">
              <span>
                <strong>Game levels</strong>
                <small>
                  {
                    ctx.levels.filter(
                      (l) => l.active && isGameLevelAvailable(l),
                    ).length
                  }{" "}
                  active, available levels out of {ctx.levels.length} level
                  records.
                </small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/admin/manage/classes">
              <span>
                <strong>Section oversight</strong>
                <small>Manage teachers and section memberships.</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
      <section
        className="teacher-card admin-platform-tools"
        aria-labelledby="operations-title"
      >
        <div>
          <h3 id="operations-title">Platform operations</h3>
          <p className="teacher-note">
            Audit activity, clear records, and update support details.
          </p>
        </div>
        <div className="admin-actions">
          <Link className="teacher-btn" href="/admin/audit">
            Audit history
          </Link>
          <Link className="teacher-btn" href="/admin/data">
            Data management
          </Link>
          <Link className="teacher-btn" href="/admin/settings#support">
            Support settings
          </Link>
        </div>
      </section>
    </div>
  );
}

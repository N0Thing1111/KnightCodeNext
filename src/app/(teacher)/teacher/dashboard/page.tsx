import { activityWeek } from "@/lib/activity-week";
import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import {
  avatar,
  getTeacherContext,
  teacherStats,
  teacherStudents,
} from "@/lib/teacher-data";
export default async function Page() {
  const t = await requireTeacher(),
    ctx = await getTeacherContext(t.id),
    stats = teacherStats(ctx),
    students = teacherStudents(ctx),
    attention = students
      .filter((s) => s.status === "Needs Attention")
      .slice(0, 5);
  const classCards = ctx.classes
    .filter((c) => c.status === "active")
    .slice(0, 6)
    .map((c) => {
      const ids = ctx.memberships
          .filter((m) => m.class_id === c.id)
          .map((m) => m.student_id),
        rows = students.filter((s) => ids.includes(s.id));
      return {
        ...c,
        count: ids.length,
        avg: rows.length
          ? Math.round(
              rows.reduce((n, s) => n + s.progress_pct, 0) / rows.length,
            )
          : 0,
      };
    });
  const activity = ctx.activity.slice(0, 8);
  const week = activityWeek().map(day => ({ label: day.label, count: Number(ctx.activityDays.find(d => d.day === day.key)?.count || 0) }));
  const max = Math.max(1, ...week.map(x => x.count));
  return (
    <>
      <section className="teacher-page-hero">
        <div>
          <span className="teacher-eyebrow">COMMAND CENTER</span>
          <h2>Good day, {t.name.split(" ")[0]}.</h2>
          <p>
            Monitor real KnightCode learning activity, support students, and
            keep your sections moving forward.
          </p>
        </div>
        <Link
          prefetch={false}
          className="teacher-btn primary"
          href="/teacher/classes?action=new"
        >
          + Create Section
        </Link>
      </section>
      <div className="teacher-metric-grid">
        <Metric
          icon="👥"
          label="Total Students"
          value={stats.students}
          note={stats.active_students + " active this week"}
        />
        <Metric
          icon="▦"
          label="Active Sections"
          value={stats.classes}
          note={stats.avg_progress + "% avg progress"}
        />
        <Metric
          icon="⚡"
          label="Average XP"
          value={stats.avg_xp}
          note="Across your sections"
        />
        <Metric
          icon="!"
          label="Needs Attention"
          value={stats.needs_attention}
          note="Students to review"
          warning
        />
      </div>
      <div className="teacher-grid two">
        <section className="teacher-card">
          <Head
            eyebrow="SECTION PERFORMANCE"
            title="Your Sections"
            href="/teacher/classes"
            label="View all"
          />
          <div className="class-progress-list">
            {classCards.length ? (
              classCards.map((c) => (
                <Link
                  prefetch={false}
                  className="class-progress-row"
                  href={"/teacher/class/" + c.id}
                  key={c.id}
                >
                  <div>
                    <strong>{sectionLabel(c)}</strong>
                    <small>{c.subject}</small>
                  </div>
                  <div className="class-progress-meter">
                    <span style={{ width: c.avg + "%" }} />
                  </div>
                  <b>{c.avg}%</b>
                  <em>{c.count} students</em>
                </Link>
              ))
            ) : (
              <div className="teacher-empty">
                No sections yet. Create your first section to start managing
                students.
              </div>
            )}
          </div>
        </section>
        <section className="teacher-card">
          <Head eyebrow="ACTIVITY" title="Last 7 Days" />
          <div className="teacher-bars">
            {week.map((w) => (
              <div key={w.label}>
                <span
                  style={{
                    height:
                      Math.max(4, Math.round((w.count / max) * 100)) + "%",
                  }}
                />
                <small>{w.label}</small>
                <b>{w.count}</b>
              </div>
            ))}
          </div>
          <p className="teacher-note">
            Activity counts include lesson and challenge interactions recorded
            by KnightCode.
          </p>
        </section>
      </div>
      <div className="teacher-grid two">
        <section className="teacher-card">
          <Head
            eyebrow="STUDENT SUPPORT"
            title="Students Needing Attention"
            href="/teacher/monitoring?status=Needs%20Attention"
            label="Open monitoring"
          />
          {attention.length ? (
            attention.map((s) => (
              <Link
                prefetch={false}
                className="attention-row"
                href={"/teacher/student/" + s.id}
                key={s.id}
              >
                <span className="teacher-avatar">{avatar(s.avatar_key)}</span>
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.classes}</small>
                </div>
                <span className="status-badge needs">Needs Attention</span>
                <b>{Math.round(s.progress_pct)}%</b>
              </Link>
            ))
          ) : (
            <div className="teacher-empty success">
              ✓ No students currently flagged.
            </div>
          )}
        </section>
        <section className="teacher-card">
          <Head
            eyebrow="RECENT EVENTS"
            title="Student Activity"
            href="/teacher/monitoring"
            label="View monitoring"
          />
          <div className="teacher-activity-feed">
            {activity.length ? (
              activity.map((a) => {
                const s = students.find((x) => x.id === a.student_id),
                  lv = ctx.levels.find((x) => x.id === a.level_id);
                return (
                  <div key={a.id}>
                    <span>•</span>
                    <p>
                      <strong>{s?.name ?? "Student"}</strong>{" "}
                      {String(a.action_type).replaceAll("_", " ")}{" "}
                      {lv?.title ?? "KnightCode"}
                      <small>
                        {new Date(a.created_at).toLocaleString()}{" "}
                        {a.xp_earned ? "· +" + a.xp_earned + " XP" : ""}
                      </small>
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="teacher-empty">No activity recorded yet.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
function Metric(p: {
  icon: string;
  label: string;
  value: number;
  note: string;
  warning?: boolean;
}) {
  return (
    <div className={"teacher-metric " + (p.warning ? "warning" : "")}>
      <span>{p.icon}</span>
      <div>
        <small>{p.label}</small>
        <strong>{p.value}</strong>
        <em>{p.note}</em>
      </div>
    </div>
  );
}
function Head({
  eyebrow,
  title,
  href,
  label,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="teacher-card-head">
      <div>
        <span className="teacher-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {href && (
        <Link prefetch={false} href={href}>
          {label}
        </Link>
      )}
    </div>
  );
}

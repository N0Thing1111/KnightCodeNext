import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getAdminContext, getAdminSessionOverview, setting } from "@/lib/admin-data";
import { CardHead } from "@/components/admin-ui";
export default async function Page() {
  const admin = await requireAdmin(),
    ctx = await getAdminContext(),
    sessionOverview = await getAdminSessionOverview(),
    students = ctx.profiles.filter((p) => p.role === "student"),
    teachers = ctx.profiles.filter((p) => p.role === "teacher"),
    classes = ctx.classes.filter((c) => c.status === "active"),
    recent = sessionOverview.recent,
    week = sessionOverview.week,
    max = Math.max(1, ...week.map((x) => x.count));
  return (
    <>
      <section className="teacher-page-hero admin-welcome">
        <div>
          <span className="teacher-eyebrow">YOUR SCHOOL COMMAND CENTER</span>
          <h2>Good day, {admin.name.split(" ")[0]}.</h2>
          <p>
            A little guidance goes a long way. Here&apos;s what&apos;s happening
            across your KnightCode community.
          </p>
          <div className="admin-actions">
            <Link
              className="teacher-btn primary"
              href="/admin/manage/teachers?edit=new"
            >
              + Welcome a teacher
            </Link>
            <Link className="teacher-btn" href="/admin/results">
              Explore session results →
            </Link>
          </div>
        </div>
        <div className="admin-welcome-art">
          <span className="admin-art-orbit" />
          <img src="/assets/img/knight-logo.png" alt="" />
          <span className="admin-art-code">&lt;learn /&gt;</span>
        </div>
      </section>
      <div className="teacher-metric-grid">
        {[
          [
            students.length,
            "♙",
            "Students",
            "Learning across KnightCode",
            "students",
          ],
          [
            teachers.length,
            "♜",
            "Teachers",
            "Guiding the next generation",
            "teachers",
          ],
          [
            classes.length,
            "▦",
            "Sections",
            "Spaces for shared learning",
            "classes",
          ],
          [
            ctx.lessons.length,
            "▤",
            "Lessons",
            ctx.levels.length + " level challenges",
            "lessons",
          ],
        ].map(([n, icon, label, note, path]) => (
          <Link
            key={String(label)}
            className="teacher-metric admin-metric-link"
            href={"/admin/manage/" + path}
          >
            <span>{icon}</span>
            <div>
              <small>{label}</small>
              <strong>{n}</strong>
              <em>{note}</em>
            </div>
          </Link>
        ))}
      </div>
      <div className="teacher-grid two">
        <section className="teacher-card">
          <CardHead eyebrow="LEARNING PULSE" title="A week of discovery" />
          <div className="teacher-bars">
            {week.map((w) => (
              <div key={w.label}>
                <span
                  style={{
                    height:
                      Math.max(2, Math.round((w.count / max) * 100)) + "%",
                  }}
                />
                <small>{w.label}</small>
                <b>{w.count}</b>
              </div>
            ))}
          </div>
          <p className="teacher-note">
            Game sessions started over the last seven days, including unfinished
            sessions.
          </p>
        </section>
        <section className="teacher-card">
          <CardHead
            eyebrow="YOUR COMMUNITY"
            title="Inside the classroom"
            href="/admin/manage/classes"
            label="All sections →"
          />
          {classes.slice(0, 4).map((c) => {
            const t = teachers.find((x) => x.id === c.teacher_id),
              count = ctx.class_students.filter(
                (x) => x.class_id === c.id,
              ).length;
            return (
              <Link
                className="admin-community-row"
                key={c.id}
                href={"/admin/classes/" + c.id}
              >
                <span className="admin-section-icon">▦</span>
                <span>
                  <strong>{sectionLabel(c)}</strong>
                  <small>
                    {c.subject} · {t?.name}
                  </small>
                </span>
                <span className="admin-role-badge">{count} students</span>
              </Link>
            );
          })}
        </section>
      </div>
      <div className="teacher-grid two">
        <section className="teacher-card">
          <CardHead
            eyebrow="RECENT LEARNING"
            title="Every attempt tells a story"
            href="/admin/results"
            label="View results →"
          />
          <div className="teacher-activity-feed">
            {recent.length ? (
              recent.map((s) => {
                const p = students.find((x) => x.id === s.student_id),
                  l = ctx.levels.find((x) => x.id === s.level_id);
                return (
                  <div key={s.id}>
                    <span>{s.completed ? "✓" : "◷"}</span>
                    <p>
                      <strong>{p?.name ?? "Student"}</strong>{" "}
                      {s.completed ? "completed" : "started"} Level{" "}
                      {l?.level_number}
                      <small>
                        {new Date(s.started_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} ·{" "}
                        {s.completed
                          ? s.play_time_seconds + " seconds"
                          : "Session started"}
                      </small>
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="teacher-empty">
                Ready for the first adventure.
              </div>
            )}
          </div>
        </section>
        <section className="teacher-card admin-next-card">
          <CardHead
            eyebrow="KEEP THINGS MOVING"
            title={
              "What’s next for " +
              setting(ctx, "platform_name", "KnightCode") +
              "?"
            }
          />
          {[
            [
              "/admin/manage/lessons",
              "▤",
              "Shape the next lesson",
              "Build the path from curiosity to confidence.",
            ],
            [
              "/admin/manage/teachers?edit=new",
              "♧",
              "Bring your teachers aboard",
              "Create an account and share its one-time password.",
            ],
            [
              "/admin/settings",
              "◐",
              "Make KnightCode yours",
              "Your school, your profile, your preferred look.",
            ],
          ].map((x) => (
            <Link className="admin-community-row" href={x[0]} key={x[0]}>
              <span className="admin-section-icon">{x[1]}</span>
              <span>
                <strong>{x[2]}</strong>
                <small>{x[3]}</small>
              </span>
              <b>→</b>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}

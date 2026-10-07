import { sectionLabel } from "@/lib/section-label";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherContext } from "@/lib/teacher-data";
import { deleteAnnouncement, saveAnnouncement } from "@/app/actions/teacher";
import { Alerts, Hero } from "@/components/teacher-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    t = await requireTeacher(),
    ctx = await getTeacherContext(t.id),
    { data: list } = await createAdminClient()
      .from("announcements")
      .select("*")
      .eq("teacher_id", t.id)
      .order("created_at", { ascending: false });
  return (
    <>
      <Hero
        eyebrow="COMMUNICATION"
        title="Announcements"
        description="Send updates to one section or all students you manage through the existing student notification system."
      />
      <Alerts searchParams={q} />
      <div className="teacher-grid two">
        <section className="teacher-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">NEW MESSAGE</span>
              <h3>Create announcement</h3>
            </div>
          </div>
          <form action={saveAnnouncement} className="teacher-form">
            <label>
              Title
              <input
                name="title"
                required
                maxLength={180}
                placeholder="Reminder: Variables challenge"
              />
            </label>
            <label>
              Audience
              <select name="class_id">
                <option value="0">All my students</option>
                {ctx.classes
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {sectionLabel(c)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Message
              <textarea
                name="body"
                rows={7}
                required
                placeholder="Write your announcement..."
              />
            </label>
            <label>
              Status
              <select name="status">
                <option value="published">Publish now</option>
                <option value="draft">Save draft</option>
              </select>
            </label>
            <button className="teacher-btn primary">Save Announcement →</button>
          </form>
        </section>
        <section className="teacher-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">HISTORY</span>
              <h3>Recent announcements</h3>
            </div>
          </div>
          {list?.length ? (
            list.map((a) => {
              const c = ctx.classes.find((c) => c.id === a.class_id);
              return (
                <article className="announcement-row" key={a.id}>
                  <div>
                    <div>
                      <span
                        className={
                          "status-badge " +
                          (a.status === "published" ? "on" : "muted")
                        }
                      >
                        {a.status}
                      </span>
                      <small>{c ? sectionLabel(c) : "All students"}</small>
                    </div>
                    <h4>{a.title}</h4>
                    <p>{a.body}</p>
                    <time>{new Date(a.created_at).toLocaleString()}</time>
                  </div>
                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="table-danger">Delete</button>
                  </form>
                </article>
              );
            })
          ) : (
            <div className="teacher-empty">No announcements yet.</div>
          )}
        </section>
      </div>
    </>
  );
}

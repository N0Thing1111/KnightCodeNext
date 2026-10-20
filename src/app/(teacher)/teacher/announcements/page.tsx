import Link from "next/link";
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
  const draft = list?.find((announcement) =>
    String(announcement.id) === q.draft && announcement.status === "draft",
  );
  const draftSectionUnavailable = draft?.class_id && !ctx.classes.some((section) =>
    section.id === draft.class_id && section.status === "active",
  );
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
              <h3>{draft ? "Publish saved announcement" : "Create announcement"}</h3>
            </div>
          </div>
          {draft && <p>This previously saved message is unpublished. Review it, then publish now.</p>}
          <form key={draft?.id || "new"} action={saveAnnouncement} className="teacher-form">
            {draft && <input type="hidden" name="draft_id" value={draft.id} />}
            <label>
              Title
              <input
                name="title"
                defaultValue={draft?.title || ""}
                required
                maxLength={180}
                placeholder="Reminder: Variables challenge"
              />
            </label>
            <label>
              Audience
              <select name="class_id" required defaultValue={draftSectionUnavailable ? "" : String(draft?.class_id || 0)}>
                {draftSectionUnavailable && (
                  <option value="" disabled>Previous section unavailable - choose an audience</option>
                )}
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
                defaultValue={draft?.body || ""}
                rows={7}
                required
                placeholder="Write your announcement..."
              />
            </label>
            <button type="submit" className="teacher-btn primary">Publish now</button>
            {draft && <Link href="/teacher/announcements">Cancel</Link>}
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
                        {a.status === "draft" ? "Unpublished" : a.status}
                      </span>
                      <small>{c ? sectionLabel(c) : "All students"}</small>
                    </div>
                    <h4>{a.title}</h4>
                    <p>{a.body}</p>
                    <time>{new Date(a.published_at || a.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</time>
                  </div>
                  <div>
                    {a.status === "draft" && (
                      <Link className="teacher-btn" href={"/teacher/announcements?draft=" + a.id}>
                        Open to publish
                      </Link>
                    )}
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="table-danger">Delete</button>
                    </form>
                  </div>
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

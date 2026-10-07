import { requireTeacher } from "@/lib/auth";
import { avatar, getTeacherContext, teacherStats } from "@/lib/teacher-data";
import {
  changeTeacherPassword,
  saveTeacherAvatar,
  saveTeacherProfile,
  saveTeacherTheme,
  uploadTeacherPhoto,
} from "@/app/actions/teacher";
import { Alerts, Hero } from "@/components/teacher-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    t = await requireTeacher(),
    ctx = await getTeacherContext(t.id),
    stats = teacherStats(ctx),
    photo = t.profile_image
      ? process.env.NEXT_PUBLIC_SUPABASE_URL +
        "/storage/v1/object/public/profile-images/" +
        t.profile_image
      : null,
    avatars = ["knight", "blue", "mage", "fox", "dragon", "robot"];
  const { data: shared } = await (
    await import("@/lib/supabase/admin")
  )
    .createAdminClient()
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .eq("school_code", t.school_code)
    .neq("id", t.id);
  return (
    <>
      <Hero
        eyebrow="ACCOUNT"
        title="Teacher Profile"
        description="Manage your account, profile picture, theme preference, and security."
      />
      <Alerts searchParams={q} />
      <div className="teacher-profile-grid">
        <section className="teacher-card teacher-profile-card">
          <div className="teacher-profile-cover">
            <div className="teacher-profile-avatar">
              {photo ? (
                <img src={photo} alt="Teacher profile picture" />
              ) : (
                <span>{avatar(t.avatar_key)}</span>
              )}
            </div>
            <div>
              <span className="teacher-eyebrow">TEACHER ACCOUNT</span>
              <h2>{t.name}</h2>
              <p>
                {t.teacher_id} · {t.email}
              </p>
            </div>
          </div>
          <div className="teacher-mini-stats">
            <div>
              <strong>{stats.classes}</strong>
              <span>Sections</span>
            </div>
            <div>
              <strong>{stats.students}</strong>
              <span>Students</span>
            </div>
            <div>
              <strong>{stats.avg_progress}%</strong>
              <span>Avg progress</span>
            </div>
          </div>
          <form action={saveTeacherProfile} className="teacher-form">
            <div className="teacher-form-grid">
              <label>
                Full name
                <input name="name" defaultValue={t.name} required />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  defaultValue={t.email}
                  required
                />
              </label>
              <label>
                School / Institution Code
                <input
                  name="school_code"
                  defaultValue={t.school_code ?? ""}
                  required
                />
              </label>
            </div>
            <p className="teacher-note">
              {shared?.length
                ? "Shared with " +
                  shared.length +
                  " other teacher" +
                  (shared.length === 1 ? "" : "s") +
                  " — you all see a combined student roster namespace under this code."
                : "No other teacher uses this code yet. Share it with colleagues at your school to pool your student roster."}
            </p>
            <button className="teacher-btn primary">Save profile</button>
          </form>
        </section>
        <section className="teacher-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">PROFILE PICTURE</span>
              <h3>Avatar or custom photo</h3>
            </div>
          </div>
          <div className="teacher-avatar-options">
            {avatars.map((key) => (
              <form action={saveTeacherAvatar} key={key}>
                <input type="hidden" name="avatar_key" value={key} />
                <button
                  className={
                    "teacher-avatar-choice " +
                    (t.avatar_key === key && !photo ? "selected" : "")
                  }
                  title={"Choose " + key}
                >
                  <span>{avatar(key)}</span>
                  <small>{key[0].toUpperCase() + key.slice(1)}</small>
                </button>
              </form>
            ))}
          </div>
          <form action={uploadTeacherPhoto} className="teacher-upload-form">
            <label>
              Upload your own picture
              <input
                type="file"
                name="profile_image"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <small>JPG, PNG, or WebP · maximum 5 MB</small>
            <button className="teacher-btn">Upload Photo</button>
          </form>
        </section>
        <section className="teacher-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">APPEARANCE</span>
              <h3>Theme preference</h3>
            </div>
          </div>
          <div className="teacher-theme-switch">
            {[
              ["dark", "🌙", "Dark", "Futuristic KnightCode"],
              ["light", "☀️", "Light", "Bright classroom view"],
            ].map(([key, icon, label, note]) => (
              <form action={saveTeacherTheme} key={key}>
                <input type="hidden" name="theme" value={key} />
                <button className={t.theme_preference === key ? "active" : ""}>
                  {icon}
                  <strong>{label}</strong>
                  <small>{note}</small>
                </button>
              </form>
            ))}
          </div>
        </section>
        <section className="teacher-card">
          <div className="teacher-card-head">
            <div>
              <span className="teacher-eyebrow">SECURITY</span>
              <h3>Change password</h3>
            </div>
          </div>
          <form action={changeTeacherPassword} className="teacher-form">
            <label>
              Current password
              <input type="password" name="current_password" required />
            </label>
            <label>
              New password
              <input
                type="password"
                name="new_password"
                minLength={8}
                required
              />
            </label>
            <button className="teacher-btn">Update Password</button>
          </form>
        </section>
        <section className="teacher-card logout-card">
          <div>
            <span className="teacher-eyebrow">SESSION</span>
            <h3>Log out of Teacher Portal</h3>
            <p>
              End your current teacher session and return to the teacher sign-in
              page.
            </p>
          </div>
          <a className="teacher-btn danger" href="/teacher-logout">
            Logout
          </a>
        </section>
      </div>
    </>
  );
}

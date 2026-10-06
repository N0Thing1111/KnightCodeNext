import { requireAdmin } from "@/lib/auth";
import { getAdminContext, setting } from "@/lib/admin-data";
import { saveAdminSettings } from "@/app/actions/admin";
import { AdminHero, Alerts } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [q, admin, ctx] = await Promise.all([
    searchParams,
    requireAdmin(),
    getAdminContext(),
  ]);
  return (
    <>
      <AdminHero
        title="Your space. Your school."
        description="Manage your profile, personalize KnightCode, and keep your school connected."
      >
        <span className="admin-role-badge">♜ School administrator</span>
      </AdminHero>
      <Alerts q={q} />
      <nav className="admin-settings-nav">
        <a href="#profile">Your profile</a>
        <a href="#school">School details</a>
        <a href="#theme">Appearance</a>
        <a href="#access">Teacher access</a>
        <a href="#password">Security</a>
      </nav>
      <div className="admin-settings-grid">
        <section className="teacher-card teacher-profile-card" id="profile">
          <div className="teacher-profile-cover">
            <div className="teacher-profile-avatar">
              <span>♞</span>
            </div>
            <div>
              <span className="teacher-eyebrow">SCHOOL ADMINISTRATOR</span>
              <h2>{admin.name}</h2>
              <p>{admin.email}</p>
              <span className="admin-role-badge">
                {setting(ctx, "school_name", "Your School")}
              </span>
            </div>
          </div>
          <div className="teacher-mini-stats">
            {[
              ["teacher", "Teachers"],
              ["student", "Students"],
            ].map(([role, label]) => (
              <div key={role}>
                <strong>
                  {ctx.profiles.filter((p) => p.role === role).length}
                </strong>
                <span>{label}</span>
              </div>
            ))}
            <div>
              <strong>{ctx.classes.length}</strong>
              <span>Classes</span>
            </div>
          </div>
          <form action={saveAdminSettings} className="teacher-form">
            <input type="hidden" name="settings_action" value="profile" />
            <div className="teacher-form-grid">
              <label>
                Display name
                <input name="name" defaultValue={admin.name} required />
              </label>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  defaultValue={admin.email}
                  required
                />
              </label>
            </div>
            <button className="teacher-btn primary">Save profile</button>
          </form>
        </section>
        <section className="teacher-card" id="school">
          <h3>Your learning community</h3>
          <form action={saveAdminSettings} className="teacher-form">
            <input type="hidden" name="settings_action" value="school" />
            <label>
              School name
              <input
                name="school_name"
                defaultValue={setting(ctx, "school_name", "KnightCode School")}
                required
              />
            </label>
            <label>
              School code
              <input
                name="school_code"
                defaultValue={setting(ctx, "school_code", "KNIGHTCODE-DEMO")}
                required
              />
            </label>
            <button className="teacher-btn primary">Save school details</button>
          </form>
        </section>
        <section className="teacher-card" id="theme">
          <h3>A look that feels like you</h3>
          <div className="admin-theme-options">
            {[
              ["dark", "☾", "Dark"],
              ["light", "☀", "Light"],
            ].map(([mode, icon, label]) => (
              <form action={saveAdminSettings} key={mode}>
                <input type="hidden" name="settings_action" value="theme" />
                <input type="hidden" name="theme" value={mode} />
                <button
                  className={
                    "admin-theme-choice " +
                    (admin.theme_preference === mode ? "selected" : "")
                  }
                >
                  <span className={"admin-theme-preview " + mode}>
                    <i />
                    <span>
                      <b />
                      <em />
                      <em />
                    </span>
                  </span>
                  <span className="admin-theme-caption">
                    <strong>
                      {icon} {label}
                    </strong>
                    <small>
                      {admin.theme_preference === mode
                        ? "✓ Selected"
                        : "Choose theme"}
                    </small>
                  </span>
                </button>
              </form>
            ))}
          </div>
        </section>
        <section className="teacher-card" id="access">
          <h3>Welcome teachers your way</h3>
          <form action={saveAdminSettings} className="teacher-form">
            <input type="hidden" name="settings_action" value="access" />
            <label className="admin-switch-row">
              <span>
                <strong>Allow teacher self-registration</strong>
                <small>
                  Teachers can create an account from the sign-in page.
                </small>
              </span>
              <input
                type="checkbox"
                name="teacher_registration"
                value="1"
                defaultChecked={setting(ctx, "teacher_registration") === "1"}
              />
              <span className="admin-switch-track" />
            </label>
            <p className="teacher-note">
              When off, teachers join through accounts you create or import.
            </p>
            <label>
              Confirm with your password
              <input
                type="password"
                name="admin_password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="teacher-btn">Save access</button>
          </form>
        </section>
        <section className="teacher-card admin-security-card" id="password">
          <h3>Keep your account protected</h3>
          <form action={saveAdminSettings} className="teacher-form">
            <input type="hidden" name="settings_action" value="password" />
            <label>
              Current password
              <input type="password" name="current_password" required />
            </label>
            <div className="teacher-form-grid">
              <label>
                New password
                <input
                  type="password"
                  name="new_password"
                  minLength={12}
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  name="confirm_password"
                  minLength={12}
                  required
                />
              </label>
            </div>
            <button className="teacher-btn primary">Update password</button>
          </form>
        </section>
        <section className="teacher-card logout-card">
          <div>
            <h3>Sign out of your workspace</h3>
            <p>Your saved changes will be here when you return.</p>
          </div>
          <form action="/admin-logout" method="post">
            <button type="submit" className="teacher-btn danger">
              Sign out
            </button>
          </form>
        </section>
      </div>
    </>
  );
}

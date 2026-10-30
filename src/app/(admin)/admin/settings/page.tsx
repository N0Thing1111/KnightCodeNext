import { PasswordInput } from "@/components/password-input";
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
        title="Platform settings"
        description="Manage your profile, personalize KnightCode, and manage your learning platform."
      >
        <span className="admin-role-badge">♜ Platform administrator</span>
      </AdminHero>
      <Alerts q={q} />
      <nav className="admin-settings-nav">
        <a href="#profile">Your profile</a>
        <a href="#school">Platform details</a>
        <a href="#theme">Appearance</a>
        <a href="#password">Security</a>
      </nav>
      <section className="teacher-card admin-settings-summary" aria-label="Administrator profile">
        <div className="teacher-profile-cover">
          <div className="teacher-profile-avatar">
            <span>♞</span>
          </div>
          <div>
            <span className="teacher-eyebrow">PLATFORM ADMINISTRATOR</span>
            <h2>{admin.name}</h2>
            <p>{admin.email}</p>
            <span className="admin-role-badge">
              {setting(ctx, "platform_name", "KnightCode")}
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
            <span>Sections</span>
          </div>
        </div>
      </section>
      <div className="admin-settings-grid">
        <div className="admin-settings-column">
          <section className="teacher-card" id="profile">
            <h3>Personal information</h3>
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
                Platform name
                <input
                  name="platform_name"
                  defaultValue={setting(ctx, "platform_name", "KnightCode")}
                  required
                />
              </label>
              <button className="teacher-btn primary">Save platform details</button>
            </form>
          </section>
          <section className="teacher-card" id="support">
            <h3>Platform contact and support</h3><p>These details appear on this deployment&apos;s student support page.</p>
            <form action={saveAdminSettings} className="teacher-form">
              <input type="hidden" name="settings_action" value="support" />
              {[["support_contact","Contact person or office"],["support_email","Support email"],["support_phone","Phone or extension"],["support_hours","Office hours"]].map(([key,label]) => <label key={key}>{label}<input name={key} type={key === "support_email" ? "email" : "text"} maxLength={200} defaultValue={setting(ctx,key)} /></label>)}
              <label>Instructions<textarea name="support_instructions" maxLength={2000} rows={4} defaultValue={setting(ctx,"support_instructions")} /></label>
              <button className="teacher-btn primary">Save support details</button>
            </form>
          </section>
        </div>
        <div className="admin-settings-column">
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
          <section className="teacher-card admin-security-card" id="password">
            <h3>Keep your account protected</h3>
            <form action={saveAdminSettings} className="teacher-form">
              <input type="hidden" name="settings_action" value="password" />
              <label>
                Current password
                <PasswordInput name="current_password" required />
              </label>
              <div className="teacher-form-grid">
                <label>
                  New password
                  <PasswordInput
                    name="new_password"
                    minLength={12}
                    required
                  />
                </label>
                <label>
                  Confirm new password
                  <PasswordInput
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
      </div>
    </>
  );
}

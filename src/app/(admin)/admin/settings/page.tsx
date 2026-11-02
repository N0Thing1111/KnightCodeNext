import { PasswordInput } from "@/components/password-input";
import { requireAdmin } from "@/lib/auth";
import { getAdminContext, setting } from "@/lib/admin-data";
import { saveAdminSettings } from "@/app/actions/admin";
import { AdminHero, Alerts } from "@/components/admin-ui";
import { PLATFORM_NAME } from "@/lib/platform-identity";
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
        title="Platform and account settings"
        description="Manage support contacts, appearance, and your account."
      >
        <span className="admin-role-badge">Platform administrator</span>
      </AdminHero>
      <Alerts q={q} />
      <nav className="admin-settings-nav" aria-label="Settings sections">
        <a href="#platform">Platform identity</a>
        <a href="#support">Support contact</a>
        <a href="#profile">Your account</a>
        <a href="#theme">Appearance</a>
        <a href="#password">Security</a>
      </nav>
      <div className="admin-settings-grid">
        <div className="admin-settings-column">
          <section className="teacher-card" id="platform">
            <h3>Platform identity</h3>
            <p>
              <strong>{PLATFORM_NAME}</strong>
            </p>
            <p className="teacher-note">
              The platform name is fixed. Support details below are editable.
            </p>
          </section>
          <section className="teacher-card" id="support">
            <h3>Support contact</h3>
            <p>Shown on the student support page.</p>
            <form action={saveAdminSettings} className="teacher-form">
              <input type="hidden" name="settings_action" value="support" />
              {[
                ["support_contact", "Support team or contact"],
                ["support_email", "Support email"],
                ["support_phone", "Phone (optional)"],
                ["support_hours", "Support hours"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    type={key === "support_email" ? "email" : "text"}
                    maxLength={200}
                    defaultValue={setting(ctx, key)}
                  />
                </label>
              ))}
              <label>
                Instructions
                <textarea
                  name="support_instructions"
                  maxLength={2000}
                  rows={4}
                  defaultValue={setting(ctx, "support_instructions")}
                />
              </label>
              <button className="teacher-btn primary">
                Save support details
              </button>
            </form>
          </section>
        </div>
        <div className="admin-settings-column">
          <section className="teacher-card" id="profile">
            <h3>Your admin account</h3>
            <p className="teacher-note">Signed in as {admin.email}.</p>
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
          <section className="teacher-card" id="theme">
            <h3>Appearance</h3>
            <div className="admin-theme-options">
              {[
                ["dark", "Dark"],
                ["light", "Light"],
              ].map(([mode, label]) => (
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
                      <strong>{label}</strong>
                      <small>
                        {admin.theme_preference === mode
                          ? "Selected"
                          : "Choose theme"}
                      </small>
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </section>
          <section className="teacher-card admin-security-card" id="password">
            <h3>Account security</h3>
            <form action={saveAdminSettings} className="teacher-form">
              <input type="hidden" name="settings_action" value="password" />
              <label>
                Current password
                <PasswordInput name="current_password" required />
              </label>
              <div className="teacher-form-grid">
                <label>
                  New password
                  <PasswordInput name="new_password" minLength={12} required />
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
              <h3>Sign out of administration</h3>
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

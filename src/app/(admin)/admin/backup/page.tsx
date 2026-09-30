/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { restoreAdminBackup } from "@/app/actions/admin-data";
import { AdminHero, Alerts } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [q, jar] = await Promise.all([searchParams, cookies()]);
  let credentials: any[] = [];
  try {
    credentials = JSON.parse(jar.get("kc_admin_restore")?.value || "[]");
  } catch {}
  return (
    <>
      <AdminHero
        title="Test with a way back."
        description="Download an encrypted school save file before clearing data, then restore it when you need to return to that state."
      />
      <Alerts q={q} />
      <div className="teacher-grid two">
        <section className="teacher-card">
          <h3>Download a school save file</h3>
          <p className="teacher-note">
            Includes curriculum, accounts, classes, assignments, notifications,
            achievements, and recorded performance. Authentication password
            hashes are excluded by Supabase.
          </p>
          <form
            method="post"
            action="/api/admin/backup"
            className="teacher-form"
          >
            <label>
              Choose a backup password
              <input
                name="backup_password"
                type="password"
                minLength={12}
                required
              />
            </label>
            <label>
              Confirm backup password
              <input name="backup_confirm" type="password" required />
            </label>
            <label>
              Your administrator password
              <input name="admin_password" type="password" required />
            </label>
            <button className="teacher-btn primary">Download save file</button>
          </form>
        </section>
        <section className="teacher-card">
          <h3>Restore a save file</h3>
          <p className="teacher-note">
            Restoration replaces current operational and curriculum records.
            Restored teacher and student accounts receive new temporary
            passwords.
          </p>
          <form action={restoreAdminBackup} className="teacher-form">
            <label>
              KnightCode save file
              <input
                name="save_file"
                type="file"
                accept=".knightsave"
                required
              />
            </label>
            <label>
              Backup password
              <input name="backup_password" type="password" required />
            </label>
            <label>
              Type RESTORE SAVE FILE
              <input name="confirmation" required />
            </label>
            <label>
              Your administrator password
              <input name="admin_password" type="password" required />
            </label>
            <button className="teacher-btn danger">
              Replace current data with this save
            </button>
          </form>
        </section>
      </div>
      {credentials.length > 0 && (
        <section className="teacher-card">
          <h3>Restored account credentials — copy these now</h3>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Temporary password</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.role}</td>
                    <td>{r.email}</td>
                    <td>
                      <code>{r.password}</code>
                    </td>
                    <td>{r.email_sent ? "Sent" : "Not sent"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

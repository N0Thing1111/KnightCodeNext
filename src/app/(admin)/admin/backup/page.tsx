import { RestoreBackupForm } from "@/components/restore-backup-form";
import { AdminHero, Alerts } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
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
            Includes curriculum, accounts, sections, assignments, notifications,
            achievements, and recorded performance. Authentication password
            hashes and uploaded image files are not included. Keep the original
            image storage separately.
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
          <RestoreBackupForm />
        </section>
      </div>
    </>
  );
}

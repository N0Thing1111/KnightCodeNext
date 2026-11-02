import { requireAdmin } from "@/lib/auth";
import { AutomaticBackupPanel } from "@/components/automatic-backup-panel";
import { AdminDataNavigation } from "@/components/admin-data-navigation";
import { DownloadBackupForm } from "@/components/download-backup-form";
import { RestoreBackupForm } from "@/components/restore-backup-form";
import { Alerts } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const q = await searchParams;
  return (
    <div className="admin-data-management">
      <AdminDataNavigation active="backup" />
      <Alerts q={q} />
      <AutomaticBackupPanel selectedId={q.backup} retryId={q.retry} />
      <div className="teacher-grid two">
        <section className="teacher-card">
          <h3>Download a platform save file</h3>
          <p className="teacher-note">
            Saves curriculum, accounts, sections, assignments, notifications,
            achievements, and learning records. Excludes passwords and uploaded
            images; keep image files separately.
          </p>
          <DownloadBackupForm />
        </section>
        <section className="teacher-card">
          <h3>Restore a platform save</h3>
          <p className="teacher-note">
            Rolls back everyone&apos;s platform records to this save. Ask users
            to stop games and code runs first.
          </p>
          <RestoreBackupForm />
        </section>
      </div>
    </div>
  );
}

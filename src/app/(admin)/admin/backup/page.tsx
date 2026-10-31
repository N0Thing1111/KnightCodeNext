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
            Includes curriculum, accounts, sections, assignments, notifications,
            achievements, and recorded performance. Authentication password
            hashes and uploaded image files are not included. Keep the original
            image storage separately.
          </p>
          <DownloadBackupForm />
        </section>
        <section className="teacher-card">
          <h3>Restore a platform save</h3>
          <p className="teacher-note">Restoration replaces saved platform records for everyone. It can roll back other users&apos; work since the save. This is not a selective student or section undo. Accounts absent from the save are not automatically deleted.</p>
          <RestoreBackupForm />
        </section>
      </div>
    </div>
  );
}

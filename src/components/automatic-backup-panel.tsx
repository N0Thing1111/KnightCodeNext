import Link from "next/link";
import { automaticBackupConfiguration, listStoredBackups } from "@/lib/automatic-backups";
import { backupKeyId, type StoredSchoolBackup } from "@/lib/automatic-backup-rules";
import { DownloadBackupForm } from "@/components/download-backup-form";
import { AutomaticBackupForm } from "@/components/automatic-backup-form";
import styles from "./automatic-backup-panel.module.css";
const displayDate = (value: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
export async function AutomaticBackupPanel({ selectedId, retryId }: { selectedId?: string; retryId?: string }) {
  const config = automaticBackupConfiguration();
  let rows: StoredSchoolBackup[] = [], error = "", now = 0;
  try { const history = await listStoredBackups(); rows = history.rows; now = history.checkedAt; } catch (e) { error = e instanceof Error ? e.message : "Backup history is unavailable."; }
  const latest = rows.find(row => row.status === "ready");
  const running = rows.some(row => row.status === "running" && Date.parse(row.lease_until) > now);
  const selected = rows.find(row => row.id === selectedId && row.status === "ready");
  const retry = rows.find(row => row.id === retryId && (row.status === "failed" || (row.status === "running" && Date.parse(row.lease_until) <= now)));
  const keyId = config.encryption ? backupKeyId(process.env.AUTOMATIC_BACKUP_SECRET!) : null;
  return <section className={"teacher-card " + styles.panel} aria-labelledby="automatic-backups-title">
    <div className={styles.header}><h3 id="automatic-backups-title">Weekly backups</h3><Link className="teacher-btn" href="/admin/backup" scroll={false}>Refresh history</Link></div>
    <p className={styles.note}>Scheduled for Sundays at 2:00 AM Philippine time. On Vercel Hobby, it may start anytime within that hour. Keeps the latest 8 weekly saves and 3 manual saves.</p>
    {!config.encryption || !config.cron ? <p className="teacher-alert error" role="status">Setup needed: configure {!config.encryption && "AUTOMATIC_BACKUP_SECRET"}{!config.encryption && !config.cron && " and "}{!config.cron && "CRON_SECRET"} in Vercel, then deploy the weekly schedule.</p> : <p className={styles.note}>Server secrets are configured. The schedule runs after this version is deployed to production. Check the history to confirm each weekly save.</p>}
    {error && <p className="teacher-alert error" role="alert">{error}</p>}
    {!error && (!latest || Date.parse(latest.snapshot_at || latest.started_at) < now - 8 * 86400000) && <p className="teacher-alert error" role="status">{latest ? "The newest saved backup is over eight days old. Check the Vercel Cron logs or create a backup now." : "No completed backups yet. Create the first save below or wait for the next scheduled run after deployment."}</p>}
    {running && <p className={styles.note} role="status">A backup is running. Refresh the history in a few minutes.</p>}
    {!!rows.length && <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Saved backup history"><table className={styles.table}>
      <thead><tr><th scope="col">Snapshot / attempted at (PH)</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Size</th><th scope="col">Action</th></tr></thead>
      <tbody>{rows.map(row => {
        const timedOut = row.status === "running" && Date.parse(row.lease_until) <= now;
        const available = row.status === "ready" && row.key_id === keyId;
        return <tr key={row.id}><td>{displayDate(row.snapshot_at || row.started_at)}</td><td>{row.source === "weekly" ? "Weekly" : "Manual"}</td>
          <td><strong>{timedOut ? "Interrupted" : { running: "In progress", ready: "Saved", failed: "Failed", expired: "Expired" }[row.status]}</strong>
            {row.error_message && <p>{row.error_message}</p>}{row.retention_warning && <p>{row.retention_warning}</p>}
            {row.status === "ready" && !available && <p>Restore the original server encryption secret to download.</p>}
          </td><td>{row.byte_size == null ? "-" : (row.byte_size / 1024 / 1024).toFixed(2) + " MB"}</td>
          <td>{available ? <Link href={"/admin/backup?backup=" + row.id + "#download-saved-backup"}>Download</Link> : row.status === "failed" || timedOut ? <Link href={"/admin/backup?retry=" + row.id + "#retry-saved-backup"}>Retry</Link> : "-"}</td></tr>;
      })}</tbody></table></div>}
    {selectedId && !selected && <p className="teacher-alert error">That saved backup is no longer available. Choose one from the history.</p>}
    {selected && <div id="download-saved-backup" className={styles.form}><h4>Download the {displayDate(selected.snapshot_at || selected.started_at)} save</h4><p className={styles.note}>Choose a password for this downloaded file. You will need it when restoring. The system does not store this password.</p><DownloadBackupForm key={selected.id} backupId={selected.id} /></div>}
    {retryId && !retry && <p className="teacher-alert error">That attempt cannot be retried. Refresh the history to see its current status.</p>}
    {retry && <div id="retry-saved-backup" className={styles.form}><h4>Retry the failed backup</h4><p className={styles.note}>This captures the school records as they are now; it cannot recover the state at the time of the failed attempt.</p><AutomaticBackupForm key={retry.id} retryId={retry.id} disabled={!config.encryption || running || !!error} /></div>}
    <details className={styles.details}><summary>Create an additional backup now</summary><div className={styles.form}><p className={styles.note}>Save an encrypted copy to the private archive. Learning records are not changed.</p><AutomaticBackupForm disabled={!config.encryption || running || !!error} /></div></details>
    <p className={styles.note}>Saved files are private and survive learning and school resets. Download important copies separately: these backups share the same Supabase project as your school data. The history shows all retained saves (up to 100 if cleanup is delayed) and the 20 most recent other attempts.</p>
  </section>;
}

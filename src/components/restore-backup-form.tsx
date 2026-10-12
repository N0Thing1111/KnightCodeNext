"use client";
import { prepareRestoreUpload, discardBackupTransfer } from "@/app/actions/backup-transfer";
import { createClient } from "@/lib/supabase/client";
import { BACKUP_BUCKET, MAX_BACKUP_BYTES } from "@/lib/backup-transfer-rules";
import { useActionState } from "react";
import { restoreAdminBackup } from "@/app/actions/admin-data";
import type { RestoreResult } from "@/lib/admin-restore";

export function RestoreBackupForm() {
  const [state, action, pending] = useActionState<RestoreResult, FormData>(
    async (_previous, form) => {
      const file = form.get("save_file");
      if (!(file instanceof File) || !file.size || file.size > MAX_BACKUP_BYTES) return { error: "Choose a save file up to 32 MB." };
      form.delete("save_file");
      form.set("file_size", String(file.size));
      let path: string | undefined;
      try {
        const prepared = await prepareRestoreUpload(form);
        if (prepared.error || !prepared.path || !prepared.token) return { error: prepared.error || "Upload unavailable." };
        path = prepared.path;
        const uploaded = await createClient().storage.from(BACKUP_BUCKET).uploadToSignedUrl(path, prepared.token, file, { contentType: "application/octet-stream" });
        if (uploaded.error) return { error: "Upload failed. No records were restored. " + uploaded.error.message };
        form.set("uploaded_path", path);
        return await restoreAdminBackup({}, form);
      } catch { return { error: "Connection interrupted. Check audit history before retrying the restore." }; }
      finally { if (path) await discardBackupTransfer(path).catch(() => {}); }
    },
    {},
  );
  return (
    <>
      <p className="teacher-note">
        Replaces curriculum and learning records with the save file. All records
        are checked in one transaction. Existing accounts keep their current
        passwords; only missing accounts receive new temporary passwords,
        emailed to their saved addresses after restoration succeeds. Accounts
        not included in the save are kept. Uploaded image files are not
        included. Ask users to leave the game before restoring.
      </p>
      <form action={action} className="teacher-form">
        <label>
          KnightCode save file (up to 32 MB)
          <input
            name="save_file"
            type="file"
            accept=".knightsave"
            required
            disabled={pending}
          />
        </label>
        <label>
          Backup password
          <input
            name="backup_password"
            type="password"
            required
            autoComplete="off"
          />
        </label>
        <label>
          Type RESTORE SAVE FILE
          <input name="confirmation" required />
        </label>
        <label>
          Your administrator password
          <input
            name="admin_password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        <button className="teacher-btn danger" disabled={pending}>
          {pending
            ? "Restoring records and emailing recreated accounts..."
            : "Replace current data with this save"}
        </button>
      </form>
      {state.error && (
        <div className="alert alert-error" role="alert">
          {state.error}
        </div>
      )}
      {state.notice && (
        <div className="alert alert-success" role="status">
          {state.notice}
        </div>
      )}
      {state.counts && (
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <caption>Verified restored records</caption>
            <thead>
              <tr>
                <th>Table</th>
                <th>Records</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(state.counts).map(([table, count]) => (
                <tr key={table}>
                  <td>{table.replaceAll("_", " ")}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!!state.credentials?.length && (
        <section>
          <h3>New account passwords - copy these before leaving</h3>
          <p>
            These are only for accounts recreated by this restore. Existing
            passwords were not changed. Check each email status below. If
            sending failed, copy and share the temporary password before leaving
            this page. Do not repeat the restore just to resend an email.
          </p>
          {state.emailSummary && (
            <p role="status">
              {state.emailSummary.sent} email(s) sent;{" "}
              {state.emailSummary.failed} not sent.
              {state.emailSummary.failed > 0 &&
                " The data restore succeeded. Check your email settings and share the passwords for unsent emails manually."}
            </p>
          )}
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Temporary password</th>
                  <th>Email status</th>
                </tr>
              </thead>
              <tbody>
                {state.credentials.map((c) => (
                  <tr key={c.email}>
                    <td>{c.name}</td>
                    <td>{c.role}</td>
                    <td>{c.email}</td>
                    <td>
                      <code>{c.password}</code>
                    </td>
                    <td>
                      {c.emailSent
                        ? "Sent"
                        : "Not sent - share password manually"}
                    </td>
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

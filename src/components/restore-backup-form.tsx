"use client";
import { useActionState } from "react";
import { restoreAdminBackup } from "@/app/actions/admin-data";
import type { RestoreResult } from "@/lib/admin-restore";

export function RestoreBackupForm() {
  const [state, action, pending] = useActionState<RestoreResult, FormData>(
    restoreAdminBackup,
    {},
  );
  return (
    <>
      <p className="teacher-note">
        Replaces curriculum and learning records with the save file. All records
        are checked in one transaction. Existing accounts keep their current
        passwords; only missing accounts receive new temporary passwords.
        Accounts not included in the save are kept. Uploaded image files are not
        included. Ask users to leave the game before restoring.
      </p>
      <form action={action} className="teacher-form">
        <label>
          KnightCode save file
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
            ? "Restoring and checking records..."
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
            These are only for accounts missing before restoration. No passwords
            were emailed automatically. Existing passwords were not changed.
          </p>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Temporary password</th>
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

"use client";
import { useActionState } from "react";
import { discardBackupTransfer } from "@/app/actions/backup-transfer";
export function DownloadBackupForm({ backupId }: { backupId?: string }) {
 const [state, action, pending] = useActionState<{ error?: string; notice?: string }, FormData>(async (_previous: { error?: string; notice?: string }, form: FormData) => {
  let path: string | undefined;
  try {
   const response = await fetch("/api/admin/backup", { method: "POST", body: form });
   const data = await response.json();
   if (!response.ok || data.error) return { error: data.error || "Backup failed." };
   path = data.path;
   const download = await fetch(data.url);
   if (!download.ok) throw Error("Download failed. Try again.");
   const url = URL.createObjectURL(await download.blob());
   const link = document.createElement("a"); link.href = url; link.download = data.filename;
   document.body.appendChild(link); link.click(); link.remove();
   setTimeout(() => URL.revokeObjectURL(url), 60000);
   return { notice: "Download started. Keep the save file and its password somewhere safe." };
  } catch(e) { return { error: e instanceof Error ? e.message : "Download failed." }; }
  finally { if (path) await discardBackupTransfer(path).catch(() => {}); }
 }, {});
 return <form action={action} className="teacher-form">
  {backupId && <input type="hidden" name="backup_id" value={backupId} />}
  <label>Choose a backup password<input name="backup_password" type="password" minLength={12} required autoComplete="new-password" /></label>
  <label>Confirm backup password<input name="backup_confirm" type="password" required autoComplete="new-password" /></label>
  <label>Your administrator password<input name="admin_password" type="password" required autoComplete="current-password" /></label>
  <button className="teacher-btn primary" disabled={pending}>{pending ? "Preparing encrypted download..." : "Download save file"}</button>
  {state.error && <p className="teacher-alert error" role="alert">{state.error}</p>}
  {state.notice && <p className="teacher-alert success" role="status">{state.notice}</p>}
 </form>;
}

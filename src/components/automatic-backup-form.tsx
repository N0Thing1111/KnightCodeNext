"use client";
import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
export function AutomaticBackupForm({ retryId, disabled = false }: { retryId?: string; disabled?: boolean }) {
  const router = useRouter(), requestId = useRef<string | null>(null);
  const [state, action, pending] = useActionState<{ error?: string; notice?: string }, FormData>(async (_previous, form) => {
    requestId.current ??= crypto.randomUUID();
    form.set("request_id", requestId.current);
    if (retryId) form.set("retry_id", retryId);
    try {
      const response = await fetch("/api/admin/automatic-backups", { method: "POST", body: form });
      const data = await response.json();
      router.refresh();
      if (data.state === "busy") return { error: "Another backup is still running. Refresh in a few minutes before trying again." };
      if (!response.ok) return { error: data.error || "Backup failed. Check the history and retry." };
      requestId.current = null;
      return { notice: data.warning || (data.state === "already_complete" ? "This backup request was already completed. Its saved copy is listed in the history." : "Backup saved and verified. You can download it from the history.") };
    } catch { router.refresh(); return { error: "The connection was interrupted. Refresh the history before retrying; the backup may have finished." }; }
  }, {});
  return <form action={action} className="teacher-form">
    <label>Your administrator password<PasswordInput name="admin_password" required autoComplete="current-password" disabled={disabled || pending} /></label>
    <button className="teacher-btn primary" disabled={disabled || pending}>{pending ? "Saving and verifying..." : retryId ? "Retry backup" : "Back up now"}</button>
    {state.error && <p className="teacher-alert error" role="alert">{state.error}</p>}
    {state.notice && <p className="teacher-alert success" role="status">{state.notice}</p>}
  </form>;
}

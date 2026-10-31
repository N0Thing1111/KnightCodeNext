"use client";
import { useActionState } from "react";
import { requestPasswordRecovery, resetRecoveredPassword } from "@/app/actions/password-recovery";
import { PasswordInput } from "@/components/password-input";
export function PasswordRecoveryForm({ reset = false }: { reset?: boolean }) {
  const [state, action, pending] = useActionState(reset ? resetRecoveredPassword : requestPasswordRecovery, {});
  return <form action={action} className="auth-form">
    {state.error && <p className="alert alert-error" role="alert">{state.error}</p>}
    {state.success ? <p className="alert alert-success" role="status">{state.success}</p> : <>
      {reset ? <>
        <label>New password<PasswordInput name="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
        <p>Use 12 to 128 characters.</p>
        <label>Confirm new password<PasswordInput name="confirm_password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
      </> : <label>Account email<input type="email" name="email" required maxLength={254} autoComplete="email" /></label>}
      <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Please wait..." : reset ? "Save new password" : "Send recovery link"}</button>
    </>}
  </form>;
}

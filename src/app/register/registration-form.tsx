"use client";
import { useActionState } from "react";
import { PasswordInput } from "@/components/password-input";
import { registerAccount } from "@/app/actions/registration";
export function RegistrationForm({role}:{role:"student"|"teacher"}) {
 const [state,action,pending]=useActionState(registerAccount,{});
 return <form action={action} className="auth-form">
  <input type="hidden" name="role" value={role}/>
  {state.error && <p className="alert alert-error" role="alert">{state.error}</p>}
  {state.success ? <><p className="alert alert-success" role="status">{state.success}</p><input type="hidden" name="email" value={state.email || ""}/><button className="btn btn-secondary" name="intent" value="resend" disabled={pending}>{pending ? "Requesting email..." : "Resend verification email"}</button></> : <>
  <label>Full name<input name="name" autoComplete="name" required maxLength={150}/></label>
  <label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,39}"/></label>
  <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
  <label>Password<PasswordInput name="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>
  <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Creating account..." : "Create account"}</button>
  </>}
 </form>;
}

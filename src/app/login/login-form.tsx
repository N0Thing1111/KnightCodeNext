"use client";
import { PasswordInput } from "@/components/password-input";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initial: LoginState = {};
export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} className="auth-form">
      {state.error && (
        <div className="alert alert-error form-error" role="alert">
          {state.error}
        </div>
      )}
      <label htmlFor="identifier">
        Student ID, Username, or Email
        <input
          id="identifier"
          name="identifier"
          placeholder="STU-2026-001"
          autoComplete="username"
          required
          autoFocus
        />
      </label>
      <label htmlFor="password">
        Password
        <PasswordInput
          id="password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </label>
      <button
        className="btn btn-primary btn-block btn-lg"
        type="submit"
        disabled={pending}
      >
        {pending ? (
          "Signing in…"
        ) : (
          <>
            Enter KnightCode <span>→</span>
          </>
        )}
      </button>
    </form>
  );
}

import { PasswordInput } from "@/components/password-input";
﻿import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/auth";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (await getCurrentTeacher()) redirect("/teacher/dashboard");
  const q = await searchParams;
  return (
    <main className="auth-layout teacher-auth-layout">
      <section className="auth-visual">
        <div className="auth-orbit orbit-one" />
        <div className="auth-orbit orbit-two" />
        <Link className="auth-logo" href="/">
          <img src="/assets/img/knight-logo.png" alt="KnightCode" />
          <span>
            Knight<strong>Code</strong>
          </span>
        </Link>
        <div className="auth-visual-content">
          <span className="eyebrow">TEACHER COMMAND CENTER</span>
          <h1>
            Guide learners.
            <br />
            <span>Track progress.</span>
          </h1>
          <p>
            Manage sections, assignments, student activity, and KnightCode
            learning data from one secure portal.
          </p>
          <div className="auth-feature-grid">
            <div>
              <span>▦</span>
              <b>Section management</b>
              <small>Create and organize sections</small>
            </div>
            <div>
              <span>◉</span>
              <b>Student monitoring</b>
              <small>Track real learning activity</small>
            </div>
            <div>
              <span>▥</span>
              <b>Progress reports</b>
              <small>Export CSV and PDF reports</small>
            </div>
          </div>
        </div>
        <div className="auth-code-art">
          &lt;/&gt;<small>TEACH · GUIDE · INSPIRE</small>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card teacher-auth-card">
          <span className="eyebrow">TEACHER PORTAL</span>
          <h2>Welcome back</h2>
          <p className="auth-subtitle">
            Sign in with your teacher credentials to continue.
          </p>
          {q.notice && (
            <div className="alert alert-success" role="status">
              {q.notice}
            </div>
          )}
          <form action="/api/teacher/login" method="post" className="auth-form">
            <label htmlFor="teacher-identifier">
              Username or Email
              <input
                id="teacher-identifier"
                type="text"
                name="identifier"
                placeholder="teacher@example.com"
                autoComplete="username"
                required
                autoFocus
              />
            </label>
            <label htmlFor="teacher-password">
              Password
              <PasswordInput
                id="teacher-password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>
            {q.error && (
              <div className="alert alert-error" role="alert">
                {q.error}
              </div>
            )}
            <button className="btn btn-primary btn-block btn-lg">
              Enter Teacher Portal <span>→</span>
            </button>
          </form>
          <p><Link href="/forgot-password">Forgot password?</Link></p>
          <p><Link href="/register?role=teacher">Create an account</Link></p>
          <div className="auth-trust-row">
            <span>✓ Secure sign-in</span>
            <span>✓ Teacher account</span>
          </div>
          <p className="auth-help">
            <Link href="/login">← Student Login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

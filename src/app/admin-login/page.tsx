import { PasswordInput } from "@/components/password-input";
import Link from "next/link";
import "../teacher.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  return (
    <main className="auth-layout admin-auth-layout">
      <section className="auth-visual">
        <div className="auth-orbit orbit-one" />
        <div className="auth-orbit orbit-two" />
        <Link className="auth-logo" href="/">
          <img src="/assets/img/knight-logo.png" alt="" />
          <span>
            Knight<strong>Code</strong>
          </span>
        </Link>
        <div className="auth-visual-content">
          <span className="eyebrow">SCHOOL ADMINISTRATION</span>
          <h1>
            One school.
            <br />
            <span>A shared future.</span>
          </h1>
          <p>
            Support your teachers, shape the curriculum, and oversee learning
            across the KnightCode platform.
          </p>
          <div className="auth-feature-grid">
            <div>
              <b>People</b>
              <small>Teachers, sections, and students</small>
            </div>
            <div>
              <b>Curriculum</b>
              <small>Lessons and level organization</small>
            </div>
            <div>
              <b>Oversight</b>
              <small>Session results and audit history</small>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">ADMIN PORTAL</span>
          <h2>Welcome back</h2>
          <p className="auth-subtitle">
            Sign in with your platform administrator account.
          </p>
          {q.error && <div className="alert alert-error">{q.error}</div>}
          <form method="post" action="/api/admin/login" className="auth-form">
            <label>
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <PasswordInput
                name="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button className="btn btn-primary btn-block btn-lg">
              Enter Admin Portal →
            </button>
          </form>
          <p className="auth-help">
            <Link href="/teacher-login">Teacher login</Link> ·{" "}
            <Link href="/login">Student login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

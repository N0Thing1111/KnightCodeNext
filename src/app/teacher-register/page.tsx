import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (await getCurrentTeacher()) redirect("/teacher/dashboard");
  const [query, setting] = await Promise.all([
    searchParams,
    createAdminClient()
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "teacher_registration")
      .maybeSingle(),
  ]);
  const allowed =
    setting.data?.setting_value === "1" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.KC_ALLOW_TEACHER_REGISTRATION === "1");
  if (!allowed)
    return (
      <main className="auth-panel">
        <section className="auth-card">
          <span className="eyebrow">KNIGHTCODE · SCHOOL ACCESS</span>
          <h2>Contact your school administrator</h2>
          <p className="auth-subtitle">
            Teacher accounts are created by your school administrator. Ask them
            for your Teacher ID and password.
          </p>
          <Link className="btn btn-primary" href="/teacher-login">
            Teacher login
          </Link>
        </section>
      </main>
    );
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
            Bring your section
            <br />
            <span>into KnightCode.</span>
          </h1>
          <p>
            Create sections, add your students, and track their progress from
            one portal.
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
              <small>Export learning reports</small>
            </div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card teacher-auth-card">
          <span className="eyebrow">TEACHER PORTAL</span>
          <h2>Create your teacher account</h2>
          <p className="auth-subtitle">
            Create an account using your school or institution code.
          </p>
          {query.error && (
            <div className="alert alert-error">{query.error}</div>
          )}
          <form
            action="/api/teacher/register"
            method="post"
            className="auth-form"
          >
            <label>
              Full name
              <input name="name" required autoFocus maxLength={150} />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                maxLength={150}
              />
            </label>
            <label>
              School / Institution Code
              <input
                name="school_code"
                required
                placeholder="e.g. STMARY-HS"
                maxLength={40}
              />
            </label>
            <p className="auth-help">
              Use the same code as colleagues who share your school roster.
            </p>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm password
              <input
                name="confirm_password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
            <button className="btn btn-primary btn-block btn-lg">
              Create Teacher Account <span>→</span>
            </button>
          </form>
          <p className="auth-help">
            Already have an account? <Link href="/teacher-login">Sign in</Link>
          </p>
          <p className="auth-help">
            <Link href="/login">← Student Login</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

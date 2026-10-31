import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign In" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (await getCurrentStudent()) redirect("/dashboard");
  return (
    <div className="auth-body">
      <main className="auth-layout">
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
            <span className="eyebrow">ENTER THE QUEST</span>
            <h1>
              Learn to code.
              <br />
              <span>Play. Build. Master.</span>
            </h1>
            <p>
              Turn programming logic into an adventure with interactive lessons
              and KnightCode challenges.
            </p>
            <div className="auth-feature-grid">
              <div>
                <span>⚔</span>
                <b>Game-based</b>
                <small>Learn by solving</small>
              </div>
              <div>
                <span>⚡</span>
                <b>Hands-on</b>
                <small>Practice every concept</small>
              </div>
              <div>
                <span>✦</span>
                <b>Track progress</b>
                <small>XP, streaks & badges</small>
              </div>
            </div>
          </div>
          <div className="auth-code-art">
            &lt;/&gt;<small>CODE · LEARN · CONQUER</small>
          </div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-mobile-logo">
              <img src="/assets/img/knight-logo.png" alt="KnightCode" />
              <b>
                Knight<span>Code</span>
              </b>
            </div>
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to continue</h2>
            <p className="auth-subtitle">
              Pick up your coding quest where you left off.
            </p>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            <LoginForm />
          <p><Link href="/forgot-password">Forgot password?</Link></p>
          <p><Link href="/register">Create an account</Link></p>
            <div className="auth-trust-row">
              <span>✓ Secure sign-in</span>
              <span>✓ Student account</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

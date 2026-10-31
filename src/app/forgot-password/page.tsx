import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="auth-panel"><section className="auth-card">
    <Link href="/">KnightCode</Link><h1>Forgot your password?</h1>
    <p>Students and teachers can recover their account using the email they registered with.</p>
    {error && <p className="alert alert-error" role="alert">{error}</p>}
    <PasswordRecoveryForm />
    <p><Link href="/login">Student sign-in</Link> / <Link href="/teacher-login">Teacher sign-in</Link></p>
  </section></main>;
}

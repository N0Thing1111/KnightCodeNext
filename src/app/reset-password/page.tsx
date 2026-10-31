import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPasswordRecovery } from "@/lib/password-recovery";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  // This flag only selects confirmation copy; it never authorizes a password change.
  if ((await searchParams).success === "1") {
    return <main className="auth-panel"><section className="auth-card">
      <Link href="/">KnightCode</Link>
      <h1>Password changed</h1>
      <p role="status">Your password was changed successfully. You can now sign in with your new password.</p>
      <p><Link className="btn btn-primary btn-block" href="/login">Student sign-in</Link></p>
      <p><Link className="btn btn-secondary btn-block" href="/teacher-login">Teacher sign-in</Link></p>
    </section></main>;
  }
  const client = await createClient();
  const { data } = await client.auth.getUser();
  const allowed = !!data.user && await hasPasswordRecovery(data.user.id);
  return <main className="auth-panel"><section className="auth-card">
    <Link href="/">KnightCode</Link><h1>Choose a new password</h1>
    {allowed ? <PasswordRecoveryForm reset /> : <p role="alert">Open a valid password recovery link from your email to continue. Request another link if it has expired.</p>}
    <p><Link href="/forgot-password">Request a new recovery link</Link></p>
    <p><Link href="/login">Student sign-in</Link> / <Link href="/teacher-login">Teacher sign-in</Link></p>
  </section></main>;
}

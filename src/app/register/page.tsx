import Link from "next/link";
import { RegistrationForm } from "./registration-form";
export default async function Page({searchParams}:{searchParams:Promise<{role?:string}>}) {
 const role=(await searchParams).role==="teacher" ? "teacher" : "student";
 return <main className="auth-panel"><section className="auth-card">
 <Link href="/">KnightCode</Link><h1>{role==="teacher" ? "Register as a teacher" : "Create your student account"}</h1>
 <p>{role==="teacher" ? "Verify your education email, then wait for platform administrator approval." : "Join one class with your teacher's invitation code after verifying your email."}</p>
 <RegistrationForm role={role}/>
 <p><Link href={role==="teacher" ? "/teacher-login" : "/login"}>Already registered? Sign in</Link></p>
 <Link href={role==="teacher" ? "/register" : "/register?role=teacher"}>{role==="teacher" ? "Student registration" : "Teacher registration"}</Link>
 </section></main>;
}

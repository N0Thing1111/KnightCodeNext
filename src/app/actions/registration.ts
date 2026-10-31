"use server";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validUsername } from "@/lib/registration-rules";

export type RegistrationState = { error?: string; success?: string; email?: string };
export async function registerAccount(_: RegistrationState, form: FormData): Promise<RegistrationState> {
  const name=String(form.get("name")||"").trim();
  const email=String(form.get("email")||"").trim().toLowerCase();
  const username=String(form.get("username")||"").trim().toLowerCase();
  const password=String(form.get("password")||"");
  const role=form.get("role")==="teacher" ? "teacher" : "student";
  const resend=form.get("intent")==="resend";
  if (!resend && (!name || name.length>150 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length>254 || !validUsername(username) || password.length<12 || password.length>128))
    return {error:"Enter your name, a valid email, a username of 3 to 40 letters/numbers/dots/underscores/hyphens, and a password of 12 to 128 characters."};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length>254) return {error:"Enter a valid email address."};
  try {
    const db=createAdminClient();
    const h=await headers();
    const address=h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    for(const [key,max] of [["ip:"+address,15],["email:"+email,3]] as const) {
      const limit=await db.rpc("consume_registration_limit",{p_key:createHash("sha256").update(key).digest("hex"),p_max:max});
      if(limit.error) return {error:"Registration is not available yet. Please contact KnightCode support."};
      if(!limit.data) return {error:"Too many registration attempts. Try again in 15 minutes."};
    }
    const base=process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://"+process.env.VERCEL_PROJECT_PRODUCTION_URL : "http://localhost:3000");
    const client=await createClient();
    if(resend) {
      const result=await client.auth.resend({type:"signup",email,options:{emailRedirectTo:base.replace(/\/$/,"")+"/auth/callback"}});
      if(result.error) return {error:"Could not resend verification. Wait a minute and try again."};
      return {success:"If this account is awaiting verification, another email has been requested. Check your inbox and spam folder.",email};
    }
    const result=await client.auth.signUp({email,password,options:{emailRedirectTo:base.replace(/\/$/,"")+"/auth/callback",data:{name,username,requested_role:role}}});
    if(result.error) return {error:result.error.code==="signup_disabled" ? "Registration is not enabled yet. Please contact KnightCode support." : "Registration could not finish. Check your details, try another username, or sign in if you already have an account."};
    return {email,success:role==="teacher" ? "Check your email to verify your account. Once verified, sign in to the teacher portal." : "Check your email to verify your account. Then sign in and use your teacher's class code to request enrollment."};
  } catch { return {error:"Registration is temporarily unavailable. Please try again later."}; }
}

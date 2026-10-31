import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startPasswordRecovery } from "@/lib/password-recovery";
export async function GET(request: Request) {
 const url=new URL(request.url);const client=await createClient();const code=url.searchParams.get("code");
 if(!code) return NextResponse.redirect(new URL("/login",url.origin));
 let recovery = false;
 const { data: listener } = client.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") recovery = true; });
 const result=await client.auth.exchangeCodeForSession(code);
 listener.subscription.unsubscribe();
 if(result.error) return NextResponse.redirect(new URL("/login?error=Email%20link%20expired%20or%20opened%20in%20a%20different%20browser.%20Request%20another%20email.",url.origin));
 if (recovery) {
   await startPasswordRecovery(result.data.user.id);
   return NextResponse.redirect(new URL("/reset-password", url.origin));
 }
 const user=result.data.user;
 const profile=await client.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
 const path=profile.data?.role==="teacher" ? (profile.data.active?"/teacher/dashboard":"/teacher-login?error=This%20teacher%20account%20is%20not%20active.%20Contact%20platform%20support.") : profile.data?.role==="admin" ? "/admin" : "/join";
 return NextResponse.redirect(new URL(path,url.origin));
}

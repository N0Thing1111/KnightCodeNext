import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
 const url=new URL(request.url);const client=await createClient();const code=url.searchParams.get("code");
 if(!code) return NextResponse.redirect(new URL("/login",url.origin));
 const result=await client.auth.exchangeCodeForSession(code);
 if(result.error) return NextResponse.redirect(new URL("/login?error=Verification%20link%20expired.%20Try%20signing%20in%20or%20request%20another%20email.",url.origin));
 const user=result.data.user;
 const profile=await client.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
 const path=profile.data?.role==="teacher" ? (profile.data.active?"/teacher/dashboard":"/teacher-login?notice=Email%20verified.%20Your%20teacher%20registration%20is%20awaiting%20approval.") : profile.data?.role==="admin" ? "/admin" : "/join";
 return NextResponse.redirect(new URL(path,url.origin));
}

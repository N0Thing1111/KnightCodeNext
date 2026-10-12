import { requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
export default async function SupportPage() {
  await requireStudent();
  const { data, error } = await createAdminClient().from("admin_settings").select("setting_key,setting_value").in("setting_key",["school_name","support_contact","support_email","support_phone","support_hours","support_instructions"]);
  if (error) throw Error("Support details could not be loaded. Please try again.");
  const settings = Object.fromEntries((data || []).map(r => [r.setting_key,r.setting_value]));
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.support_email || "") ? settings.support_email : "";
  return <main className="page-container lessons-page"><section className="page-hero"><div><span className="eyebrow">{settings.school_name || "YOUR SCHOOL"}</span><h1>Contact &amp; Support</h1><p>Get help with your KnightCode account, lessons, or game.</p></div></section>
    <section className="panel"><h2>{settings.support_contact || "School support"}</h2>
      {email && <p>Email: <a href={"mailto:"+email}>{email}</a></p>}
      {settings.support_phone && <p>Phone: {settings.support_phone}</p>}
      {settings.support_hours && <p>Office hours: {settings.support_hours}</p>}
      {settings.support_instructions && <p style={{whiteSpace:"pre-wrap"}}>{settings.support_instructions}</p>}
      {!email && !settings.support_phone && <p>Ask your assigned teacher for help. Your school administrator has not added contact details yet.</p>}
      <p>When reporting a problem, include the lesson or level, what you clicked, and any error shown. Do not send your password.</p>
    </section></main>;
}

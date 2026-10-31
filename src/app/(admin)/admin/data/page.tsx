import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformResetForm } from "@/components/platform-reset-form";
import { allRows } from "@/lib/query-pages";
import { AdminDataNavigation } from "@/components/admin-data-navigation";
import { Alerts } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getPythonRoster } from "@/lib/python-data";
import { RunHistoryCleanup } from "@/components/run-history-cleanup";
// Request-time defaults for this authenticated server page.
const phDate = (daysAgo: number) => new Date(Date.now() + 8 * 3600000 - daysAgo * 86400000).toISOString().slice(0, 10);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const admin = await requireAdmin();
  if (!q.scope || q.scope === "history") {
    const roster = await getPythonRoster(admin);
    return <div className="admin-data-management">
      <AdminDataNavigation active="history" />
      <Alerts q={q} />
      <RunHistoryCleanup
        students={roster.students.map(({ id, name, email, class_id }) => ({ id, name, email, class_id }))}
        sections={roster.sections.map(({ id, name }) => ({ id, name }))}
        defaultBefore={phDate(30)} maxBefore={phDate(1)}
      />
    </div>;
  }
  const platform = q.scope === "platform" || q.scope === "school";
  const roster = await getPythonRoster(admin);
  const teachers = await allRows(() => createAdminClient().from("profiles").select("id,name,email,active").eq("role","teacher").order("id"));
  const sectionNames = new Map(roster.sections.map(s => [s.id,s.name]));
  return <div className="admin-data-management">
    <AdminDataNavigation active={platform?"school":"learning"}/><Alerts q={q}/>
    <PlatformResetForm key={platform?"platform":"learning"} platform={platform}
      students={roster.students.map(s=>({id:s.id,label:s.name+" ("+s.email+") - "+(sectionNames.get(s.class_id)||"Independent learner")}))}
      sections={roster.sections.map(s=>({id:String(s.id),label:s.name+" - "+(teachers.find(t=>t.id===s.teacher_id)?.name||"Teacher")+(s.status==='archived'?' (archived)':'')}))}
      teachers={teachers.map(t=>({id:t.id,label:t.name+" ("+t.email+")"+(t.active?'':' (archived)')}))}/>
  </div>;
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { allRows } from "@/lib/query-pages";
import { sectionLabel } from "@/lib/section-label";
import { AdminHero } from "@/components/admin-ui";
import { AdminStudentImporter } from "@/components/admin-student-importer";

export default async function Page() {
  await requireAdmin();
  const db = createAdminClient();
  const [sections, teachers] = await Promise.all([
    allRows(() => db.from("classes").select("id,name,section,teacher_id").eq("status", "active").order("id")),
    allRows(() => db.from("profiles").select("id,name").eq("role", "teacher").eq("active", true).order("id")),
  ]);
  const names = new Map(teachers.map(teacher => [teacher.id, teacher.name]));
  return <>
    <AdminHero title="Import Students" description="Preview student accounts and enroll them in a section from the admin portal.">
      <Link className="teacher-btn" href="/admin/manage/students">Back to Students</Link>
    </AdminHero>
    <AdminStudentImporter sections={sections.filter(section => names.has(section.teacher_id)).map(section => ({ id: section.id, name: section.name, label: sectionLabel(section), teacher: names.get(section.teacher_id)! }))} />
  </>;
}

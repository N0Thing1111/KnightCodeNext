import { TeacherShell } from "@/components/teacher-shell";
import { requireTeacher } from "@/lib/auth";
import { getTeacherContext } from "@/lib/teacher-data";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacher();
  const ctx = await getTeacherContext(teacher.id);
  return (
    <TeacherShell teacher={teacher} notifications={ctx.notifications}>
      {children}
    </TeacherShell>
  );
}

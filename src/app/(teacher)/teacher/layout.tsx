import { TeacherShell } from "@/components/teacher-shell";
import { requireTeacher } from "@/lib/auth";
import { getTeacherNotifications } from "@/lib/teacher-data";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacher();
  const notifications = await getTeacherNotifications(teacher.id);
  return (
    <TeacherShell teacher={teacher} notifications={notifications}>
      {children}
    </TeacherShell>
  );
}

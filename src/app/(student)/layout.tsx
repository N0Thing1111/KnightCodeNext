import { StudentShell } from "@/components/student-shell";
import { requireStudent } from "@/lib/auth";
import { getNotifications, getStudentStats } from "@/lib/student-data";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireStudent();
  const [stats, notifications] = await Promise.all([
    getStudentStats(student),
    getNotifications(student.id),
  ]);
  return (
    <StudentShell
      student={student}
      stats={{
        level: stats.level,
        rank: stats.rank,
        xp: stats.xp,
        xpPct: stats.xpPct,
        streak: stats.streak,
      }}
      notifications={notifications}
    >
      {children}
    </StudentShell>
  );
}

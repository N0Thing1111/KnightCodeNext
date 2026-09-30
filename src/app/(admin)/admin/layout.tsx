import "../../teacher.css";
import "../../admin.css";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}

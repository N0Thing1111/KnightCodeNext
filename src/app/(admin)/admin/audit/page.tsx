import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { AdminHero } from "@/components/admin-ui";
import { formatSchoolDateTime } from "@/lib/school-time";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const q = await searchParams, db = createAdminClient();
  const page = Math.max(1, Math.min(100000, Number.parseInt(q.page || "1", 10) || 1)), size = 50;
  const result = await db.from("admin_audit_log").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * size, page * size - 1);
  if (result.error) throw Error(result.error.message);
  const rows = result.data || [], count = result.count || 0;
  const ids = [...new Set(rows.map(row => row.admin_id).filter(Boolean))];
  const admins = ids.length ? await db.from("profiles").select("id,name").in("id", ids) : { data: [], error: null };
  if (admins.error) throw Error(admins.error.message);
  return (
    <>
      <AdminHero
        title="Audit History"
        description="A chronological record of administrator sign-ins and changes to school data. Times are shown in Philippine time (UTC+8)."
      />
      <section className="teacher-card">
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Record</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => {
                  const a = admins.data?.find((p) => p.id === r.admin_id);
                  return (
                    <tr key={r.id}>
                      <td><time dateTime={r.created_at}>{formatSchoolDateTime(r.created_at)}</time></td>
                      <td>{a?.name || "Administrator"}</td>
                      <td>{String(r.action).replaceAll("_", " ")}</td>
                      <td>
                        {r.entity}
                        {r.record_id ? " #" + r.record_id : ""}
                      </td>
                      <td>
                        <small>
                          {Object.keys(r.details || {}).length
                            ? JSON.stringify(r.details)
                            : "—"}
                        </small>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="teacher-empty">No audit events yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-actions">
          {page > 1 && <a href={"?page=" + (page - 1)}>Newer</a>}
          {count > page * size && (
            <a href={"?page=" + (page + 1)}>Older</a>
          )}
        </div>
      </section>
    </>
  );
}

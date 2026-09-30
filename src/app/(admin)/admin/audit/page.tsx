import { getAdminContext } from "@/lib/admin-data";
import { AdminHero } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [q, ctx] = await Promise.all([searchParams, getAdminContext()]),
    page = Math.max(1, Number(q.page || 1)),
    size = 50,
    rows = ctx.admin_audit_log.slice((page - 1) * size, page * size);
  return (
    <>
      <AdminHero
        title="Audit History"
        description="A chronological record of administrator sign-ins and changes to school data."
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
                  const a = ctx.profiles.find((p) => p.id === r.admin_id);
                  return (
                    <tr key={r.id}>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
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
          {ctx.admin_audit_log.length > page * size && (
            <a href={"?page=" + (page + 1)}>Older</a>
          )}
        </div>
      </section>
    </>
  );
}

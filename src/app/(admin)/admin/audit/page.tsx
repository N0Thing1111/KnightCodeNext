import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { AdminHero } from "@/components/admin-ui";
import { formatSchoolDateTime } from "@/lib/school-time";
import { auditId, auditObject, presentAudit, type AuditNames } from "@/lib/audit-presentation";
import styles from "./audit.module.css";
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
  const profileIds = new Set<string>(), sectionIds = new Set<string>(), lessonIds = new Set<string>(), levelIds = new Set<string>();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const addProfile = (value: unknown) => { const id = auditId(value); if (uuid.test(id)) profileIds.add(id); };
  const addNumber = (set: Set<string>, value: unknown) => { const id = auditId(value); if (/^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))) set.add(id); };
  for (const row of rows) {
    const d = auditObject(row.details);
    addProfile(row.admin_id); addProfile(d.actor_id); addProfile(d.student_id);
    addProfile(auditObject(d.before).student_id); addProfile(auditObject(d.after).student_id);
    if (["students", "teachers", "class_students"].includes(row.entity)) addProfile(row.record_id);
    addNumber(sectionIds, d.class_id); addNumber(sectionIds, d.section_id);
    if (row.entity === "classes") addNumber(sectionIds, row.record_id);
    if (row.entity === "lessons") addNumber(lessonIds, row.record_id);
    if (row.entity === "levels") addNumber(levelIds, row.record_id);
  }
  // Resolve only records on this page, in batches rather than one query per row.
  const [profiles, sections, lessons, levels] = await Promise.all([
    profileIds.size ? db.from("profiles").select("id,name,role").in("id", [...profileIds]) : { data: [], error: null },
    sectionIds.size ? db.from("classes").select("id,name").in("id", [...sectionIds]) : { data: [], error: null },
    lessonIds.size ? db.from("lessons").select("id,title").in("id", [...lessonIds]) : { data: [], error: null },
    levelIds.size ? db.from("levels").select("id,title").in("id", [...levelIds]) : { data: [], error: null },
  ]);
  for (const lookup of [profiles, sections, lessons, levels]) if (lookup.error) throw Error("Unable to load audit record names. Please try again.");
  const names: AuditNames = {
    profiles: new Map((profiles.data || []).map(p => [p.id, { name: p.name, role: p.role }])),
    sections: new Map((sections.data || []).map(p => [String(p.id), p.name])),
    lessons: new Map((lessons.data || []).map(p => [String(p.id), p.title])),
    levels: new Map((levels.data || []).map(p => [String(p.id), p.title])),
  };
  return (
    <>
      <AdminHero
        title="Audit History"
        description="Administrator sign-ins, school changes, and feedback edits by teachers or administrators. Times are shown in Philippine time (UTC+8)."
      />
      <section className="teacher-card">
        <div className="teacher-table-wrap" role="region" aria-label="Audit history" tabIndex={0}>
          <table className={`teacher-table ${styles.table}`}>
            <thead>
              <tr>
                <th>When</th>
                <th>Performed by</th>
                <th>Action</th>
                <th>Record</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => {
                  const event = presentAudit(r, names);
                  return (
                    <tr key={r.id}>
                      <td><time dateTime={r.created_at}>{formatSchoolDateTime(r.created_at)}</time></td>
                      <td><strong>{event.actorName}</strong>{event.actorRole && <small className={styles.secondary}>{event.actorRole}</small>}</td>
                      <td>{event.action}</td>
                      <td>{event.record}</td>
                      <td className={styles.summary}>{event.summary}</td>
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

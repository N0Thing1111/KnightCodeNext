import { cookies } from "next/headers";
import { AdminHero, Alerts } from "@/components/admin-ui";
import { AdminImporter } from "@/components/admin-importer";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [query, jar] = await Promise.all([searchParams, cookies()]);
  let credentials: Array<{
    name: string;
    email: string;
    teacher_id: string;
    password: string;
  }> = [];
  try {
    credentials = JSON.parse(jar.get("kc_admin_import")?.value || "[]");
  } catch {}
  return (
    <>
      <AdminHero
        title="Import Teachers"
        description="Create teacher accounts in bulk while reviewing every row before anything is saved."
      />
      <Alerts q={query} />
      <AdminImporter />
      {credentials.length > 0 && (
        <section className="teacher-card">
          <h3>Accounts created - copy credentials now</h3>
          <p className="admin-note">
            These passwords will not be shown after this one-time result
            expires.
          </p>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Teacher ID</th>
                  <th>Password</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((row) => (
                  <tr key={row.email}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.teacher_id}</td>
                    <td>
                      <code>{row.password}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

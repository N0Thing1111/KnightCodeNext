import { getSessionResults } from "@/lib/session-results";
import { SessionResults } from "@/components/session-results";
import { AdminHero } from "@/components/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await getSessionResults("admin", await searchParams);
  return (
    <>
      <AdminHero
        title="Session Results"
        description="Find a student's sessions by name, student ID, email, or section, then review their submitted programs."
      />
      <SessionResults result={result} role="admin" />
    </>
  );
}

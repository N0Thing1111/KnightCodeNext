import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExecutionHistory } from "@/lib/execution-history";
import { SessionRunHistory } from "@/components/session-run-history";
import { Back } from "@/components/teacher-ui";
import { AdminHero } from "@/components/admin-ui";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const [{ id }, q] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const db = createAdminClient();
  const { data: session } = await db
    .from("student_level_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();
  const [{ data: student }, { data: level }, history] = await Promise.all([
    db
      .from("profiles")
      .select("name")
      .eq("id", session.student_id)
      .maybeSingle(),
    db.from("levels").select("title").eq("id", session.level_id).maybeSingle(),
    getExecutionHistory(session, q.page),
  ]);
  return (
    <>
      <Back href="/admin/results" label="Back to session results" />
      <AdminHero
        title={`${student?.name ?? "Student"} · ${level?.title ?? "Level"}`}
        description="Submitted code and results for this learning session."
      />
      <SessionRunHistory
        session={session}
        {...history}
        href={`/admin/results/${id}`}
      />
    </>
  );
}

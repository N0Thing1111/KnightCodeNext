import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherContext, assignedLevelIds } from "@/lib/teacher-data";
import { getExecutionHistory } from "@/lib/execution-history";
import { SessionRunHistory } from "@/components/session-run-history";
import { Back, Hero } from "@/components/teacher-ui";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; sessionId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id, sessionId }, q, teacher] = await Promise.all([
    params,
    searchParams,
    requireTeacher(),
  ]);
  const ctx = await getTeacherContext(teacher.id);
  const student = ctx.students.find((s) => s.id === id);
  if (!student || !/^\d+$/.test(sessionId)) notFound();
  const db = createAdminClient();
  const { data: session } = await db
    .from("student_level_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("student_id", id)
    .maybeSingle();
  if (!session || !assignedLevelIds(ctx, id).has(Number(session.level_id)))
    notFound();
  const level = ctx.levels.find((l) => l.id === session.level_id);
  const history = await getExecutionHistory(session, q.page);
  const { data: others } = await db
    .from("student_level_sessions")
    .select("id,started_at,completed")
    .eq("student_id", id)
    .eq("level_id", session.level_id)
    .order("started_at", { ascending: false })
    .limit(50);
  const href = `/teacher/student/${id}/sessions/${sessionId}`;
  return (
    <>
      <Back href={`/teacher/student/${id}`} label="Back to student" />
      <Hero
        eyebrow="SESSION REVIEW"
        title={`${student.name} · ${level?.title ?? "Level"}`}
        description="Review the student's submitted code and results in the order they happened."
      />
      <details className="teacher-card">
        <summary>Compare sessions for this level</summary>
        <div className="run-session-links">
          {(others ?? []).map((s) => (
            <Link
              className="teacher-btn"
              key={s.id}
              href={`/teacher/student/${id}/sessions/${s.id}`}
              aria-current={String(s.id) === sessionId ? "page" : undefined}
            >
              {new Date(s.started_at).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
              })}{" "}
              · {s.completed ? "Completed" : "Unfinished"}
            </Link>
          ))}
        </div>
      </details>
      <SessionRunHistory session={session} {...history} href={href} />
    </>
  );
}

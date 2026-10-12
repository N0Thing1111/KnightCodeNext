import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  await requireStudent();
  const { run } = await searchParams;
  if (run && /^[0-9a-f-]{36}$/i.test(run)) {
    const db = await createClient();
    const { data } = await db
      .from("python_runs")
      .select("activity_id")
      .eq("id", run)
      .maybeSingle();
    if (data) {
      const activity = await db
        .from("python_activities")
        .select("lesson_id")
        .eq("id", data.activity_id)
        .maybeSingle();
      if (activity.data)
        redirect(
          "/lesson/" +
            activity.data.lesson_id +
            "/python?run=" +
            run +
            "#history",
        );
    }
  }
  redirect("/lessons");
}

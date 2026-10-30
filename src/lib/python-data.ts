import { allRows } from "@/lib/query-pages";
﻿import "server-only";
import { cache } from "react";
import type { CompletionActivity, CompletionSubmission } from "@/lib/lesson-completion";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import type { PythonActivity } from "@/lib/python-contract";

export async function getPythonActivities() {
  const db = await createClient();
  const result = await db
    .from("python_activities")
    .select("*")
    .order("lesson_id");
  if (result.error && ["42P01", "PGRST205"].includes(result.error.code))
    return null;
  if (result.error) throw new Error(result.error.message);
  return (result.data || []) as PythonActivity[];
}

export async function getPythonRoster(actor: Profile) {
  if (!["teacher", "admin"].includes(actor.role))
    throw Error("Staff access required.");
  const db = createAdminClient();
  const sections: {
    id: number;
    name: string;
    teacher_id: string;
    status: string;
  }[] = [];
  for (let from = 0; ; from += 500) {
    let query = db
      .from("classes")
      .select("id,name,teacher_id,status")
      .order("id");
    if (actor.role === "teacher") query = query.eq("teacher_id", actor.id);
    const page = await query.range(from, from + 499);
    if (page.error) throw Error(page.error.message);
    sections.push(...(page.data || []));
    if (!page.data || page.data.length < 500) break;
  }
  const memberships: { student_id: string; class_id: number }[] = [];
  // Batch section IDs so large schools do not exceed request URL limits.
  for (let start = 0; start < sections.length; start += 100) {
    const ids = sections.slice(start, start + 100).map((row) => row.id);
    for (let from = 0; ; from += 500) {
      const page = await db
        .from("class_students")
        .select("student_id,class_id")
        .in("class_id", ids)
        .order("student_id")
        .range(from, from + 499);
      if (page.error) throw Error(page.error.message);
      memberships.push(...(page.data || []));
      if (!page.data || page.data.length < 500) break;
    }
  }
  const membershipByStudent = new Map(
    memberships.map((row) => [row.student_id, row.class_id]),
  );
  const students: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    class_id: number;
  }[] = [];
  if (actor.role === "admin") {
    // Admins can also find historical Runs for students no longer in a section.
    for (let from = 0; ; from += 500) {
      const page = await db
        .from("profiles")
        .select("id,name,username,email")
        .eq("role", "student")
        .order("id")
        .range(from, from + 499);
      if (page.error) throw Error(page.error.message);
      students.push(
        ...(page.data || []).map((row) => ({
          ...row,
          class_id: membershipByStudent.get(row.id) || 0,
        })),
      );
      if (!page.data || page.data.length < 500) break;
    }
  } else {
    for (let start = 0; start < memberships.length; start += 100) {
      const part = memberships.slice(start, start + 100);
      const rows = await db
        .from("profiles")
        .select("id,name,username,email")
        .eq("role", "student")
        .in(
          "id",
          part.map((row) => row.student_id),
        );
      if (rows.error) throw Error(rows.error.message);
      students.push(
        ...(rows.data || []).map((row) => ({
          ...row,
          class_id: membershipByStudent.get(row.id)!,
        })),
      );
    }
  }
  return {
    sections: sections.sort((a, b) => a.name.localeCompare(b.name)),
    students: students.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export const getPythonCompletion = cache(async () => {
 const db = await createClient();
 const result = await db.from("python_activities").select("id,lesson_id,published");
 if (result.error) throw Error(result.error.message);
 const submissions = await allRows(() => db.rpc("python_completion_pairs").order("student_id").order("activity_id")) as CompletionSubmission[];
 return { activities: (result.data || []) as CompletionActivity[], submissions };
});

import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getPythonActivities } from "@/lib/python-data";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStudent();
  const { id } = await params;
  const activity = (await getPythonActivities())?.find((a) => a.id === id);
  if (!activity) notFound();
  redirect("/lesson/" + activity.lesson_id + "/python");
}

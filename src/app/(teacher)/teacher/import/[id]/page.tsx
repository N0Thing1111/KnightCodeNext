import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";

// Preserve old bookmarks without loading retired import batches.
export default async function Page() {
  await requireTeacher();
  redirect("/teacher/classes");
}

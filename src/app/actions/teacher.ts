"use server";
import { getSchoolName } from "@/lib/school-name";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendStudentPasswordEmail } from "@/lib/mail";
import { requireSectionArchive, setStudentSection } from "@/lib/sections";
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(f.get(k) || 0);
const admin = () => createAdminClient();
function target(path: string, key: "notice" | "error", message: string) {
  return (
    path +
    (path.includes("?") ? "&" : "?") +
    key +
    "=" +
    encodeURIComponent(message)
  );
}
async function ownsClass(t: string, id: number) {
  const { data } = await admin()
    .from("classes")
    .select("id")
    .eq("id", id)
    .eq("teacher_id", t)
    .maybeSingle();
  return !!data;
}
async function ownsStudent(t: string, id: string) {
  const { data: classes } = await admin()
    .from("classes")
    .select("id")
    .eq("teacher_id", t);
  const ids = (classes ?? []).map((c) => c.id);
  if (!ids.length) return false;
  const { data } = await admin()
    .from("class_students")
    .select("student_id")
    .eq("student_id", id)
    .in("class_id", ids)
    .maybeSingle();
  return !!data;
}
async function finish(path: string, job: () => Promise<string>) {
  let key: "notice" | "error" = "notice",
    msg = "Saved.";
  try {
    msg = await job();
  } catch (e) {
    key = "error";
    msg = e instanceof Error ? e.message : "Something went wrong.";
  }
  revalidatePath("/", "layout");
  redirect(target(path, key, msg));
}
export async function saveClass(f: FormData) {
  const t = await requireTeacher();
  const id = num(f, "id");
  await finish("/teacher/classes", async () => {
    const name = str(f, "name"),
      section = name;
    if (!name || !section) throw Error("Section name is required.");
    const row = {
      teacher_id: t.id,
      name,
      section,
      subject: str(f, "subject") || "Programming",
      school_year: str(f, "school_year") || null,
      description: str(f, "description") || null,
    };
    const q = id
      ? admin().from("classes").update(row).eq("id", id).eq("teacher_id", t.id)
      : admin().from("classes").insert(row);
    const { error } = await q;
    if (error) throw Error(error.message);
    return id ? "Section updated." : "Section created.";
  });
}
export async function setClassStatus(f: FormData) {
  const t = await requireTeacher();
  const id = num(f, "id"),
    status = str(f, "status") === "archived" ? "archived" : "active";
  await finish("/teacher/classes", async () => {
    await requireSectionArchive();
    const { error } = await admin()
      .from("classes")
      .update({ status })
      .eq("id", id)
      .eq("teacher_id", t.id);
    if (error) throw Error(error.message);
    return status === "archived" ? "Section archived." : "Section restored.";
  });
}
export async function removeStudent(f: FormData) {
  const t = await requireTeacher();
  const classId = num(f, "class_id"),
    studentId = str(f, "student_id");
  await finish("/teacher/class/" + classId, async () => {
    if (!(await ownsClass(t.id, classId))) throw Error("Unauthorized section.");
    const { error } = await admin()
      .from("class_students")
      .delete()
      .eq("class_id", classId)
      .eq("student_id", studentId);
    if (error) throw Error(error.message);
    return "Student removed from this section.";
  });
}
export async function addExistingStudent(f: FormData) {
  const t = await requireTeacher();
  const classId = num(f, "class_id"),
    studentId = str(f, "student_id");
  await finish("/teacher/class/" + classId, async () => {
    if (
      !(await ownsClass(t.id, classId)) ||
      !(await ownsStudent(t.id, studentId))
    )
      throw Error("Student is not in one of your sections.");
    await setStudentSection(studentId, classId, t.id, true);
    return "Student added to this section.";
  });
}
function temporaryPassword() {
  return "KC-" + crypto.randomUUID().replaceAll("-", "").slice(0, 8) + "!";
}

export async function manualAddStudent(f: FormData) {
 await requireTeacher();
 redirect("/teacher/class/"+num(f,"class_id")+"?error="+encodeURIComponent("Use the class invitation code. Students register and request enrollment themselves."));
}

export async function createAssignment(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/assignments", async () => {
    const classId = num(f, "class_id"),
      studentId = str(f, "student_id"),
      lessonId = num(f, "lesson_id"),
      levelId = num(f, "level_id"),
      title = str(f, "title");
    if (!classId && !studentId)
      throw Error("Choose a section or an individual student.");
    if (classId && !(await ownsClass(t.id, classId)))
      throw Error("Invalid section.");
    if (studentId && !(await ownsStudent(t.id, studentId)))
      throw Error("Invalid student.");
    if (classId && studentId) {
      const { data: member } = await admin()
        .from("class_students")
        .select("student_id")
        .eq("class_id", classId)
        .eq("student_id", studentId)
        .maybeSingle();
      if (!member)
        throw Error("The selected student is not enrolled in that section.");
    }
    if (!lessonId && !levelId) throw Error("Choose a lesson or level.");
    if (!title || title.length > 180)
      throw Error("Enter a valid assignment title.");
    let actualLesson = lessonId;
    if (levelId) {
      const { data } = await admin()
        .from("levels")
        .select("lesson_id")
        .eq("id", levelId)
        .eq("active", true)
        .single();
      if (!data) throw Error("Invalid challenge.");
      actualLesson = data.lesson_id;
    }
    const { data: activeLesson, error: lessonError } = await admin()
      .from("lessons")
      .select("id")
      .eq("id", actualLesson)
      .eq("active", true)
      .maybeSingle();
    if (lessonError) throw Error(lessonError.message);
    if (!activeLesson) throw Error("This lesson is archived or no longer available. Choose an active lesson.");
    const due = str(f, "due_date");
    if (due && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(due)) throw Error("Enter a valid due date and time.");
    const dueAt = due ? new Date(due + "+08:00").toISOString() : null;
    const { data: assignment, error } = await admin()
      .rpc("create_assignment_for_active_section", { p_teacher: t.id, p_assignment: {
        class_id: studentId ? null : classId || null,
        student_id: studentId || null,
        lesson_id: actualLesson || null,
        level_id: levelId || null,
        title,
        instructions: str(f, "instructions") || null,
        due_date: dueAt,
      } });
    if (error) throw Error(error.message);
    let recipients: string[] = [];
    if (studentId) recipients = [studentId];
    else if (classId) {
      const { data } = await admin()
        .from("class_students")
        .select("student_id")
        .eq("class_id", classId);
      recipients = (data ?? []).map((x) => x.student_id);
    }
    if (recipients.length) {
      await admin()
        .from("student_notifications")
        .upsert(
          recipients.map((s) => ({
            student_id: s,
            notification_key: "assignment_" + assignment.id + "_" + s,
            type: "assignment",
            title,
            message:
              "A new KnightCode assignment has been posted" +
              (due
                ? " for " +
                  new Date(dueAt!).toLocaleDateString("en-US", {
                    timeZone: "Asia/Manila",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "") +
              ".",
            link: "/assignments#assignment-" + assignment.id,
          })),
          { onConflict: "student_id,notification_key" },
        );
    }
    return "Assignment created and students notified.";
  });
}
export async function deleteAssignment(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/assignments", async () => {
    const id = num(f, "id");
    const { error } = await admin()
      .from("assignments")
      .delete()
      .eq("id", id)
      .eq("teacher_id", t.id);
    if (error) throw Error(error.message);
    return "Assignment removed.";
  });
}
export async function saveAnnouncement(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/announcements", async () => {
    const classId = num(f, "class_id"),
      title = str(f, "title"),
      body = str(f, "body"),
      draftId = num(f, "draft_id");
    if (!str(f, "class_id")) throw Error("Choose an audience before publishing.");
    if (!Number.isSafeInteger(classId) || classId < 0 ||
        !Number.isSafeInteger(draftId) || draftId < 0)
      throw Error("Invalid announcement or audience.");
    if (classId) {
      const { data: section, error } = await admin().from("classes")
        .select("id").eq("id", classId).eq("teacher_id", t.id)
        .eq("status", "active").maybeSingle();
      if (error) throw Error(error.message);
      if (!section) throw Error("Choose an active section you manage.");
    }
    if (!title || !body) throw Error("Title and message are required.");
    if (title.length > 180) throw Error("Keep the title within 180 characters.");
    const announcement = {
      teacher_id: t.id,
      class_id: classId || null,
      title,
      body,
      status: "published",
      published_at: new Date().toISOString(),
    };
    const query = draftId
      ? admin().from("announcements").update(announcement)
          .eq("id", draftId).eq("teacher_id", t.id).eq("status", "draft")
      : admin().from("announcements").insert(announcement);
    const { data: row, error } = await query.select().single();
    if (error) throw Error(error.message);
    const { data: classes } = await admin()
      .from("classes")
      .select("id")
      .eq("teacher_id", t.id).eq("status", "active");
    const ids = classId ? [classId] : (classes ?? []).map((c) => c.id);
    const { data: members } = ids.length
      ? await admin()
          .from("class_students")
          .select("student_id")
          .in("class_id", ids)
      : { data: [] };
    const recipients = [...new Set((members ?? []).map((m) => m.student_id))];
    if (recipients.length)
      await admin()
        .from("student_notifications")
        .upsert(
          recipients.map((s) => ({
            student_id: s,
            notification_key: "announcement_" + row.id + "_" + s,
            type: "announcement",
            title,
            message: body.slice(0, 220),
            link: "/dashboard",
          })),
          { onConflict: "student_id,notification_key" },
        );
    return "Announcement published and delivered to students.";
  });
}
export async function deleteAnnouncement(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/announcements", async () => {
    const { error } = await admin()
      .from("announcements")
      .delete()
      .eq("id", num(f, "id"))
      .eq("teacher_id", t.id);
    if (error) throw Error(error.message);
    return "Announcement deleted.";
  });
}
export async function resetStudentPassword(f: FormData) {
  const t = await requireTeacher();
  const id = str(f, "student_id");
  await finish("/teacher/student/" + id, async () => {
    if (!(await ownsStudent(t.id, id))) throw Error("Unauthorized student.");
    const a = admin();
    const { data: student, error: studentError } = await a
      .from("profiles")
      .select("name,email,student_id,username")
      .eq("id", id)
      .eq("role", "student")
      .single();
    if (studentError || !student)
      throw Error(studentError?.message || "Student account not found.");
    const password = temporaryPassword();
    const { error } = await a.auth.admin.updateUserById(id, { password });
    if (error) throw Error(error.message);
    const emailSent = await sendStudentPasswordEmail({
      email: student.email,
      name: student.name,
      studentId: student.student_id,
      username: student.username,
      temporaryPassword: password,
      schoolLabel: await getSchoolName(a),
      reason: "reset",
    });
    const jar = await cookies();
    jar.set(
      "kc_teacher_flash",
      JSON.stringify({
        message: "Password reset. New temporary password:",
        password,
        emailSent,
        email: student.email,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 180,
        path: "/teacher/student/" + id,
      },
    );
    return "Password reset.";
  });
}
export async function saveTeacherProfile(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/profile", async () => {
    const name = str(f, "name"),
      email = str(f, "email").toLowerCase();
    if (!name || !z.string().email().safeParse(email).success)
      throw Error("Enter a valid name and email.");
    const a = admin();
    const { error: authError } = await a.auth.admin.updateUserById(t.id, {
      email,
      email_confirm: true,
    });
    if (authError) throw Error(authError.message);
    const { error } = await a
      .from("profiles")
      .update({ name, email })
      .eq("id", t.id);
    if (error) throw Error(error.message);
    return "Profile updated.";
  });
}
export async function saveTeacherAvatar(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/profile", async () => {
    const key = str(f, "avatar_key");
    if (!["knight", "blue", "mage", "fox", "dragon", "robot"].includes(key))
      throw Error("Invalid avatar.");
    const { error } = await admin()
      .from("profiles")
      .update({ avatar_key: key, profile_image: null })
      .eq("id", t.id);
    if (error) throw Error(error.message);
    return "Avatar selected.";
  });
}
export async function saveTeacherTheme(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/profile", async () => {
    const theme = str(f, "theme") === "light" ? "light" : "dark";
    const { error } = await admin()
      .from("profiles")
      .update({ theme_preference: theme })
      .eq("id", t.id);
    if (error) throw Error(error.message);
    return "Theme preference updated.";
  });
}
export async function uploadTeacherPhoto(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/profile", async () => {
    const file = f.get("profile_image");
    if (!(file instanceof File) || !file.size)
      throw Error("Choose an image first.");
    if (file.size > 5 * 1024 * 1024) throw Error("Maximum file size is 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Only JPG, PNG, and WebP images are supported.");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const key = t.id + "/teacher-" + crypto.randomUUID() + "." + ext;
    const a = admin();
    const { error: up } = await a.storage
      .from("profile-images")
      .upload(key, await file.arrayBuffer(), { contentType: file.type });
    if (up) throw Error(up.message);
    const { error } = await a
      .from("profiles")
      .update({ profile_image: key })
      .eq("id", t.id);
    if (error) throw Error(error.message);
    if (t.profile_image)
      await a.storage.from("profile-images").remove([t.profile_image]);
    return "Profile picture uploaded.";
  });
}
export async function changeTeacherPassword(f: FormData) {
  const t = await requireTeacher();
  await finish("/teacher/profile", async () => {
    const current = str(f, "current_password"),
      next = str(f, "new_password");
    if (next.length < 8)
      throw Error("New password must be at least 8 characters.");
    const s = await createClient();
    const { error: check } = await s.auth.signInWithPassword({
      email: t.email,
      password: current,
    });
    if (check) throw Error("Current password is incorrect.");
    const { error } = await s.auth.updateUser({ password: next });
    if (error) throw Error(error.message);
    return "Password changed successfully.";
  });
}

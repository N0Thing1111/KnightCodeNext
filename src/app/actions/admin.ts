/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendStudentPasswordEmail, sendTeacherPasswordEmail } from "@/lib/mail";
import { requireSectionMembership, setStudentSection } from "@/lib/sections";
const db = () => createAdminClient(),
  str = (f: FormData, k: string) => String(f.get(k) || "").trim(),
  num = (f: FormData, k: string) => Number(f.get(k) || 0);
function url(path: string, key: string, msg: string) {
  return (
    path +
    (path.includes("?") ? "&" : "?") +
    key +
    "=" +
    encodeURIComponent(msg)
  );
}
async function audit(
  adminId: string,
  action: string,
  entity: string,
  recordId?: string | number | null,
  details: any = {},
) {
  await db()
    .from("admin_audit_log")
    .insert({
      admin_id: adminId,
      action,
      entity,
      record_id: recordId == null ? null : String(recordId),
      details,
    });
}
async function finish(path: string, job: (admin: any) => Promise<string>) {
  const admin = await requireAdmin();
  let key = "notice",
    msg = "Saved.";
  try {
    msg = await job(admin);
  } catch (e) {
    key = "error";
    msg = e instanceof Error ? e.message : "The operation could not finish.";
  }
  revalidatePath("/", "layout");
  redirect(url(path, key, msg));
}
function tempPassword() {
  return "KC-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12) + "!";
}
function school(v: string) {
  return v
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
export async function saveAdminEntity(f: FormData) {
  const entity = str(f, "entity"),
    id = str(f, "id"),
    path = "/admin/manage/" + entity;
  await finish(path, async (admin) => {
    if (
      !["teachers", "students", "classes", "lessons", "levels"].includes(entity)
    )
      throw Error("Unknown section.");
    const a = db();
    if (entity === "teachers" || entity === "students") {
      const role = entity === "teachers" ? "teacher" : "student",
        name = str(f, "name"),
        email = str(f, "email").toLowerCase(),
        schoolCode = school(str(f, "school_code")),
        code = str(f, role === "teacher" ? "teacher_id" : "student_id"),
        username =
          role === "student" ? str(f, "username").toLowerCase() || null : null;
      if (!name || !email.includes("@") || !schoolCode || !code)
        throw Error("Complete the required account fields.");
      if (role === "student") {
        await requireSectionMembership();
        const sectionId = num(f, "class_id");
        if (sectionId) {
          const { data: section } = await a
            .from("classes")
            .select("id,teacher_id,status")
            .eq("id", sectionId)
            .maybeSingle();
          const { data: assignedTeacher } = await a
            .from("profiles")
            .select("id")
            .eq(
              "id",
              section?.teacher_id || "00000000-0000-0000-0000-000000000000",
            )
            .eq("role", "teacher")
            .eq("active", true)
            .maybeSingle();
          if (!section || !assignedTeacher)
            throw Error("Choose a section with an active teacher.");
          if (section.status !== "active") {
            const { data: current } = await a
              .from("class_students")
              .select("class_id")
              .eq("student_id", id || "00000000-0000-0000-0000-000000000000")
              .eq("class_id", sectionId)
              .maybeSingle();
            if (!current) throw Error("Choose an active section.");
          }
        }
      }
      let userId = id,
        password: string | null = null;
      if (!userId) {
        password = tempPassword();
        const created = await a.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role: role },
      user_metadata: {
            role,
            name,
            student_id: role === "student" ? code : null,
            teacher_id: role === "teacher" ? code : null,
            username,
          },
        });
        if (created.error || !created.data.user)
          throw Error(
            created.error?.message || "Account could not be created.",
          );
        userId = created.data.user.id;
      } else {
        const old = await a
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .single();
        if (old.data?.email !== email) {
          const changed = await a.auth.admin.updateUserById(userId, {
            email,
            email_confirm: true,
          });
          if (changed.error) throw Error(changed.error.message);
        }
      }
      const patch: any = { name, email, school_code: schoolCode, active: true };
      if (role === "teacher") patch.teacher_id = code;
      else
        Object.assign(patch, {
          student_id: code,
          username,
        });
      const { error } = await a
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .eq("role", role);
      if (error) throw Error(error.message);
      if (role === "student") {
        try {
          await setStudentSection(
            userId,
            num(f, "class_id") || null,
            admin.id,
            true,
          );
        } catch (error) {
          if (!id) await a.auth.admin.deleteUser(userId);
          throw error;
        }
      }
      await audit(admin.id, id ? "update" : "create", entity, userId);
      if (password) {
        let emailSent = false;
        if (role === "student")
          emailSent = await sendStudentPasswordEmail({
            email,
            name,
            studentId: code,
            username,
            temporaryPassword: password,
            schoolLabel: schoolCode,
            reason: "welcome",
          });
        else
          emailSent = await sendTeacherPasswordEmail({
            email,
            name,
            teacherId: code,
            temporaryPassword: password,
            schoolLabel: schoolCode,
          });
        const jar = await cookies();
        jar.set(
          "kc_admin_flash",
          JSON.stringify({
            message: "Account created.",
            password,
            emailSent,
            email,
          }),
          {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 180,
            path,
          },
        );
      }
      return id ? "Changes saved." : "Account created.";
    }
    if (entity === "classes") {
      const row = {
        name: str(f, "name"),
        section: str(f, "name"),
        subject: str(f, "subject") || "Programming",
        school_year: str(f, "school_year") || null,
        description: str(f, "description") || null,
        teacher_id: str(f, "teacher_id"),
      };
      if (!row.name || !row.section || !row.teacher_id)
        throw Error("Section name and teacher are required.");
      const q = id
        ? a.from("classes").update(row).eq("id", Number(id))
        : a.from("classes").insert(row);
      const { data, error } = await q.select("id").single();
      if (error) throw Error(error.message);
      await audit(admin.id, id ? "update" : "create", entity, id || data.id);
      return id ? "Changes saved." : "Section created.";
    }
    if (entity === "lessons") {
      const row = {
        title: str(f, "title"),
        description: str(f, "description"),
        learning_objective: str(f, "learning_objective"),
        content: sanitizeHtml(str(f, "content"), {
          allowedTags: [
            "p",
            "br",
            "strong",
            "b",
            "em",
            "i",
            "u",
            "h2",
            "h3",
            "h4",
            "ul",
            "ol",
            "li",
            "pre",
            "code",
            "blockquote",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "hr",
            "div",
            "span",
          ],
          allowedAttributes: {},
        }),
        order_number: num(f, "order_number"),
        active: true,
      };
      if (!row.title || !row.order_number)
        throw Error("Title and order are required.");
      const q = id
        ? a.from("lessons").update(row).eq("id", Number(id))
        : a.from("lessons").insert(row);
      const { data, error } = await q.select("id").single();
      if (error) throw Error(error.message);
      await audit(admin.id, id ? "update" : "create", entity, id || data.id);
      return id ? "Changes saved." : "Lesson created.";
    }
    const existing = id
        ? (
            await a
              .from("levels")
              .select("level_number")
              .eq("id", Number(id))
              .single()
          ).data
        : null,
      levelNumber = num(f, "level_number");
    if (existing && existing.level_number !== levelNumber)
      throw Error("Unity scene numbers cannot change on an existing level.");
    const template = str(f, "starter_code_template");
    if (template.length > 12000) throw Error("Starter code is too long.");
    const row = {
      lesson_id: num(f, "lesson_id"),
      level_number: levelNumber,
      order_in_lesson: num(f, "order_in_lesson"),
      title: str(f, "title"),
      description: str(f, "description"),
      difficulty: str(f, "difficulty"),
      active: f.get("active") === "1",
      build_available: f.get("build_available") === "1",
      starter_code_enabled: f.get("starter_code_enabled") === "1",
      starter_code_locked: f.get("starter_code_locked") === "1",
      starter_code_template: template,
    };
    if (
      !row.lesson_id ||
      !row.level_number ||
      !row.title ||
      !["Beginner", "Intermediate", "Advanced"].includes(row.difficulty)
    )
      throw Error("Complete the required level fields.");
    const q = id
      ? a.from("levels").update(row).eq("id", Number(id))
      : a.from("levels").insert(row);
    const { data, error } = await q.select("id").single();
    if (error) throw Error(error.message);
    await audit(admin.id, id ? "update" : "create", entity, id || data.id);
    return id ? "Changes saved." : "Level created.";
  });
}
export async function setAdminEntityStatus(f: FormData) {
  const entity = str(f, "entity"),
    id = str(f, "id"),
    restore = str(f, "restore") === "1";
  await finish("/admin/manage/" + entity, async (admin) => {
    const a = db();
    let q;
    if (entity === "classes")
      q = a
        .from("classes")
        .update({ status: restore ? "active" : "archived" })
        .eq("id", Number(id));
    else if (entity === "levels")
      q = a.from("levels").update({ active: restore }).eq("id", Number(id));
    else if (["teachers", "students"].includes(entity))
      q = a
        .from("profiles")
        .update({ active: restore })
        .eq("id", id)
        .eq("role", entity === "teachers" ? "teacher" : "student");
    else throw Error("This record cannot be archived.");
    const { error } = await q;
    if (error) throw Error(error.message);
    await audit(admin.id, restore ? "restore" : "archive", entity, id);
    return restore ? "Record restored." : "Record archived.";
  });
}
export async function resetManagedPassword(f: FormData) {
  const entity = str(f, "entity"),
    id = str(f, "id");
  await finish("/admin/manage/" + entity, async (admin) => {
    if (!["teachers", "students"].includes(entity))
      throw Error("Invalid account type.");
    const a = db(),
      password = tempPassword(),
      { data: p } = await a
        .from("profiles")
        .select("name,email,student_id,teacher_id,username,school_code")
        .eq("id", id)
        .eq("role", entity === "teachers" ? "teacher" : "student")
        .maybeSingle();
    if (!p) throw Error("Account not found.");
    const { error } = await a.auth.admin.updateUserById(id, { password });
    if (error) throw Error(error.message);
    let emailSent = false;
    if (entity === "students")
      emailSent = await sendStudentPasswordEmail({
        email: p.email,
        name: p.name,
        studentId: p.student_id,
        username: p.username,
        temporaryPassword: password,
        schoolLabel: p.school_code,
        reason: "reset",
      });
    if (entity === "teachers") emailSent = await sendTeacherPasswordEmail({ email: p.email, name: p.name, teacherId: p.teacher_id || "", temporaryPassword: password, schoolLabel: p.school_code, reason: "reset" });
    await audit(admin.id, "reset_password", entity, id);
    const jar = await cookies();
    jar.set(
      "kc_admin_flash",
      JSON.stringify({
        message: "New temporary password:",
        password,
        emailSent,
        email: p.email,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 180,
        path: "/admin/manage/" + entity,
      },
    );
    return "Password reset.";
  });
}
export async function deleteAdminEntity(f: FormData) {
  const entity = str(f, "entity"),
    id = str(f, "id");
  await finish("/admin/manage/" + entity, async (admin) => {
    const a = db();
    if (entity === "classes") {
      const { error } = await a.from("classes").delete().eq("id", Number(id));
      if (error) throw Error(error.message);
    } else if (["teachers", "students"].includes(entity)) {
      const { data: p } = await a
        .from("profiles")
        .select("role")
        .eq("id", id)
        .single();
      if (!p || p.role !== (entity === "teachers" ? "teacher" : "student"))
        throw Error("Account not found.");
      const { error } = await a.auth.admin.deleteUser(id);
      if (error) throw Error(error.message);
    } else throw Error("Curriculum is preserved. Hide a level instead.");
    await audit(admin.id, "delete", entity, id);
    return "Record deleted.";
  });
}
export async function saveRoster(f: FormData) {
  const classId = num(f, "class_id"),
    studentId = str(f, "student_id"),
    action = str(f, "roster_action");
  await finish("/admin/classes/" + classId, async (admin) => {
    if (action === "add") {
      await setStudentSection(studentId, classId, admin.id, true);
    } else {
      const { error } = await db()
        .from("class_students")
        .delete()
        .eq("class_id", classId)
        .eq("student_id", studentId);
      if (error) throw Error(error.message);
    }
    await audit(
      admin.id,
      action === "add" ? "enrol" : "remove_from_class",
      "class_students",
      studentId,
      { class_id: classId },
    );
    return action === "add" ? "Student added." : "Student removed.";
  });
}
export async function saveAdminSettings(f: FormData) {
  const action = str(f, "settings_action");
  await finish("/admin/settings", async (admin) => {
    const a = db();
    if (action === "profile") {
      const name = str(f, "name"),
        email = str(f, "email").toLowerCase();
      if (!name || !email.includes("@"))
        throw Error("Enter a valid name and email.");
      const auth = await a.auth.admin.updateUserById(admin.id, {
        email,
        email_confirm: true,
      });
      if (auth.error) throw Error(auth.error.message);
      const { error } = await a
        .from("profiles")
        .update({ name, email })
        .eq("id", admin.id);
      if (error) throw Error(error.message);
    } else if (action === "school") {
      for (const [key, value] of [
        ["school_name", str(f, "school_name")],
        ["school_code", school(str(f, "school_code"))],
      ]) {
        if (!value) throw Error("Complete the school details.");
        await a
          .from("admin_settings")
          .upsert({ setting_key: key, setting_value: value });
      }
    } else if (action === "support") {
      const email = str(f,"support_email");
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Error("Enter a valid support email.");
      const keys = ["support_contact","support_email","support_phone","support_hours","support_instructions"];
      const rows = keys.map(key => ({ setting_key: key, setting_value: str(f,key) }));
      if (rows.some(r => r.setting_value.length > (r.setting_key === "support_instructions" ? 2000 : 200))) throw Error("Support details are too long.");
      const { error } = await a.from("admin_settings").upsert(rows);
      if (error) throw Error(error.message);
      revalidatePath("/support");
    } else if (action === "theme") {
      const theme = str(f, "theme") === "light" ? "light" : "dark";
      await a
        .from("profiles")
        .update({ theme_preference: theme })
        .eq("id", admin.id);
    } else if (action === "access") {
      const s = await createClient(),
        check = await s.auth.signInWithPassword({
          email: admin.email,
          password: str(f, "admin_password"),
        });
      if (check.error) throw Error("Administrator password is incorrect.");
      await a.from("admin_settings").upsert({
        setting_key: "teacher_registration",
        setting_value: f.get("teacher_registration") === "1" ? "1" : "0",
      });
    } else if (action === "password") {
      const current = str(f, "current_password"),
        next = str(f, "new_password"),
        confirm = str(f, "confirm_password");
      if (next.length < 12 || next !== confirm)
        throw Error("Use a matching password of at least 12 characters.");
      const s = await createClient(),
        check = await s.auth.signInWithPassword({
          email: admin.email,
          password: current,
        });
      if (check.error) throw Error("Current password is incorrect.");
      const changed = await s.auth.updateUser({ password: next });
      if (changed.error) throw Error(changed.error.message);
      await a
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", admin.id);
    } else throw Error("Unknown settings action.");
    await audit(admin.id, "update_" + action, "admin", admin.id);
    return action === "password"
      ? "Password changed successfully."
      : "Settings saved.";
  });
}

"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";

export type ProfileState = { error?: string; success?: string };
const allowedAvatars = new Set([
  "knight",
  "blue",
  "mage",
  "fox",
  "dragon",
  "robot",
]);

export async function updateProfile(
  _: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const student = await requireStudent();
  const supabase = await createClient();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const avatar = String(form.get("avatar_key") ?? "knight");
  const theme = String(form.get("theme_preference") ?? "dark");
  if (!name || name.length > 150)
    return { error: "Please enter a valid full name." };
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { error: "Please enter a valid email address." };
  if (!allowedAvatars.has(avatar) || !["light", "dark"].includes(theme))
    return { error: "Please choose valid profile settings." };
  let profileImage = student.profile_image;
  let uploadedImage: string | null = null;
  const fail = async (message: string) => {
    if (uploadedImage) await supabase.storage.from("profile-images").remove([uploadedImage]);
    return { error: message };
  };
  const currentPassword = String(form.get("current_password") ?? "");
  const newPassword = String(form.get("new_password") ?? "");
  if (newPassword && newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  const picture = form.get("profile_image");
  if (picture instanceof File && picture.size) {
    if (picture.size > 5 * 1024 * 1024)
      return { error: "Profile pictures must be 5 MB or smaller." };
    if (!["image/jpeg", "image/png", "image/webp"].includes(picture.type))
      return { error: "Please upload a valid JPG, PNG, or WebP image." };
    const extension =
      picture.type === "image/jpeg" ? "jpg" : picture.type.split("/")[1];
    const path = `${student.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("profile-images")
      .upload(path, picture, { contentType: picture.type, upsert: false });
    if (error)
      return {
        error: "The profile picture could not be uploaded. Please try again.",
      };

    profileImage = path;
    uploadedImage = path;
  } else if (form.get("use_custom_picture") === "0") {

    profileImage = null;
  }
  if (newPassword) {
    if (newPassword.length < 8)
      return fail("New password must be at least 8 characters.");
    const check = await supabase.auth.signInWithPassword({
      email: student.email,
      password: currentPassword,
    });
    if (check.error) return fail("Current password is incorrect.");
    const changed = await supabase.auth.updateUser({ password: newPassword });
    if (changed.error) return fail(changed.error.message);
  }
  if (email !== student.email) {
    const updated = await supabase.auth.updateUser({ email });
    if (updated.error) return fail(updated.error.message);
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      avatar_key: avatar,
      profile_image: profileImage,
      theme_preference: theme,
    })
    .eq("id", student.id);
  if (error) return fail(error.message);
  if (student.profile_image && student.profile_image !== profileImage) {
    await supabase.storage.from("profile-images").remove([student.profile_image]);
  }
  revalidatePath("/", "layout");
  return {
    success:
      email !== student.email
        ? "Profile saved. Check your new email address to confirm the change."
        : "Profile updated successfully.",
  };
}

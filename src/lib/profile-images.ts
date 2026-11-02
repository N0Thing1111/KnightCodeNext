import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Only remove this account's uploads after its profile was successfully changed.
// Keep any image that is still referenced by a profile.
export async function removeUnusedProfileImage(ownerId: string, image: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const prefix = base + "/storage/v1/object/public/profile-images/";
  const key = image.startsWith(prefix) ? image.slice(prefix.length) : image;
  if (
    !key.startsWith(ownerId + "/") ||
    !/^[\w-]+\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(key)
  )
    return false;
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("profiles")
      .select("id")
      .in("profile_image", [key, prefix + key])
      .limit(1);
    if (error) return false;
    if (data?.length) return true;
    const removed = await db.storage.from("profile-images").remove([key]);
    return !removed.error;
  } catch {
    return false;
  }
}

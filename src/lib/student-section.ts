import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
export const getStudentSection = cache(async () => {
 const db = await createClient();
 // Student RLS exposes only their enrolled section, including an archived one.
 const { data, error } = await db.from("classes").select("id,name,status").maybeSingle();
 if (error) throw Error("Unable to check your section. Please try again.");
 return { id: data?.id ?? null, name: data?.name ?? "", archived: data?.status === "archived" };
});

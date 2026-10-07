import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireSectionMembership() {
  const { data, error } = await createAdminClient().rpc(
    "section_membership_version",
  );
  if (error || data !== 1)
    throw Error(
      "Apply the single-section membership database migration before changing student enrollment.",
    );
}

export async function setStudentSection(
  studentId: string,
  sectionId: number | null,
  actorId: string,
  allowMove = false,
) {
  const { error } = await createAdminClient().rpc("set_student_section", {
    p_student: studentId,
    p_section: sectionId,
    p_actor: actorId,
    p_allow_move: allowMove,
  });
  if (error) throw Error(error.message);
}

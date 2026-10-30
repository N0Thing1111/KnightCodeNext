// Display helpers only. Stored audit events are never modified here.
export type AuditEvent = { action: string; entity: string; record_id?: string | number | null; admin_id?: string | null; details: unknown };
export type AuditNames = { profiles: Map<string, { name: string; role: string }>; sections: Map<string, string>; lessons: Map<string, string>; levels: Map<string, string> };
export const auditObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const auditText = (value: unknown) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 120) : "";
export const auditId = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";
const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const outcome = (value: unknown) => value === "passed" ? "Passed" : value === "needs_revision" ? "Needs revision" : value === "reviewed" ? "No outcome recorded" : "";
const labels: Record<string, string> = {
  approve_teacher: "Teacher approved", reject_teacher: "Teacher registration rejected",
  sign_in: "Signed in", create: "Created", update: "Updated", archive: "Archived", restore: "Restored", delete: "Deleted",
  enrol: "Student assigned", enroll: "Student assigned", enol: "Student assigned", remove_from_class: "Student removed",
  import: "Accounts imported", reset_password: "Password reset", update_password: "Password changed", update_profile: "Profile updated",
  update_school: "Platform details updated", update_support: "Support details updated", update_theme: "Appearance changed",
  create_stored_backup: "Backup saved", download_stored_backup: "Saved backup downloaded",
  download_backup: "Backup downloaded", restore_backup: "Backup restored", reset_learning: "Learning records reset", reset_school: "Platform data reset",
  clear_run_history: "Run history cleared", edit_python_feedback: "Feedback edited", correct_python_review: "Feedback corrected",
  consolidate_python_feedback: "Feedback consolidated", restore_legacy_python_feedback: "Older feedback preserved",
};
const entities: Record<string, string> = { students: "Student account", teachers: "Teacher account", classes: "Section", lessons: "Lesson", levels: "Game level", class_students: "Section membership", admin: "Administrator account", system: "School data", run_history: "Run history", python_reviews: "Python feedback" };
export function presentAudit(event: AuditEvent, names: AuditNames) {
  const d = auditObject(event.details), before = auditObject(d.before), after = auditObject(d.after);
  const actorId = auditId(d.actor_id) || event.admin_id || "", actor = names.profiles.get(actorId);
  const actorName = auditText(d.actor_name) || actor?.name || (actorId ? "Former or unavailable account" : "System");
  const role = auditText(d.actor_role) || actor?.role || (event.admin_id ? "admin" : "");
  const actorRole = role === "teacher" ? "Teacher" : role === "admin" ? "Administrator" : "";
  const id = auditId(event.record_id), entity = entities[event.entity] || "School record";
  const studentId = auditId(after.student_id) || auditId(before.student_id) || auditId(d.student_id);
  let record = entity;
  if (["students", "teachers", "class_students"].includes(event.entity)) record = names.profiles.get(id)?.name || entity;
  if (event.entity === "classes") record = names.sections.get(id) || (id ? "Section #" + id : entity);
  if (event.entity === "lessons") record = auditText(d.title) || names.lessons.get(id) || (id ? "Lesson #" + id : entity);
  if (event.entity === "levels") record = auditText(d.title) || names.levels.get(id) || (id ? "Game level #" + id : entity);
  if (event.entity === "python_reviews") record = names.profiles.get(studentId)?.name || entity;
  const sectionId = auditId(d.class_id) || auditId(d.section_id);
  const section = names.sections.get(sectionId) || (sectionId ? "section #" + sectionId : "the section");
  let summary = "Recorded a change to this " + entity.toLowerCase() + ".";
  switch (event.action) {
    case "sign_in": summary = "Signed in to the administrator portal."; break;
    case "create": summary = "Created this " + entity.toLowerCase() + "."; break;
    case "update": summary = "Updated this " + entity.toLowerCase() + "."; break;
    case "archive": summary = "Archived this " + entity.toLowerCase() + "."; break;
    case "restore": summary = "Restored this " + entity.toLowerCase() + " from the archive."; break;
    case "delete": summary = "Permanently deleted this " + entity.toLowerCase() + "."; break;
    case "enrol": case "enroll": case "enol": summary = "Assigned the student to " + section + "."; break;
    case "remove_from_class": summary = "Removed the student from " + section + "."; break;
    case "reset_password": summary = "Reset the password for this " + entity.toLowerCase() + "."; break;
    case "update_password": summary = "Changed their administrator password."; break;
    case "update_profile": summary = "Updated their administrator profile."; break;
    case "update_school": summary = "Updated the school's details."; break;
    case "update_support": summary = "Updated school contact and support details."; break;
    case "update_theme": summary = "Changed their appearance preference."; break;
    case "import": {
      const created = count(d.created) ?? count(d.count), existing = count(d.existing), errors = count(d.errors);
      summary = created === null ? "Imported " + (event.entity === "teachers" ? "teacher" : "student") + " accounts." : "Imported " + created + " " + (event.entity === "teachers" ? "teacher" : "student") + " account" + (created === 1 ? "" : "s") + ".";
      if (existing) summary += " " + existing + " existing accounts matched.";
      if (errors) summary += " " + errors + " rows could not be imported.";
      break;
    }
    case "approve_teacher": summary = "Approved a verified teacher registration and enabled teacher access."; break;
    case "reject_teacher": summary = "Rejected a teacher registration; teacher access remains disabled."; break;
    case "create_stored_backup": summary = d.source === "weekly" ? "Saved a scheduled weekly platform backup." : "Created a platform backup in the private archive."; break;
    case "download_stored_backup": summary = "Downloaded a saved backup encrypted with a password chosen for that file."; break;
    case "download_backup": summary = "Downloaded a platform backup file."; break;
    case "restore_backup": summary = "Restored platform records from a backup file."; break;
    case "reset_learning": summary = "Cleared learning records and reset progress; accounts and curriculum were kept."; break;
    case "reset_school": summary = "Reset the platform's operational data."; break;
    case "clear_run_history": {
      const kinds: Record<string, string> = { python_practice: "unsuccessful Python practice runs", python_finished: "finished, unsubmitted Python runs", python_submitted: "submitted Python runs", game_unfinished: "unfinished game sessions", game_completed: "completed game sessions", game_all: "game sessions" };
      const kind = auditText(d.category), affected = count(d.affected);
      summary = (kind === "python_submitted" ? "Cleared code and output from " : "Deleted ") + (affected === null ? "" : affected + " ") + (kinds[kind] || "selected run history records") + ". Learning progress and feedback were kept.";
      break;
    }
    case "edit_python_feedback": {
      const oldOutcome = outcome(before.status), newOutcome = outcome(after.status), changes: string[] = [];
      if (oldOutcome && newOutcome && oldOutcome !== newOutcome) changes.push("Outcome: " + oldOutcome + " to " + newOutcome + ".");
      if (typeof before.feedback === "string" && typeof after.feedback === "string" && before.feedback !== after.feedback) changes.push("Updated comments.");
      if (["logic", "application", "correctness"].some(k => typeof before[k] === "number" && typeof after[k] === "number" && before[k] !== after[k])) changes.push("Updated rubric ratings.");
      summary = changes.length ? changes.join(" ") : "Updated the existing Python feedback.";
      break;
    }
    case "correct_python_review": {
      const from = outcome(d.previous_status), to = outcome(d.status);
      summary = from && to && from !== to ? "Changed the assessment from " + from + " to " + to + "." : "Corrected the Python assessment.";
      break;
    }
    case "consolidate_python_feedback": summary = "Kept one current feedback per submission; moved older feedback into the audit log."; break;
    case "restore_legacy_python_feedback": summary = "Restored the latest feedback per submission and preserved older feedback in the audit log."; break;
  }
  return { actorName, actorRole, action: labels[event.action] || "Record changed", record, summary };
}

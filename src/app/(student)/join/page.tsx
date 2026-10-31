import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { allRows, rowsForIds } from "@/lib/query-pages";
import { sectionLabel } from "@/lib/section-label";
import { cancelEnrollment, requestEnrollment } from "@/app/actions/enrollment";
import styles from "./class.module.css";

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const student = await requireStudent();
  const q = await searchParams;
  const db = createAdminClient();
  // Class scope comes only from the signed-in student's membership, never a URL parameter.
  const membership = await db.from("class_students").select("class_id").eq("student_id", student.id).maybeSingle();
  const pending = await db.from("enrollment_requests").select("id,class_id").eq("student_id", student.id).eq("status", "pending").maybeSingle();
  const classId = membership.data?.class_id || pending.data?.class_id;
  const section = classId ? await db.from("classes").select("id,name,section,subject,school_year,status,teacher_id").eq("id", classId).maybeSingle() : null;
  const teacher = section?.data ? await db.from("profiles").select("name").eq("id", section.data.teacher_id).eq("role", "teacher").maybeSingle() : null;
  let classmates: { id: string; name: string }[] = [];
  let rosterError = false;
  if (membership.data && section?.data) {
    const enrolledClassId = membership.data.class_id;
    try {
      const members = await allRows(() => db.from("class_students").select("student_id").eq("class_id", enrolledClassId).order("student_id"));
      classmates = await rowsForIds(members.map(m => m.student_id), ids => db.from("profiles").select("id,name").in("id", ids).eq("role", "student").eq("active", true).order("id"));
      classmates.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    } catch { rosterError = true; }
  }
  const unavailable = membership.error || pending.error || section?.error || (classId && !section?.data);
  return <main className={`page-container ${styles.page}`}>
    <header className={styles.heading}><h1>Your class</h1><p>Your section, teacher, and the people learning alongside you.</p></header>
    {q.error && <p className="alert alert-error" role="alert">{q.error}</p>}
    {!membership.data && !membership.error && <section className={`panel ${styles.panel}`}><h2>Learn independently</h2><p>You can start with Lesson 1 without joining a class. Complete the available games in each lesson and Python practice to unlock the next. Joining a class switches your available work to assignments from your teacher; saved progress is kept.</p><Link className="btn btn-primary" href="/lessons">Continue learning</Link></section>}
    {q.notice && <p className="alert alert-success" role="status">{q.notice}</p>}
    {unavailable ? <section className={`panel ${styles.panel}`}><h2>Class details unavailable</h2><p>We couldn&apos;t load your enrollment. Refresh the page to try again.</p></section> : membership.data && section?.data ? <>
      <section className={`panel ${styles.panel}`}>
        <div className={styles.titleRow}><h2>{sectionLabel(section.data)}</h2><span className={styles.status}>{section.data.status === "archived" ? "Archived class" : "Enrolled"}</span></div>
        <dl className={styles.details}><div><dt>Teacher</dt><dd>{teacher?.data?.name || "Teacher details unavailable"}</dd></div><div><dt>Subject</dt><dd>{section.data.subject || "Not specified"}</dd></div><div><dt>School year</dt><dd>{section.data.school_year || "Not specified"}</dd></div></dl>
        <div className={styles.links}><Link className="btn btn-primary" href="/assignments">View assignments</Link></div>
      </section>
      <section className={`panel ${styles.panel}`} aria-labelledby="class-roster">
        <div className={styles.titleRow}><h2 id="class-roster">Class members</h2>{!rosterError && <span>{classmates.length} student{classmates.length === 1 ? "" : "s"}</span>}</div>
        <p className={styles.note}>Only names are shared here. Grades, email addresses, and learning activity stay private.</p>
        {rosterError ? <p role="status">The class list couldn&apos;t be loaded. Please refresh to try again.</p> : !classmates.length ? <p>No active students to display.</p> : <ul className={styles.roster}>{classmates.map(person => <li key={person.id}><span>{person.name}</span>{person.id === student.id && <span className={styles.you}>You</span>}</li>)}</ul>}
      </section>
    </> : pending.data ? <section className={`panel ${styles.panel}`}><span className={styles.status}>Awaiting approval</span><h2>{section?.data ? sectionLabel(section.data) : "Class request sent"}</h2><p>{teacher?.data?.name || "Your teacher"} will review your request. Your class list will appear here once you are accepted.</p><form action={cancelEnrollment}><input type="hidden" name="request_id" value={pending.data.id}/><button className="btn btn-secondary">Cancel request</button></form></section> : <section className={`panel ${styles.panel} ${styles.join}`}><h2>Join your teacher&apos;s class</h2><p>Ask your teacher for an invitation code. Enter it below to request a place in their section.</p><form action={requestEnrollment} className="auth-form"><label htmlFor="class-code">Invitation code<input id="class-code" name="code" required minLength={16} maxLength={16} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Enter the 16-character code" aria-describedby="class-code-help"/></label><p id="class-code-help" className={styles.note}>Your teacher approves the request before you join. You can belong to one class at a time.</p><button className="btn btn-primary">Request to join</button></form></section>}
  </main>;
}

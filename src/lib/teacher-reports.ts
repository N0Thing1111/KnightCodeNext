import { PLATFORM_NAME } from "@/lib/platform-identity";
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { allRows, rowsForIds } from "@/lib/query-pages";
import { sectionLabel } from "@/lib/section-label";
import {
  buildTeacherReport,
  type ReportFilters,
  type ReportSection,
  type ReportLesson,
  type ReportActivity,
  type ReportStudent,
  type ReportSubmission,
  type ReportReview,
} from "@/lib/report-model";

type Assignment = {
  lesson_id: number | null;
  level_id: number | null;
  class_id: number | null;
  student_id: string | null;
};
type Membership = { class_id: number; student_id: string };

export async function getTeacherReport(
  teacher: { id: string; name: string },
  filters: ReportFilters,
) {
  const db = createAdminClient();
  // Scope every privileged query to this teacher's sections and assignments first.
  const [sections, assignments] = (await Promise.all([
    allRows(() =>
      db
        .from("classes")
        .select("id,name,section")
        .eq("teacher_id", teacher.id)
        .order("id"),
    ),
    allRows(() =>
      db
        .from("assignments")
        .select("id,lesson_id,level_id,class_id,student_id")
        .eq("teacher_id", teacher.id)
        .order("id"),
    ),
  ])) as [ReportSection[], Assignment[]];
  if (
    filters.section !== null &&
    !sections.some((c) => c.id === filters.section)
  )
    throw Error("This section is not assigned to your teacher account.");
  const memberships: Membership[] = await rowsForIds(
    sections.map((c) => c.id),
    (ids) =>
      db
        .from("class_students")
        .select("class_id,student_id")
        .in("class_id", ids)
        .order("class_id")
        .order("student_id"),
  );
  const wholeLessons = assignments.filter((a) => a.lesson_id && !a.level_id);
  const lessonIds = [...new Set(wholeLessons.map((a) => a.lesson_id!))];
  const [lessonRows, activityRows] = await Promise.all([
    rowsForIds(lessonIds, (ids) =>
      db
        .from("lessons")
        .select("id,title,order_number")
        .in("id", ids)
        .order("order_number")
        .order("id"),
    ),
    rowsForIds(lessonIds, (ids) =>
      db
        .from("python_activities")
        .select("id,lesson_id,content,published")
        .in("lesson_id", ids)
        .order("id"),
    ),
  ]);
  const lessons: ReportLesson[] = lessonRows
    .sort((a, b) => a.order_number - b.order_number || a.id - b.id)
    .map((l) => ({
      id: l.id,
      title: l.title,
      sections: [
        ...new Set(
          wholeLessons
            .filter((a) => a.lesson_id === l.id)
            .flatMap((a) =>
              a.student_id
                ? memberships
                    .filter((m) => m.student_id === a.student_id)
                    .map((m) => m.class_id)
                : sections.some((c) => c.id === a.class_id)
                  ? [a.class_id!]
                  : [],
            ),
        ),
      ],
    }));
  const activities: ReportActivity[] = activityRows.map((a) => ({
    id: a.id,
    lesson_id: a.lesson_id,
    title: a.content?.title || "Python activity",
    published: a.published,
  }));
  const options = { sections, lessons, activities };
  if (
    filters.lesson !== null &&
    !lessons.some(
      (l) =>
        l.id === filters.lesson &&
        (filters.section === null || l.sections.includes(filters.section)),
    )
  )
    throw Error("Choose a lesson assigned in the selected section.");
  if (!filters.activity) return { ...options, report: null, filters };
  const activity = activities.find((a) => a.id === filters.activity);
  const lesson = lessons.find((l) => l.id === activity?.lesson_id);
  if (
    !activity ||
    !lesson ||
    (filters.lesson !== null && lesson.id !== filters.lesson) ||
    (filters.section !== null && !lesson.sections.includes(filters.section))
  )
    throw Error(
      "Choose a Python activity from the selected lesson and section.",
    );
  const scoped = memberships.filter(
    (m) => filters.section === null || m.class_id === filters.section,
  );
  const matchingAssignments = wholeLessons.filter(
    (a) => a.lesson_id === lesson.id,
  );
  const studentIds = [
    ...new Set(
      scoped
        .filter((m) =>
          matchingAssignments.some((a) =>
            a.student_id
              ? a.student_id === m.student_id
              : a.class_id === m.class_id,
          ),
        )
        .map((m) => m.student_id),
    ),
  ];
  const [profiles, submissions] = await Promise.all([
    rowsForIds(studentIds, (ids) =>
      db
        .from("profiles")
        .select("id,name,username")
        .eq("role", "student")
        .in("id", ids)
        .order("id"),
    ),
    rowsForIds(studentIds, (ids) =>
      db
        .from("python_submissions")
        .select("id,student_id,activity_id,submitted_at")
        .eq("activity_id", activity.id)
        .in("student_id", ids)
        .order("submitted_at")
        .order("id"),
    ),
  ]);
  const reviews: ReportReview[] = await rowsForIds(
    submissions.map((s) => s.id),
    (ids) =>
      db
        .from("python_reviews")
        .select(
          "id,submission_id,status,created_at,updated_at,logic,application,correctness,feedback",
        )
        .in("submission_id", ids)
        .order("id"),
  );
  const students: ReportStudent[] = profiles.map((p) => ({
    ...p,
    section: sections
      .filter((c) =>
        scoped.some((m) => m.student_id === p.id && m.class_id === c.id),
      )
      .map(sectionLabel)
      .join(", "),
  }));
  return {
    ...options,
    filters: { ...filters, lesson: lesson.id },
    report: buildTeacherReport(
      students,
      submissions as ReportSubmission[],
      reviews,
      {
        teacher: teacher.name,
        platform: PLATFORM_NAME,
        section: filters.section
          ? sectionLabel(sections.find((c) => c.id === filters.section)!)
          : "All your sections",
        lesson: lesson.title,
        activity: activity.title,
        activityId: activity.id,
        generatedAt: new Date().toISOString(),
      },
    ),
  };
}

"use client";

import { sectionLabel } from "@/lib/section-label";
import { useMemo, useState } from "react";
import { createAssignment } from "@/app/actions/teacher";

type ClassOption = { id: number; name: string; section: string };
type StudentOption = {
  id: string;
  name: string;
  studentId: string;
  classIds: number[];
};
type LessonOption = { id: number; title: string; pythonTitle?: string };
type LevelOption = { id: number; lessonId: number; levelNumber: number; title: string; available: boolean };

export function AssignmentForm({
  classes,
  students,
  lessons,
  levels,
  defaultClassId,
  defaultLessonId,
}: {
  classes: ClassOption[];
  students: StudentOption[];
  lessons: LessonOption[];
  levels: LevelOption[];
  defaultClassId: string;
  defaultLessonId: string;
}) {
  const [classId, setClassId] = useState(defaultClassId);
  const [studentId, setStudentId] = useState("");
  const [lessonId, setLessonId] = useState(defaultLessonId);
  const [levelId, setLevelId] = useState("0");
  const chosenLesson = lessons.find(l => l.id === Number(lessonId));
  const visibleStudents = useMemo(() => {
    const selectedClass = Number(classId);
    return selectedClass
      ? students.filter((student) => student.classIds.includes(selectedClass))
      : students;
  }, [classId, students]);

  function changeClass(value: string) {
    setClassId(value);
    const selectedClass = Number(value);
    if (
      studentId &&
      selectedClass &&
      !students
        .find((student) => student.id === studentId)
        ?.classIds.includes(selectedClass)
    )
      setStudentId("");
  }

  return (
    <form action={createAssignment} className="teacher-form">
      <div className="teacher-form-grid">
        <label>
          Title
          <input
            name="title"
            required
            maxLength={180}
            placeholder="Complete Variables lesson"
          />
        </label>
        <label>
          Due date
          <input type="datetime-local" name="due_date" />
          <small>Philippine time (UTC+8)</small>
        </label>
        <label>
          Section
          <select
            name="class_id"
            value={classId}
            onChange={(event) => changeClass(event.target.value)}
          >
            <option value="0">No section selected — show all students</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {sectionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Individual student (optional)
          <select
            name="student_id"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            <option value="">
              {classId !== "0"
                ? "Assign the whole selected section"
                : "No individual student"}
            </option>
            {visibleStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} · {student.studentId}
              </option>
            ))}
          </select>
          <small className="assignment-filter-note">
            {classId !== "0"
              ? visibleStudents.length +
                " student" +
                (visibleStudents.length === 1 ? "" : "s") +
                " in this section"
              : "Select a section to filter this list"}
          </small>
        </label>
        <label>
          Lesson
          <select name="lesson_id" value={lessonId} onChange={e => { setLessonId(e.target.value); setLevelId("0"); }}>
            <option value="0">Choose lesson</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Specific challenge (optional)
          <select name="level_id" value={levelId} onChange={e => setLevelId(e.target.value)}>
            <option value="0">No specific challenge</option>
            {levels.filter(level => !Number(lessonId) || level.lessonId === Number(lessonId)).map((level) => (
              <option key={level.id} value={level.id} disabled={!level.available}>
                #{level.levelNumber} · {level.title}{!level.available ? " (Coming Soon)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          Instructions
          <textarea
            name="instructions"
            rows={3}
            placeholder="What should students focus on?"
          />
        </label>
      </div>
      <p className="teacher-note" role="status">
        {levelId !== "0" ? "This assigns one game challenge only. Python is included with whole-lesson assignments."
          : chosenLesson?.pythonTitle ? "Includes Python: " + chosenLesson.pythonTitle + ". Complete the playable game levels and submit a Python Run to finish this assignment. Coming Soon levels do not block completion. Teacher review is separate."
          : "Choose a whole lesson to include its published Python activity automatically."}
      </p>
      <p className="teacher-note">
        Select a section to assign everyone in it. To assign only one learner,
        choose that learner from the filtered student list. A lesson or specific
        challenge is required.
      </p>
      <button className="teacher-btn primary">Create Assignment →</button>
    </form>
  );
}

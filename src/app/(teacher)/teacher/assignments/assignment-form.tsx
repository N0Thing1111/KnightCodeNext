"use client";

import { useMemo, useState } from "react";
import { createAssignment } from "@/app/actions/teacher";

type ClassOption = { id: number; name: string; section: string };
type StudentOption = {
  id: string;
  name: string;
  studentId: string;
  classIds: number[];
};
type LessonOption = { id: number; title: string };
type LevelOption = { id: number; levelNumber: number; title: string };

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
        </label>
        <label>
          Class / section
          <select
            name="class_id"
            value={classId}
            onChange={(event) => changeClass(event.target.value)}
          >
            <option value="0">No class selected — show all students</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.section}
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
                ? "Assign the whole selected class"
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
                " in this class"
              : "Select a class to filter this list"}
          </small>
        </label>
        <label>
          Lesson
          <select name="lesson_id" defaultValue={defaultLessonId}>
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
          <select name="level_id" defaultValue="0">
            <option value="0">No specific challenge</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                #{level.levelNumber} · {level.title}
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
      <p className="teacher-note">
        Select a class to assign everyone in it. To assign only one learner,
        choose that learner from the filtered student list. A lesson or specific
        challenge is required.
      </p>
      <button className="teacher-btn primary">Create Assignment →</button>
    </form>
  );
}

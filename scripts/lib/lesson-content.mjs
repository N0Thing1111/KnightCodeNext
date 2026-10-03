import fs from "node:fs";

const contentRoot = new URL("../../supabase/lesson-content/", import.meta.url);

// The reference is the original import. Editable lesson text lives separately.
export function readLessonContent() {
  const lessons = JSON.parse(
    fs.readFileSync(new URL("lessons.json", contentRoot), "utf8"),
  );
  const ids = new Set();
  return lessons.map(({ file, ...lesson }) => {
    if (!Number.isSafeInteger(lesson.id) || ids.has(lesson.id)) {
      throw new Error("Lesson IDs must be unique integers.");
    }
    ids.add(lesson.id);
    if (!/^[a-z0-9-]+\.html$/.test(file)) {
      throw new Error("Lesson content must be a local HTML filename.");
    }
    for (const field of ["title", "description", "learning_objective"]) {
      if (typeof lesson[field] !== "string" || !lesson[field].trim()) {
        throw new Error(`Missing ${field} for lesson ${lesson.id}.`);
      }
    }
    const content = fs.readFileSync(new URL(file, contentRoot), "utf8");
    if (!content.trim()) throw new Error(`Empty lesson ${lesson.id}.`);
    return { ...lesson, content };
  });
}

export function applyLessonContent(curriculum) {
  for (const lesson of readLessonContent()) {
    const original = curriculum.lessons.find((row) => row.id === lesson.id);
    if (!original || original.title !== lesson.title) {
      throw new Error(`Unexpected reference identity for lesson ${lesson.id}.`);
    }
    // Preserve IDs, titles, order, availability, levels and achievements.
    original.description = lesson.description;
    original.learning_objective = lesson.learning_objective;
    original.content = lesson.content;
  }
}

"use client";
import { useState } from "react";
import type {
  ReportFilters,
  ReportSection,
  ReportLesson,
  ReportActivity,
} from "@/lib/report-model";
import { sectionLabel } from "@/lib/section-label";
import styles from "./reports.module.css";

export function ReportFiltersForm({
  filters,
  sections,
  lessons,
  activities,
}: {
  filters: ReportFilters;
  sections: ReportSection[];
  lessons: ReportLesson[];
  activities: ReportActivity[];
}) {
  const [section, setSection] = useState(String(filters.section || ""));
  const [lesson, setLesson] = useState(String(filters.lesson || ""));
  const availableLessons = lessons.filter(
    (l) =>
      (!section || l.sections.includes(Number(section))) &&
      activities.some((a) => a.lesson_id === l.id),
  );
  const activity =
    activities.find((a) => a.lesson_id === Number(lesson))?.id || "";
  return (
    <form className={styles.filters} method="get" action="/teacher/reports">
      <label>
        Section
        <select
          name="section"
          value={section}
          onChange={(e) => {
            setSection(e.target.value);
            setLesson("");
          }}
        >
          <option value="">All your sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {sectionLabel(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Lesson
        <select
          name="lesson"
          value={lesson}
          disabled={!availableLessons.length}
          onChange={(e) => {
            setLesson(e.target.value);
          }}
        >
          <option value="">
            {availableLessons.length ? "Choose lesson" : "No assigned lessons"}
          </option>
          {availableLessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name="activity" value={activity} />
      <button
        className="teacher-btn primary"
        type="submit"
        disabled={!activity}
      >
        View report
      </button>
    </form>
  );
}

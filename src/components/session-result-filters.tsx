"use client";
import { sectionLabel } from "@/lib/section-label";
import Link from "next/link";
import { useState } from "react";
import {
  sectionStudents,
  type SessionFilters,
  type SessionCatalog,
} from "@/lib/session-result-filters";
export function SessionResultFilters({
  catalog,
  filters,
  base,
}: {
  catalog: Omit<SessionCatalog, "assignments">;
  filters: SessionFilters;
  base: string;
}) {
  const [section, setSection] = useState(filters.class_id);
  const [student, setStudent] = useState(filters.student);
  const options = sectionStudents(catalog, section);
  return (
    <form
      action={base}
      method="get"
      className="teacher-filterbar session-result-filters"
    >
      <label className="session-search">
        Search students
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Student name, ID, or email"
        />
      </label>
      <label>
        Section
        <select
          name="class_id"
          value={section}
          onChange={(e) => {
            const next = e.target.value;
            setSection(next);
            if (!sectionStudents(catalog, next).some((s) => s.id === student))
              setStudent("");
          }}
        >
          <option value="">All sections</option>
          {catalog.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {sectionLabel(c)}
              {c.status !== "active" ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Student
        <select
          name="student"
          value={student}
          onChange={(e) => setStudent(e.target.value)}
        >
          <option value="">All students in section</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.student_id ? ` · ${s.student_id}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Level
        <select name="level" defaultValue={filters.level}>
          <option value="">All levels</option>
          {catalog.levels.map((l) => (
            <option key={l.id} value={l.id}>
              #{l.level_number} · {l.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select name="status" defaultValue={filters.status}>
          <option value="">Any status</option>
          <option value="completed">Completed</option>
          <option value="started">Unfinished</option>
        </select>
      </label>
      <label>
        Session ID
        <input
          type="number"
          name="session"
          min="1"
          step="1"
          defaultValue={filters.session}
          placeholder="Any session"
        />
      </label>
      <div className="session-filter-actions">
        <button type="submit" className="teacher-btn primary">
          Search / Filter
        </button>
        <Link className="teacher-btn" href={base}>
          Clear
        </Link>
      </div>
    </form>
  );
}

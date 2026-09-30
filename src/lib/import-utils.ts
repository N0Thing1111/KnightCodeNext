export type ImportRow = {
  student_id: string;
  name: string;
  email: string;
  username: string;
  section: string;
};
export function normalizeRow(raw: Record<string, unknown>): ImportRow {
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [
      k
        .toLowerCase()
        .trim()
        .replaceAll(/[^a-z0-9]+/g, "_"),
      String(v ?? "").trim(),
    ]),
  );
  const first = normalized.first_name || normalized.firstname || "",
    last = normalized.last_name || normalized.lastname || "";
  return {
    student_id:
      normalized.student_id || normalized.studentid || normalized.id || "",
    name: normalized.name || [first, last].filter(Boolean).join(" "),
    email: (normalized.email || "").toLowerCase(),
    username: (normalized.username || "").toLowerCase(),
    section: normalized.section || normalized.class_section || "",
  };
}
export function issues(row: ImportRow, seen: Set<string>) {
  const out: string[] = [];
  if (!row.student_id || !row.name || !row.email)
    out.push("Missing required field");
  if (row.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email))
    out.push("Invalid email");
  const key = row.student_id.toLowerCase() + "|" + row.email;
  if (seen.has(key)) out.push("Duplicate row");
  seen.add(key);
  return out;
}

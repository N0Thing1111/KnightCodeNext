import { normalizeRow, type ImportRow } from "@/lib/import-utils";

export type ImportSection = { id: number; name: string; label: string; teacher: string };
export type AdminStudentImportState = {
  error?: string;
  result?: {
    created: (ImportRow & { temp_password: string; email_sent: boolean })[];
    existing: ImportRow[];
    errors: (ImportRow & { issue: string })[];
  };
};

export function parseStudentCsv(text: string): ImportRow[] {
  const matrix: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(value => value.trim())) matrix.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw Error("A quoted CSV field is not closed.");
  row.push(cell);
  if (row.some(value => value.trim())) matrix.push(row);
  const headers = matrix.shift()?.map(value => value.trim().toLowerCase());
  if (!headers || !["name", "email"].every(key => headers.includes(key)))
    throw Error("Include the CSV headers name,email. Optional columns: username,section.");
  if (new Set(headers).size !== headers.length) throw Error("CSV headers must not be repeated.");
  if (matrix.length < 1 || matrix.length > 100) throw Error("Import between 1 and 100 students at a time.");
  return matrix.map(values => {
    if (values.length !== headers.length) throw Error("Each row must have the same number of columns as the header.");
    return normalizeRow(Object.fromEntries(headers.map((key, i) => [key, values[i]])));
  });
}

export function studentImportIssues(rows: ImportRow[], section?: Pick<ImportSection, "name" | "label">): string[][] {
  const emails = new Set<string>(), usernames = new Set<string>();
  return rows.map(row => {
    const issues: string[] = [];
    if (!row.name || row.name.length > 150) issues.push("Name is required (maximum 150 characters)");
    if (row.email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) issues.push("Valid email required");
    if (row.username && !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(row.username)) issues.push("Invalid username");

    if (emails.has(row.email) || (row.username && usernames.has(row.username))) issues.push("Repeated email or username");
    emails.add(row.email); if (row.username) usernames.add(row.username);
    if (section && row.section && ![section.name, section.label].some(value => value.trim().toLowerCase() === row.section.trim().toLowerCase())) issues.push("CSV section does not match the selected section");
    return issues;
  });
}

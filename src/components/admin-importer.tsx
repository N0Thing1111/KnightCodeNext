"use client";
import { useState } from "react";
import { importTeachers } from "@/app/actions/admin-import";

type Row = { name: string; email: string };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') {
      value += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function AdminImporter() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  async function choose(file?: File) {
    setRows([]);
    setError("");
    if (!file) return;
    const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
    const header = parsed.shift()?.map((cell) => cell.trim().toLowerCase());
    if (header?.length !== 2 || header[0] !== "name" || header[1] !== "email")
      return setError("Use exactly these CSV headers: name,email");
    if (
      !parsed.length ||
      parsed.length > 100 ||
      parsed.some((r) => r.length !== 2)
    )
      return setError("Use two columns and between 1 and 100 teachers.");
    const next = parsed.map(([name, email]) => ({
      name: name.trim(),
      email: email.trim().toLowerCase(),
    }));
    if (next.some((r) => !r.name || !r.email))
      return setError("Every teacher needs a name and email.");
    setRows(next);
  }
  return (
    <>
      <section className="teacher-card">
        <h2>Create teacher accounts from CSV</h2>
        <p className="admin-note">
          Use the columns <code>name,email</code>, with one teacher per row (up
          to 100). Preview before creating accounts. Each teacher receives a
          generated ID and password, emailed to their address and shown in the
          results for you to copy if sending fails.
        </p>
        <label className="admin-file-label">
          Teacher CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => choose(event.target.files?.[0])}
          />
        </label>
        {error && <div className="teacher-alert error">{error}</div>}
      </section>
      {rows.length > 0 && (
        <section className="teacher-card">
          <h3>Review {rows.length} teachers</h3>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.email}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={importTeachers}>
            <input type="hidden" name="rows" value={JSON.stringify(rows)} />
            <button className="teacher-btn primary">
              Create these accounts
            </button>
          </form>
        </section>
      )}
    </>
  );
}

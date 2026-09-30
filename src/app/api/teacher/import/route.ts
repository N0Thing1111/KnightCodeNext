import { NextResponse } from "next/server";
import { readSheet } from "read-excel-file/node";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRow } from "@/lib/import-utils";
export async function POST(request: Request) {
  const teacher = await requireTeacher(),
    form = await request.formData(),
    classId = Number(form.get("class_id") || 0),
    file = form.get("student_file");
  const admin = createAdminClient(),
    { data: cls } = await admin
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("teacher_id", teacher.id)
      .maybeSingle();
  if (!cls)
    return NextResponse.redirect(
      new URL(
        "/teacher/classes?error=" + encodeURIComponent("Class not found."),
        request.url,
      ),
      303,
    );
  if (!(file instanceof File) || !file.size)
    return NextResponse.redirect(
      new URL(
        "/teacher/classes?import=" +
          classId +
          "&error=" +
          encodeURIComponent("Choose a CSV or XLSX file."),
        request.url,
      ),
      303,
    );
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.redirect(
      new URL(
        "/teacher/classes?import=" +
          classId +
          "&error=" +
          encodeURIComponent("File is too large. Maximum is 5 MB."),
        request.url,
      ),
      303,
    );
  const ext = file.name.toLowerCase().split(".").pop();
  if (!["csv", "xlsx"].includes(ext || ""))
    return NextResponse.redirect(
      new URL(
        "/teacher/classes?import=" +
          classId +
          "&error=" +
          encodeURIComponent("Only CSV and XLSX files are supported."),
        request.url,
      ),
      303,
    );
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    let rawRows: Record<string, unknown>[] = [];
    if (ext === "xlsx") {
      const matrix = (await readSheet(bytes)) as unknown as unknown[][];
      const headers = (matrix.shift() ?? []).map((v: unknown) =>
        String(v ?? ""),
      );
      rawRows = matrix.map((row: unknown[]) =>
        Object.fromEntries(
          headers.map((header: string, index: number) => [
            header,
            row[index] ?? "",
          ]),
        ),
      );
    } else {
      const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
      const matrix = parseCsv(text);
      const headers = matrix.shift() ?? [];
      rawRows = matrix.map((row) =>
        Object.fromEntries(
          headers.map((header, index) => [header, row[index] ?? ""]),
        ),
      );
    }
    const rows = rawRows.map(normalizeRow);
    if (!rows.length) throw Error("The file contains no student records.");
    const { data, error } = await admin
      .from("teacher_import_batches")
      .insert({ teacher_id: teacher.id, class_id: classId, rows })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.redirect(
      new URL("/teacher/import/" + data.id, request.url),
      303,
    );
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        "/teacher/classes?import=" +
          classId +
          "&error=" +
          encodeURIComponent(
            e instanceof Error ? e.message : "Could not read the import file.",
          ),
        request.url,
      ),
      303,
    );
  }
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

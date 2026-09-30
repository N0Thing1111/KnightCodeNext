import { requireTeacher } from "@/lib/auth";
import {
  reportLines,
  reportTypes,
  type ReportType,
} from "@/lib/teacher-reports";

function csvCell(value: string) {
  return '"' + value.replaceAll('"', '""') + '"';
}
function pdf(title: string, lines: string[]) {
  const esc = (value: string) =>
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)");
  const content = [
    "BT /F1 15 Tf 50 760 Td (" + esc(title) + ") Tj",
    "/F1 9 Tf 0 -24 Td",
    ...lines
      .slice(0, 45)
      .flatMap((line, index) =>
        [
          index ? "0 -15 Td" : "",
          "(" + esc(line.slice(0, 110)) + ") Tj",
        ].filter(Boolean),
      ),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "5 0 obj << /Length " +
      content.length +
      " >> stream\n" +
      content +
      "\nendstream endobj",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(output.length);
    output += object + "\n";
  }
  const xref = output.length;
  output +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n ")
      .join("\n") +
    "\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  return output;
}
export async function GET(request: Request) {
  const teacher = await requireTeacher(),
    url = new URL(request.url),
    raw = url.searchParams.get("type") as ReportType;
  const type = reportTypes.includes(raw) ? raw : "student_progress",
    lines = await reportLines(teacher.id, type),
    format = url.searchParams.get("format");
  if (format === "pdf")
    return new Response(
      pdf("KnightCode Teacher Report · " + type.replaceAll("_", " "), lines),
      {
        headers: {
          "content-type": "application/pdf",
          "content-disposition":
            'attachment; filename="knightcode-' + type + '.pdf"',
        },
      },
    );
  const body = [
    "KnightCode Report," + type + "," + new Date().toISOString(),
    ...lines.map(csvCell),
  ].join("\r\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        'attachment; filename="knightcode-' + type + '.csv"',
    },
  });
}

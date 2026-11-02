import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import { autoTable, type UserOptions } from "jspdf-autotable";
import {
  reportDate,
  reportDisplayTable,
  type Report,
} from "@/lib/report-model";

// Preserve user-entered text without allowing spreadsheet formulas.
function csvCell(value: string) {
  const safe =
    /^[\s\u0000-\u001f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value)
      ? "'" + value
      : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function reportCsv(report: Report) {
  const labels = [
    "Report",
    "Platform",
    "Instructor",
    "Section",
    "Lesson",
    "Python activity",
    "Generated (UTC+08)",
    "Grading basis",
  ];
  const values = [
    report.title,
    report.platform,
    report.teacher,
    report.section,
    report.lesson,
    report.activity,
    reportDate(report.generatedAt),
    report.note,
  ];
  const rows = report.rows.length
    ? report.rows
    : [report.columns.map(() => "")];
  return (
    "\uFEFF" +
    [[...labels, ...report.columns], ...rows.map((row) => [...values, ...row])]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
let fonts: Promise<Buffer[]> | undefined;
function loadFonts() {
  return (fonts ??= Promise.all(
    ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map((name) =>
      readFile(path.join(process.cwd(), "public/fonts/reports", name)),
    ),
  ));
}
export async function reportPdf(
  report: Report,
): Promise<Uint8Array<ArrayBuffer>> {
  const [regular, bold] = await loadFonts();
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  for (const [style, buffer] of [
    ["normal", regular],
    ["bold", bold],
  ] as const) {
    const file = "ReportSans-" + style + ".ttf";
    doc.addFileToVFS(file, buffer.toString("base64"));
    doc.addFont(file, "ReportSans", style);
  }
  doc.setProperties({
    title: report.title,
    author: report.teacher,
    subject: report.activity,
    creator: "KnightCode",
  });
  const width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight(),
    margin = 32,
    usable = width - margin * 2;
  const base: UserOptions = {
    theme: "plain",
    margin: { left: margin, right: margin, top: 72, bottom: 42 },
    styles: {
      font: "ReportSans",
      fontSize: 9,
      textColor: 25,
      overflow: "linebreak",
      cellPadding: 6,
      lineColor: 210,
    },
    rowPageBreak: "avoid",
  };
  let y = 76;
  function table(options: UserOptions) {
    autoTable(doc, { ...base, ...options, startY: y });
    y =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 14;
  }
  table({
    body: [
      ["Activity", report.activity, "Instructor", report.teacher],
      ["Lesson", report.lesson, "Section", report.section],
    ],
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: usable / 2 - 50 },
      2: { cellWidth: 65, fontStyle: "bold" },
      3: { cellWidth: usable / 2 - 65 },
    },
    styles: {
      ...base.styles,
      cellPadding: { top: 3, bottom: 3, left: 0, right: 12 },
    },
  });
  table({
    body: [[report.note]],
    styles: {
      ...base.styles,
      fontSize: 8,
      textColor: 75,
      cellPadding: { top: 0, bottom: 0, left: 0, right: 0 },
    },
  });
  const { columns, rows } = reportDisplayTable(report);
  const weights = [125, 85, 100, 65, 110, 95, 197],
    total = weights.reduce((a, b) => a + b, 0);
  table({
    head: [columns],
    body: rows.length
      ? rows
      : [
          [
            {
              content:
                "No current students are assigned this lesson in the selected section.",
              colSpan: columns.length,
            },
          ],
        ],
    headStyles: {
      fontStyle: "bold",
      fontSize: 8,
      textColor: 20,
      fillColor: 240,
      lineWidth: { top: 1, bottom: 0.5 },
      lineColor: 80,
    },
    bodyStyles: { fontSize: 8.5, lineWidth: { bottom: 0.3 }, valign: "top" },
    columnStyles: Object.fromEntries(
      weights.map((weight, i) => [i, { cellWidth: (usable * weight) / total }]),
    ),
    didParseCell(data) {
      if (
        data.section === "body" &&
        rows.length &&
        [1, 3].includes(data.column.index)
      )
        data.cell.styles.fontStyle = "bold";
    },
  });
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.setFont("ReportSans", "bold");
    doc.setFontSize(17);
    doc.setTextColor(25);
    doc.text("Python Activity Results", margin, 43);
    doc.setFont("ReportSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80);
    // Bound long platform names so they cannot collide with the report title.
    const platform = doc.splitTextToSize(report.platform, 210)[0];
    doc.text(platform, width - margin, 42, { align: "right" });
    doc.setDrawColor(80);
    doc.setLineWidth(0.5);
    doc.line(margin, 55, width - margin, 55);
    doc.setFontSize(8);
    doc.text(
      "Generated " +
        reportDate(report.generatedAt) +
        " (UTC+08) · Activity assessment record",
      margin,
      height - 23,
    );
    doc.text(page + " / " + count, width - margin, height - 23, {
      align: "right",
    });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

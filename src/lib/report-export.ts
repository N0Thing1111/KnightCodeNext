import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import { autoTable, type UserOptions } from "jspdf-autotable";
import { reportDate, type Report } from "@/lib/report-model";

// Formulas must remain text when a teacher opens user-entered names in Excel.
function csvCell(value: string) {
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function reportCsv(report: Report) {
  const metaColumns = ["Report", "School", "Teacher", "Section scope", "School year", "Generated at (UTC+08)", "Reporting period"];
  const metaValues = [report.title, report.school, report.teacher, report.section, report.schoolYear, reportDate(report.generatedAt), report.period];
  return "\uFEFF" + [[...metaColumns, ...report.columns], ...report.rows.map(row => [...metaValues, ...row])].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
let fonts: Promise<Buffer[]> | undefined;
function loadFonts() {
  return fonts ??= Promise.all(["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map(name => readFile(path.join(process.cwd(), "public/fonts/reports", name))));
}
export async function reportPdf(report: Report): Promise<Uint8Array<ArrayBuffer>> {
  const [regular, bold] = await loadFonts();
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", regular.toString("base64"));
  doc.addFileToVFS("NotoSans-Bold.ttf", bold.toString("base64"));
  doc.addFont("NotoSans-Regular.ttf", "ReportSans", "normal");
  doc.addFont("NotoSans-Bold.ttf", "ReportSans", "bold");
  doc.setProperties({ title: report.title, author: report.teacher, subject: "KnightCode teacher report" });
  const width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight(), margin = 36;
  const common: UserOptions = {
    margin: { top: 82, bottom: 42, left: margin, right: margin },
    styles: { font: "ReportSans", fontSize: 9, cellPadding: 8, overflow: "linebreak", textColor: [30, 45, 65], lineColor: [220, 227, 235], lineWidth: 0.35 },
    rowPageBreak: "avoid", showHead: "everyPage",
  };
  let y = 86;
  function table(options: UserOptions) {
    autoTable(doc, { ...common, ...options, startY: y });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }
  table({ theme: "plain", body: [["School", report.school, "Teacher", report.teacher], ["Section", report.section, "School year", report.schoolYear], ["Generated", reportDate(report.generatedAt) + " (UTC+08)", "Scope", report.period]], columnStyles: { 0: { fontStyle: "bold", cellWidth: 68 }, 1: { cellWidth: (width - margin * 2 - 136) / 2 }, 2: { fontStyle: "bold", cellWidth: 68 } }, styles: { ...common.styles, cellPadding: 5, lineWidth: 0 } });
  table({ theme: "plain", head: [report.summary.map(s => s.label)], body: [report.summary.map(s => s.value)], headStyles: { fillColor: [237, 243, 250], textColor: [62, 84, 110], fontSize: 9, fontStyle: "normal" }, bodyStyles: { fillColor: [237, 243, 250], fontSize: 18, fontStyle: "bold", textColor: [22, 65, 113] }, columnStyles: Object.fromEntries(report.summary.map((_, i) => [i, { cellWidth: (width - margin * 2) / report.summary.length }])) });
  table({ theme: "plain", body: [[report.note]], styles: { ...common.styles, fontSize: 8, textColor: [77, 94, 114], cellPadding: 4, lineWidth: 0 } });
  const weights = report.columns.map(c => /Student$|Challenge|Assignment$|Lesson$|Activity$|reviews/.test(c) ? 1.65 : 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  table({ theme: "grid", head: [report.columns], body: report.rows.length ? report.rows : [[{ content: "No matching records for this report.", colSpan: report.columns.length }]],
    headStyles: { fillColor: [28, 66, 110], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    columnStyles: Object.fromEntries(weights.map((weight, i) => [i, { cellWidth: (width - margin * 2) * weight / totalWeight }])),
  });
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.setDrawColor(28, 66, 110); doc.setLineWidth(2); doc.line(margin, 32, width - margin, 32);
    doc.setFont("ReportSans", "bold"); doc.setFontSize(9); doc.setTextColor(28, 66, 110);
    doc.text("KNIGHTCODE  /  TEACHER REPORT", margin, 23);
    doc.setFontSize(21); doc.setTextColor(25, 42, 64); doc.text(report.title, margin, 62);
    doc.setDrawColor(220, 227, 235); doc.setLineWidth(0.5); doc.line(margin, height - 32, width - margin, height - 32);
    doc.setFont("ReportSans", "normal"); doc.setFontSize(8); doc.setTextColor(90, 104, 123);
    doc.text("School use | Generated " + reportDate(report.generatedAt) + " UTC+08", margin, height - 18);
    doc.text(`Page ${page} of ${count}`, width - margin, height - 18, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

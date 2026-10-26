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
// Print-specific layout; the report model and CSV export keep their original data.
const reportWidths: Record<Report["type"], number[]> = {
  student_progress: [160, 62, 70, 140, 76, 65],
  class_performance: [160, 62, 70, 140, 76, 65],
  lesson_completion: [220, 75, 65, 65, 75, 130],
  challenge_performance: [40, 190, 75, 65, 75, 85, 100],
  activity: [110, 160, 125, 180, 55],
  inactive: [200, 155, 100, 110],
  assignment_completion: [175, 120, 110, 55, 65, 75, 90],
};

export async function reportPdf(report: Report): Promise<Uint8Array<ArrayBuffer>> {
  const [regular, bold] = await loadFonts();
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", regular.toString("base64"));
  doc.addFileToVFS("NotoSans-Bold.ttf", bold.toString("base64"));
  doc.addFont("NotoSans-Regular.ttf", "ReportSans", "normal");
  doc.addFont("NotoSans-Bold.ttf", "ReportSans", "bold");
  doc.setProperties({ title: report.title, author: report.teacher, subject: "KnightCode teacher report", creator: "KnightCode" });

  const width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight();
  const margin = 32, railWidth = 122, gutter = 26, left = margin + railWidth + gutter;
  const usable = width - left - margin;
  const ink = 25, muted = 85, rule = 195;
  const common: UserOptions = {
    margin: { top: 86, bottom: 38, left, right: margin },
    styles: { font: "ReportSans", fontSize: 8.8, cellPadding: { top: 5, bottom: 5, left: 5, right: 5 }, overflow: "linebreak", textColor: ink, lineColor: rule, lineWidth: 0 },
    theme: "plain", rowPageBreak: "avoid", showHead: "everyPage",
  };
  let y = 80;
  function table(options: UserOptions, gap = 10) {
    autoTable(doc, { ...common, ...options, startY: y });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + gap;
  }
  table({
    body: [[report.school]],
    styles: { ...common.styles, fontSize: 10, fontStyle: "bold", cellPadding: 0 },
  }, 9);
  table({
    body: [
      ["Prepared by", report.teacher, "School year", report.schoolYear],
      ["Section", { content: report.section, colSpan: 3 }],
      ["Scope", { content: report.period, colSpan: 3 }],
    ],
    styles: { ...common.styles, fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 0, right: 10 } },
    columnStyles: {
      0: { cellWidth: 58, textColor: muted },
      1: { cellWidth: usable * 0.55 - 58 },
      2: { cellWidth: 59, textColor: muted },
      3: { cellWidth: usable * 0.45 - 59 },
    },
  }, 14);

  // The register keeps identity details together, leaving room for learning evidence.
  const student = report.columns.indexOf("Student");
  const studentId = report.columns.indexOf("Student ID");
  const section = report.columns.indexOf("Section");
  const combineStudent = student >= 0 && studentId >= 0;
  const kept = report.columns.map((_, i) => i).filter(i => !combineStudent || (i !== studentId && i !== section));
  const columns = kept.map(i => report.columns[i]);
  const rows = report.rows.map(row => kept.map(i => combineStudent && i === student
    ? row[i] + "\nID: " + row[studentId] + (section >= 0 ? "\nSection: " + row[section] : "")
    : row[i]));
  const preferred = reportWidths[report.type];
  const weights = preferred.length === columns.length ? preferred : columns.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const isCount = (column: string) => /^(Level|Assigned students|Completed|Pending|Students|Recorded attempts|XP earned|Pending assignments|Assignments completed|Game levels completed|Python activities submitted)$/.test(column);
  const isPercent = (column: string) => column === "Completion" || column === "Assignment completion";
  const studentColumn = columns.indexOf("Student");
  // AutoTable owns wrapping and pagination; only the already-laid-out text is styled here.
  const identityText = new WeakMap<object, string[]>();
  table({
    head: [columns],
    body: rows.length ? rows : [[{ content: "No matching records for this report.", colSpan: columns.length }]],
    headStyles: { fillColor: false, textColor: ink, fontStyle: "bold", fontSize: 8, cellPadding: { top: 7, bottom: 7, left: 5, right: 5 }, lineColor: ink, lineWidth: { top: 0.8, bottom: 0.8 } },
    bodyStyles: { fontSize: 8.8, lineWidth: { bottom: 0.3 }, valign: "top" },
    columnStyles: Object.fromEntries(weights.map((weight, i) => [i, {
      cellWidth: usable * weight / totalWeight,
      halign: isPercent(columns[i]) ? "right" : isCount(columns[i]) ? "center" : "left",
    }])),
    didParseCell(data) {
      if (data.section === "head") data.cell.styles.halign = isPercent(columns[data.column.index]) ? "right" : isCount(columns[data.column.index]) ? "center" : "left";
      if (data.section === "body" && rows.length && data.column.index === studentColumn) data.cell.styles.fontStyle = "bold";
      if (!rows.length && data.section === "body") {
        data.cell.styles.halign = "left";
        data.cell.styles.cellPadding = { top: 18, bottom: 18, left: 5, right: 5 };
        data.cell.styles.textColor = muted;
      }
    },
    willDrawCell(data) {
      if (combineStudent && rows.length && data.section === "body" && data.column.index === studentColumn) {
        identityText.set(data.cell, [...data.cell.text]);
        data.cell.text = [];
      }
    },
    didDrawCell(data) {
      const lines = identityText.get(data.cell);
      if (!lines) return;
      const position = data.cell.getTextPos();
      const lineHeight = data.cell.styles.fontSize * doc.getLineHeightFactor();
      let secondary = false;
      for (const [index, line] of lines.entries()) {
        secondary ||= line.startsWith("ID:") || line.startsWith("Section:");
        doc.setFont("ReportSans", secondary ? "normal" : "bold");
        doc.setFontSize(secondary ? 8 : data.cell.styles.fontSize);
        doc.setTextColor(secondary ? muted : ink);
        doc.text(line, position.x, position.y + index * lineHeight, { baseline: "top" });
      }
      data.cell.text = lines;
      identityText.delete(data.cell);
    },
  }, 12);

  // Explanations follow the records instead of pushing the table down the first page.
  if (report.note) table({
    body: [["Reading the figures", report.note]],
    styles: { ...common.styles, fontSize: 8, textColor: muted, cellPadding: { top: 0, bottom: 0, left: 0, right: 0 } },
    columnStyles: { 0: { cellWidth: 90, fontStyle: "bold", cellPadding: { top: 0, bottom: 0, left: 0, right: 12 } } },
  }, 0);

  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    // The side column is a document index, not a decorative full-page color panel.
    doc.setDrawColor(ink); doc.setLineWidth(0.5);
    doc.line(left - gutter / 2, margin, left - gutter / 2, height - margin);
    doc.setFont("ReportSans", "bold"); doc.setFontSize(13); doc.setTextColor(ink);
    doc.text("KnightCode", margin, 46);
    doc.setFont("ReportSans", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text("Teacher reports", margin, 62);
    if (report.summary.length) {
      doc.setFont("ReportSans", "bold"); doc.setFontSize(9); doc.setTextColor(ink);
      doc.text("Report totals", margin, 105);
      autoTable(doc, {
        theme: "plain", startY: 116, tableWidth: railWidth,
        margin: { left: margin, right: width - margin - railWidth, top: 116, bottom: 100 },
        body: report.summary.map(item => [item.label, item.value]),
        styles: { font: "ReportSans", fontSize: 8.5, textColor: ink, overflow: "linebreak", cellPadding: { top: 7, bottom: 7, left: 0, right: 4 }, lineColor: rule, lineWidth: { bottom: 0.3 } },
        columnStyles: { 0: { cellWidth: 83 }, 1: { cellWidth: railWidth - 83, fontStyle: "bold", halign: "right", cellPadding: { top: 7, bottom: 7, left: 4, right: 0 } } },
        rowPageBreak: "avoid",
      });
    }
    doc.setFont("times", "normal"); doc.setFontSize(page === 1 ? 30 : 23); doc.setTextColor(ink);
    doc.text(report.title, left, 55);
    if (page > 1) {
      doc.setFont("ReportSans", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
      doc.text("Records continued", left, 72);
    }
    doc.setFont("ReportSans", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text("Generated (UTC+08)", margin, height - 91);
    doc.text(reportDate(report.generatedAt), margin, height - 77);
    doc.text("School use", left, height - 20);
    doc.setFont("times", "normal"); doc.setFontSize(18); doc.setTextColor(ink);
    doc.text(String(page), margin, height - 34);
    doc.setFont("ReportSans", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    doc.text("of " + count, margin + 25, height - 34);
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

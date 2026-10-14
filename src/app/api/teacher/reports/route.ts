import { requireTeacher } from "@/lib/auth";
import { getTeacherReport } from "@/lib/teacher-reports";
import { parseReportFilters } from "@/lib/report-model";
import { reportCsv, reportPdf } from "@/lib/report-export";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const teacher = await requireTeacher();
  const url = new URL(request.url);
  try {
    const filters = parseReportFilters(Object.fromEntries(url.searchParams));
    const { report } = await getTeacherReport(teacher, filters);
    const pdf = url.searchParams.get("format") === "pdf";
    return new Response(pdf ? await reportPdf(report) : reportCsv(report), {
      headers: {
        "Content-Type": pdf ? "application/pdf" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="knightcode-${filters.type}${filters.section ? "-section-" + filters.section : ""}.${pdf ? "pdf" : "csv"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not generate report." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}

import { requirePerm } from "@/lib/auth";
import { runReport, parseFilters } from "@/lib/reports";
import { makeXlsx, makeCsv } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// /seller/reports/download?type=orders&format=xlsx&range=30
export async function GET(req) {
  await requirePerm("reports");
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFilters(sp);
  const report = runReport(String(sp.type || ""), f);
  if (!report) return new Response("Ye report nahi mili", { status: 404 });

  const format = sp.format === "csv" ? "csv" : "xlsx";
  const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const range = f.from || f.to ? `_${f.from || "start"}_to_${f.to || stamp}` : "_all";
  const name = `${report.def.id}${range}_${stamp}.${format}`;
  const { columns, rows } = report;

  const body = format === "csv" ? makeCsv({ columns, rows }) : makeXlsx({ sheetName: report.def.title, columns, rows });
  return new Response(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

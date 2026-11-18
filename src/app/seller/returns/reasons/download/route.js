import { requirePerm } from "@/lib/auth";
import { runReport, parseFilters } from "@/lib/reports";
import { makeXlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// /seller/returns/reasons/download?range=30  : har returned item ek row (CR aur RTO)
export async function GET(req) {
  await requirePerm("returns");
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFilters(sp);
  const report = runReport("return_details", f);
  const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const body = makeXlsx({ sheetName: "Return reasons", columns: report.columns, rows: report.rows });
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="return_reasons_${f.from || "start"}_to_${f.to || stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

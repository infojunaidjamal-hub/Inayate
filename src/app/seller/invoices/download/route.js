import { requirePerm } from "@/lib/auth";
import { runReport, parseFilters } from "@/lib/reports";
import { makeXlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// /seller/invoices/download?type=gst_register|credit_notes&range=30
export async function GET(req) {
  await requirePerm("invoices");
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const type = sp.type === "credit_notes" ? "credit_notes" : "gst_register";
  const f = parseFilters(sp);
  const report = runReport(type, f);
  if (!report) return new Response("Report nahi mili", { status: 404 });
  const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const body = makeXlsx({ sheetName: report.def.title.slice(0, 30), columns: report.columns, rows: report.rows });
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}_${f.from || "start"}_to_${f.to || stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

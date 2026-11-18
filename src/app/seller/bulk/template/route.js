import { requirePerm } from "@/lib/auth";
import { makeWorkbook } from "@/lib/xlsx";
import { HEADERS, templateRows, instructionRows, templateColumnsForInstructions } from "@/lib/bulkProducts";

export const dynamic = "force-dynamic";

// /seller/bulk/template?mode=new  (khali template)   ya   ?mode=current  (abhi ke saare products)
export async function GET(req) {
  await requirePerm("products");
  const mode = new URL(req.url).searchParams.get("mode") === "current" ? "current" : "new";
  const rows = mode === "current" ? templateRows() : [];
  const body = makeWorkbook([
    { name: "Products", columns: HEADERS, rows },
    { name: "Instructions", columns: templateColumnsForInstructions(), rows: instructionRows() },
  ]);
  const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="products-${mode === "current" ? "current_" + stamp : "template"}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

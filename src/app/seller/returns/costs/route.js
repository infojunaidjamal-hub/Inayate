import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { makeXlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// Har order ka shipping kharcha (forward freight, COD fee, return freight, RTO charge). Returns > RTO se "Export Excel"
export async function GET() {
  await requirePerm("returns");
  const rows = all(
    `SELECT o.order_no, o.created_at, o.status, o.pay_method, o.total, COALESCE(s.courier_name, o.courier) AS courier, s.awb,
            c.freight, c.cod_fee, c.return_freight, c.rto_charge, c.note,
            COALESCE(c.freight,0)+COALESCE(c.cod_fee,0)+COALESCE(c.return_freight,0)+COALESCE(c.rto_charge,0) AS total_cost,
            CASE WHEN o.shipping > 0 THEN o.shipping ELSE 0 END AS collected
     FROM order_costs c JOIN orders o ON o.id = c.order_id LEFT JOIN shipments s ON s.order_id = o.id ORDER BY o.id DESC`
  );
  for (const r of rows) r.net = (r.collected || 0) - (r.total_cost || 0);
  const columns = [
    { key: "order_no", header: "Order", width: 12 }, { key: "created_at", header: "Date", width: 18 }, { key: "status", header: "Status", width: 16 },
    { key: "pay_method", header: "Payment", width: 10 }, { key: "total", header: "Order total", width: 12 }, { key: "courier", header: "Courier", width: 18 },
    { key: "awb", header: "Tracking ID", width: 16 }, { key: "freight", header: "Forward freight", width: 14 }, { key: "cod_fee", header: "COD fee", width: 10 },
    { key: "return_freight", header: "Return freight (RTO)", width: 18 }, { key: "rto_charge", header: "RTO charge", width: 12 },
    { key: "total_cost", header: "Total shipping cost", width: 18 }, { key: "collected", header: "Collected from buyer", width: 18 },
    { key: "net", header: "Net", width: 10 }, { key: "note", header: "Note", width: 30 },
  ];
  const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  return new Response(makeXlsx({ sheetName: "Shipping costs", columns, rows }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="shipping-costs_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

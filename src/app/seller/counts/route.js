import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sidebar ke badge ke numbers (sirf seller dekh sakta hai)
export async function GET() {
  const u = await getUser();
  if (!u || !["seller", "manager", "operator"].includes(u.role)) return Response.json({}, { status: 401 });
  const c = (sql) => one(sql).c;
  return Response.json({
    process: c("SELECT COUNT(*) c FROM orders WHERE status IN ('On Hold','Placed','Confirmed','NDR')"),
    ndr: c("SELECT COUNT(*) c FROM orders WHERE status = 'NDR'"),
    rto: c("SELECT COUNT(*) c FROM orders WHERE status = 'RTO' OR (rto_stage IS NOT NULL AND rto_stage NOT IN ('restocked'))"),
    returns: c("SELECT COUNT(*) c FROM returns WHERE status = 'Requested'"),
    refunds: c("SELECT COUNT(*) c FROM orders WHERE pay_status = 'Refund Initiated'"),
    alerts: c("SELECT COUNT(*) c FROM stock_alerts a JOIN products p ON p.id = a.product_id WHERE a.status = 'waiting' AND p.stock > 0"),
    products: c("SELECT COUNT(*) c FROM products"),
  });
}

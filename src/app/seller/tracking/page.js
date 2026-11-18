import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { shipEvents } from "@/lib/logistics";
import TrackingBoard from "./TrackingBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tracking – Seller Panel" };

export default async function Tracking() {
  await requirePerm("orders");
  const list = all(
    `SELECT s.id, s.awb, s.courier_name, s.refreshed_at, o.order_no, o.status, o.promised_by, o.ship_name
     FROM shipments s JOIN orders o ON o.id = s.order_id
     WHERE o.status IN ('Ready to ship','Picked up','In transit','Out for delivery','NDR') ORDER BY s.id DESC`);
  const rows = list.map((x) => ({ id: x.id, no: x.order_no, partner: x.courier_name, awb: x.awb, status: x.status, promised: x.promised_by ? fmtDate(x.promised_by + " 00:00:00") : "", name: x.ship_name }));
  const history = Object.fromEntries(list.map((x) => [x.order_no, shipEvents(x.id).map((e) => ({ id: e.id, label: e.label, detail: e.detail, at: fmtDate(e.created_at) }))]));
  const last = list.map((x) => x.refreshed_at).filter(Boolean).sort().pop();
  const refreshedAt = last ? new Date(String(last).replace(" ", "T") + "Z").toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
  return (
    <>
      <h2>Shipments in transit</h2>
      <p className="mut" style={{ marginTop: -8 }}>Manual partners: Refresh dabayein. Webhook se automatic update baad mein judega.</p>
      <TrackingBoard rows={rows} history={history} refreshedAt={refreshedAt} />
    </>
  );
}

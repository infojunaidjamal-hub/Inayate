import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { one, all, inr } from "@/lib/db";
import { SITE } from "@/lib/site";
import { shipmentOf } from "@/lib/logistics";
import PrintButton from "../../PrintButton";
import "../../orders.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shipping label – Seller Panel" };

// Courier ke parcel par chipkane wala label: kahan bhejna hai, tracking ID, COD ki raqam
export default async function Label({ params }) {
  await requirePerm("ship");
  const { no } = await params;
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o) notFound();
  const sh = shipmentOf(o.id);
  const items = all("SELECT name, qty, variant_label FROM order_items WHERE order_id = ?", o.id);
  const cod = o.pay_method === "COD" && o.pay_status !== "Paid";
  return (
    <>
      <div className="sp-noprint" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Shipping label</h1>
        <PrintButton />
        <Link href={`/seller/orders/${o.order_no}`} style={{ textDecoration: "underline" }}>← Order par wapas</Link>
      </div>
      <section className="sl" style={{ maxWidth: 420 }}>
        <div className="sl-head"><b>{o.courier || sh?.courier_name || "Courier"}</b><span>{o.awb || sh?.awb || "-"}</span></div>
        <div className="sl-row"><span>Order <b>{o.order_no}</b></span><span>{sh?.charged_kg ? `${sh.charged_kg} kg` : ""}</span></div>
        <div className="sl-ship"><small>SHIP TO</small><b>{o.ship_name}</b><br />{o.ship_address}<br />Mobile: {o.ship_mobile}</div>
        <div className={"sl-pay" + (cod ? " cod" : "")}>{cod ? `COD: ${inr(o.total)} collect karein` : "PREPAID: paisa nahi lena"}</div>
        <div style={{ margin: "6px 0" }}>{items.map((i) => `${i.name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.qty}`).join(", ")}</div>
        <div className="sl-foot">Return address: {SITE.name}, {SITE.address} · {SITE.phone}</div>
      </section>
    </>
  );
}

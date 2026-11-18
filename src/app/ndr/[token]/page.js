import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { ndrCaseOf } from "@/lib/logistics";
import { itemsByOrder } from "@/lib/orderThumbs";
import { SITE } from "@/lib/site";
import NdrForm from "./NdrForm";
import "@/components/flow.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delivery update", robots: { index: false, follow: false } };

const IST = 330 * 60000;
const dayStr = (ms) => new Date(ms + IST).toISOString().slice(0, 10);
const label = (ms) => new Date(ms).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function NdrPage({ params, searchParams }) {
  const { token } = await params;
  const { done } = await searchParams;
  const c = ndrCaseOf(token);
  if (!c) notFound();
  const o = one("SELECT * FROM orders WHERE id = ?", c.order_id);
  const it = (itemsByOrder([o.id])[o.id] || [])[0];
  const reply = c.reply ? JSON.parse(c.reply) : null;
  const dates = [];
  for (let i = 1; i <= 7; i++) { const ms = Date.now() + i * 864e5; if (new Date(ms + IST).getUTCDay() !== 0) dates.push({ v: dayStr(ms), t: label(ms) }); }
  const open = c.status === "open" && o.status === "NDR";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {it?.image ? <img src={it.image} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} /> : null}
        <div><h2 style={{ margin: 0 }}>We could not deliver your order</h2>
          <div className="mut">Order {o.order_no}{it ? ` · ${it.name}${it.variant_label ? ` (${it.variant_label})` : ""}` : ""}</div></div>
      </div>
      <p className="card pad" style={{ background: "#f8ecc8", marginTop: 14 }}>
        {o.courier || "The courier"} tried today but could not deliver ({c.reason || "no reason given"}). This was attempt <b>{c.attempt} of {c.max_attempts}</b>.
      </p>
      {done || reply ? (
        <p className="ok">Thank you. We will try again{reply?.date ? <> on <b>{label(new Date(reply.date + "T12:00:00+05:30").getTime())}</b></> : null}. You will get a message when the parcel is out for delivery.</p>
      ) : open ? (
        <NdrForm token={token} address={o.ship_address} phone={String(o.ship_mobile || "").replace(/\D/g, "").slice(-10)} dates={dates} />
      ) : (
        <p className="mut">This order does not need a reply any more (status: {o.status}). Questions? Call us on {SITE.phone}.</p>
      )}
      <p className="mut" style={{ fontSize: 13 }}>If all attempts fail, the parcel comes back to us, the order is cancelled and prepaid money is refunded.</p>
    </div>
  );
}

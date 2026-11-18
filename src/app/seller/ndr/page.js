import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { ndrReattempt } from "../logistics/actions";
import NdrTools from "./NdrTools";
import { waTo } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = { title: "NDR – Seller Panel" };

export default async function NdrPage({ searchParams }) {
  await requirePerm("orders");
  const { err, ok } = await searchParams;
  // Har order ka sabse naya case. Khule NDR + wo jo aakhri koshish ke baad RTO ban gaye
  const cases = all(
    `SELECT c.*, o.order_no, o.ship_name, o.ship_mobile, o.ship_address, o.status AS order_status, o.ndr_max, o.ndr_attempts, o.courier
     FROM ndr_cases c JOIN orders o ON o.id = c.order_id
     WHERE c.id IN (SELECT MAX(id) FROM ndr_cases GROUP BY order_id) AND (o.status IN ('NDR','RTO') OR c.created_at >= datetime('now','-7 days'))
     ORDER BY (o.status = 'NDR') DESC, c.id DESC`);
  const noReply = (c) => c.status === "open" && Date.now() - new Date(String(c.created_at).replace(" ", "T") + "Z").getTime() > 24 * 3600e3;
  return (
    <>
      <h2>NDR <span className="tag x">{cases.filter((c) => c.order_status === "NDR").length} open</span></h2>
      <p className="mut" style={{ marginTop: -8 }}>Har partner ki apni koshish (aam taur par 3). Aakhri koshish fail hone par case apne aap Returns &gt; RTO mein chala jata hai.</p>
      {err && <p className="err">{err}</p>}{ok && <p className="ok">{ok}</p>}
      {cases.length === 0 && <p className="mut">Abhi koi failed delivery nahi hai.</p>}
      {cases.map((c) => {
        const max = c.max_attempts;
        const reply = c.reply ? JSON.parse(c.reply) : null;
        const rto = c.status === "rto";
        const buyer = rto ? "RTO started automatically" : reply ? `Buyer chose date: ${fmtDate(reply.date + " 00:00:00")}${reply.address ? " · new address" : ""}` : c.status === "reattempt" ? `Re-attempt booked: attempt ${c.attempt + 1}` : noReply(c) ? "No response" : "No response yet";
        const tone = rto ? "x" : reply ? "g" : noReply(c) ? "x" : "y";
        const wa = waTo(c.ship_mobile, c.message || "");
        return (
          <div className="card pad" key={c.id} style={{ marginBottom: 12 }}>
            <div className="row" style={{ border: 0, padding: 0, flexWrap: "wrap" }}>
              <div><b><Link href={`/seller/orders/${c.order_no}`}>{c.order_no}</Link></b> · {c.ship_name} · {c.ship_mobile}
                <div className="mut" style={{ fontSize: 13 }}>{c.courier || "-"} · {c.reason} · failed {fmtDate(c.created_at)}</div></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Array.from({ length: max }, (_, k) => k + 1).map((k) => <span key={k} className={`tag ${k <= c.attempt ? "x" : ""}`} style={{ opacity: k > c.attempt ? 0.5 : 1 }}>Attempt {k} of {max}{k <= c.attempt ? " failed" : ""}</span>)}
              </div>
            </div>
            <div className="row" style={{ marginTop: 10, border: 0, flexWrap: "wrap" }}>
              <span className={`tag ${tone}`}>Buyer: {buyer}</span>
              <NdrTools orderNo={c.order_no} wa={wa} sms={c.message || ""} tel={String(c.ship_mobile || "")} address={c.ship_address} canReattempt={c.order_status === "NDR" && c.attempt < max} reattempt={ndrReattempt} next={c.attempt + 1} max={max} done={c.status === "rto"} />
            </div>
          </div>
        );
      })}
      <div className="card pad" style={{ background: "#f6efe6" }}>
        <b>Manual for now.</b> &quot;WhatsApp&quot; chat kholta hai jisme message aur link pehle se likha hota hai; &quot;Copy SMS text&quot; wahi text copy karta hai. Message Message outbox mein bhi save hota hai. Automatic bhejna baad mein judega.
      </div>
    </>
  );
}

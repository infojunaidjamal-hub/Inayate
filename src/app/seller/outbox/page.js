import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Message outbox – Seller Panel" };

export default async function Outbox() {
  await requirePerm("orders");
  const list = all("SELECT * FROM message_outbox ORDER BY id DESC LIMIT 100");
  return (
    <>
      <h1 style={{ margin: 0 }}>Message outbox</h1>
      <p className="mut" style={{ margin: "4px 0 16px" }}>Buyer ko jo messages jane the, yahan save hote hain. Asli email / SMS bhejna baad ke phase mein judega.</p>
      {list.length === 0 && <div className="card pad"><p className="mut" style={{ margin: 0 }}>Abhi koi message nahi.</p></div>}
      {list.map((m) => (
        <div key={m.id} className="card pad" style={{ marginBottom: 10 }}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <span><b>{m.subject || m.kind || "Message"}</b> <span className="mut">· {m.channel} · {m.to_addr || "no address"}{m.ref ? ` · ${m.ref}` : ""}</span></span>
            <span className="mut">{fmtDate(m.created_at)}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</p>
        </div>
      ))}
    </>
  );
}

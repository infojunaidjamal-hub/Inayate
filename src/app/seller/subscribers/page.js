import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { all, one } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { addSubscriber, toggleSubscriber, removeSubscriber } from "./actions";
import Confirm from "../customers/Confirm";
import "../customers/customers.css";
import { hrefWith } from "@/lib/qs";
import { ensureLeads } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscribers – Seller Panel" };

// Newsletter / popup se jude emails. Unsubscribe kiye hue ko email mat bhejna.
export default async function Subscribers({ searchParams }) {
  const me = await requirePerm("customers");
  const sp = await searchParams;
  const q = String(sp.q || "").trim().slice(0, 80);
  const st = sp.st === "active" ? "active" : sp.st === "off" ? "off" : "";
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const where = ["s.email LIKE ?"];
  if (st) where.push(st === "off" ? "s.unsubscribed_at IS NOT NULL" : "s.unsubscribed_at IS NULL");
  const list = all(
    `SELECT s.*, u.id AS cid, u.name AS cname FROM subscribers s
     LEFT JOIN users u ON lower(u.email) = s.email AND u.role = 'buyer'
     WHERE ${where.join(" AND ")} ORDER BY s.id DESC LIMIT 300`, like);
  const t = one("SELECT COUNT(*) AS total, SUM(CASE WHEN unsubscribed_at IS NULL THEN 1 ELSE 0 END) AS active FROM subscribers");
  const href = hrefWith("/seller/subscribers", { q, st });
  ensureLeads();
  const leads = all("SELECT * FROM popup_leads ORDER BY id DESC LIMIT 50");
  const lt = one("SELECT COUNT(*) AS total, SUM(notify) AS notify FROM popup_leads");

  return (
    <>
      <h2>Subscribers</h2>
      {sp.err && <p className="err" role="alert">{sp.err}</p>}
      {sp.ok && <p className="cu-ok" role="status">{sp.ok}</p>}
      <div className="stats">
        <div className="card"><b>{t.total}</b><br /><small>Total</small></div>
        <div className="card"><b>{t.active || 0}</b><br /><small>Active</small></div>
        <div className="card"><b>{t.total - (t.active || 0)}</b><br /><small>Unsubscribed</small></div>
      </div>

      <div className="card pad">
        <form action={addSubscriber} className="cu-row">
          <input name="email" type="email" maxLength={254} placeholder="Add an email manually" required />
          <button className="btn a s">Add</button>
          {can(me.role, "reports") && <a className="btn o s" href="/seller/subscribers/export">Download CSV</a>}
        </form>
      </div>

      <form className="two" style={{ gridTemplateColumns: "2fr auto" }}>
        <input name="q" placeholder="Search email" defaultValue={q} />
        {st && <input type="hidden" name="st" value={st} />}
        <button className="btn" style={{ height: 40 }}>Search</button>
      </form>
      <div className="tabs">
        <Link href={href({ st: "" })} className={!st ? "on" : ""}>All</Link>
        <Link href={href({ st: "active" })} className={st === "active" ? "on" : ""}>Active</Link>
        <Link href={href({ st: "off" })} className={st === "off" ? "on" : ""}>Unsubscribed</Link>
      </div>

      {list.length === 0 ? <div className="card pad"><p className="mut" style={{ margin: 0 }}>No subscribers found.</p></div> : (
        <div className="card tw">
          <table>
            <thead><tr><th>Email</th><th>Source</th><th>Subscribed</th><th>Customer</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td style={{ wordBreak: "break-all" }}>{s.email}</td>
                  <td>{s.source}</td>
                  <td>{fmtDate(s.created_at)}</td>
                  <td>{s.cid ? <Link href={`/seller/customers/${s.cid}`} style={{ textDecoration: "underline" }}>{s.cname}</Link> : <span className="mut">-</span>}</td>
                  <td>{s.unsubscribed_at ? <span className="tag x">Unsubscribed</span> : <span className="tag g">Active</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <form action={toggleSubscriber} style={{ display: "inline" }}><input type="hidden" name="id" value={s.id} /><button className="btn o s">{s.unsubscribed_at ? "Resubscribe" : "Unsubscribe"}</button></form>{" "}
                    <form action={removeSubscriber} style={{ display: "inline" }}><input type="hidden" name="id" value={s.id} /><Confirm className="btn r s" message="Remove this email from the list?">Remove</Confirm></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3 style={{ marginTop: 28 }}>Mobile sign-ups (popup)</h3>
      <div className="stats">
        <div className="card"><b>{lt.total}</b><br /><small>Total numbers</small></div>
        <div className="card"><b>{lt.notify || 0}</b><br /><small>Said yes to updates &amp; offers</small></div>
      </div>
      <div className="card pad">
        <p className="mut" style={{ margin: 0 }}>
          Numbers from the home page popup. Only contact those marked &quot;Yes&quot; with marketing messages.
          {can(me.role, "reports") && <> <a className="btn o s" style={{ marginLeft: 8 }} href="/seller/subscribers/export?type=mobile">Download CSV</a></>}
        </p>
      </div>
      {leads.length === 0 ? <div className="card pad"><p className="mut" style={{ margin: 0 }}>No mobile sign-ups yet.</p></div> : (
        <div className="card tw">
          <table>
            <thead><tr><th>Mobile</th><th>Updates &amp; offers</th><th>Signed up</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>+91 {l.mobile}</td>
                  <td>{l.notify ? <span className="tag g">Yes</span> : <span className="tag x">No</span>}</td>
                  <td>{fmtDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mut" style={{ fontSize: 12 }}>Unsubscribed emails stay in the list so they are not added again by mistake. Do not send marketing emails to them.</p>
    </>
  );
}

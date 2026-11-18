import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/perms";
import { all, inr } from "@/lib/db";
import { fmtDate, statusClass } from "@/lib/format";
import { getCustomer, customerOrders, customerReturns, customerTags, customerNotes, customerWallet, customerStats, fmtDateTime, SUGGEST_TAGS, TABS } from "@/lib/customers";
import { saveCustomer, toggleBlock, addTag, removeTag, addNote, deleteNote, adjustWallet } from "../actions";
import ResetForm from "../ResetForm";
import Confirm from "../Confirm";
import "../customers.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer – Seller Panel" };

// Customer 360: ek customer ki poori kahani ek jagah.
export default async function Customer360({ params, searchParams }) {
  const me = await requirePerm("customers");
  const { id } = await params;
  const sp = await searchParams;
  const c = getCustomer(id);
  if (!c) notFound();
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab : "overview";
  const tags = customerTags(c.id);
  const stats = customerStats(c.id);
  const wallet = customerWallet(c.id);
  const owner = can(me.role, "team");
  const tabHref = (k) => `/seller/customers/${c.id}?tab=${k}`;
  const hidden = <input type="hidden" name="id" value={c.id} />;

  return (
    <>
      <p style={{ margin: "0 0 10px" }}><Link href="/seller/customers" className="btn o s">← All customers</Link></p>
      {sp.err && <p className="err" role="alert">{sp.err}</p>}
      {sp.ok && <p className="cu-ok" role="status">{sp.ok}</p>}

      <div className="card pad">
        <div className="cu-head">
          <div className="cu-av" aria-hidden="true">{c.name.charAt(0).toUpperCase()}</div>
          <div className="grow">
            <h1>{c.name} {c.disabled ? <span className="tag x">Blocked</span> : <span className="tag g">Active</span>}</h1>
            <div className="mut">{c.mobile} · {c.email || "no email"} · joined {fmtDate(c.created_at)}</div>
            <div style={{ marginTop: 6 }}>{tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          </div>
        </div>

        <div className="cu-acts">
          <details className="cu-d">
            <summary className="btn o s">Edit details</summary>
            <form action={saveCustomer} className="cu-form">
              {hidden}
              <label>Name<input name="name" defaultValue={c.name} maxLength={60} required /></label>
              <label>Mobile (this is the customer’s login ID)<input name="mobile" defaultValue={c.mobile} inputMode="numeric" maxLength={10} required /></label>
              <label>Email (optional)<input name="email" type="email" defaultValue={c.email || ""} maxLength={254} /></label>
              <p className="mut" style={{ fontSize: 12, margin: "0 0 8px" }}>If you change the mobile number, tell the customer. Old orders keep the number they were placed with.</p>
              <Confirm className="btn a s" message="Save these changes?">Save changes</Confirm>
            </form>
          </details>
          <details className="cu-d">
            <summary className={"btn s " + (c.disabled ? "o" : "r")}>{c.disabled ? "Unblock customer" : "Block customer"}</summary>
            <form action={toggleBlock} className="cu-form">
              {hidden}
              <label>Reason (saved in notes){/* optional */}<input name="reason" maxLength={200} placeholder={c.disabled ? "Optional" : "e.g. repeated fake orders"} /></label>
              <Confirm className={"btn s " + (c.disabled ? "a" : "r")} message={c.disabled ? "Unblock this customer?" : "Block this customer? They will be logged out and cannot log in."}>{c.disabled ? "Yes, unblock" : "Yes, block"}</Confirm>
            </form>
          </details>
          {owner && <div style={{ minWidth: 190 }}><ResetForm id={c.id} mobile={c.mobile} /></div>}
        </div>
        {c.disabled ? <p className="cu-block">This customer is blocked. They are logged out and cannot log in or place orders.</p> : null}
      </div>

      <div className="stats">
        <div className="card"><b>{stats.orders}</b><br /><small>Orders</small></div>
        <div className="card"><b>{inr(stats.spent)}</b><br /><small>Total spent</small></div>
        <div className="card"><b>{stats.returns}</b><br /><small>Returns</small></div>
        <div className="card"><b>{inr(wallet.balance)}</b><br /><small>Wallet balance</small></div>
        <div className="card"><b>{stats.last_at ? fmtDate(stats.last_at) : "-"}</b><br /><small>Last order</small></div>
      </div>

      <div className="tabs">
        {TABS.map(([k, label]) => <Link key={k} href={tabHref(k)} className={tab === k ? "on" : ""}>{label}</Link>)}
      </div>

      {tab === "overview" && <Overview c={c} tags={tags} hidden={hidden} stats={stats} />}
      {tab === "orders" && <Orders list={customerOrders(c.id)} />}
      {tab === "payments" && <Payments list={customerOrders(c.id)} />}
      {tab === "returns" && <Returns list={customerReturns(c.id)} />}
      {tab === "wallet" && <Wallet w={wallet} c={c} hidden={hidden} canEdit={can(me.role, "refund")} />}
      {tab === "notes" && <Notes list={customerNotes(c.id)} hidden={hidden} owner={owner} />}
    </>
  );
}

function Overview({ c, tags, hidden, stats }) {
  const recent = all("SELECT user_name, action, detail, created_at FROM activity_log WHERE area = 'Customers' AND detail LIKE ? ORDER BY id DESC LIMIT 8", `%(ID ${c.id})%`);
  return (
    <>
      <div className="card pad">
        <h3 style={{ marginTop: 0 }}>Tags</h3>
        <div className="cu-tags">
          {tags.length === 0 && <span className="mut">No tags yet.</span>}
          {tags.map((t) => (
            <span key={t} className="cu-tag">{t}
              <form action={removeTag}>{hidden}<input type="hidden" name="tag" value={t} /><button aria-label={`Remove tag ${t}`}>×</button></form>
            </span>
          ))}
        </div>
        <form action={addTag} className="cu-row" style={{ marginTop: 10 }}>
          {hidden}
          <input name="tag" list="cu-sug" maxLength={20} placeholder="Add a tag, e.g. VIP" required />
          <datalist id="cu-sug">{SUGGEST_TAGS.map((t) => <option key={t} value={t} />)}</datalist>
          <button className="btn a s">Add tag</button>
        </form>
      </div>
      <div className="card pad">
        <h3 style={{ marginTop: 0 }}>Summary</h3>
        <p className="mut" style={{ margin: 0 }}>{stats.orders} order{stats.orders === 1 ? "" : "s"} ({stats.cod} Cash on Delivery) · {stats.returns} return{stats.returns === 1 ? "" : "s"}{stats.last_at ? ` · last order on ${fmtDate(stats.last_at)}` : ""}</p>
      </div>
      <div className="card pad">
        <h3 style={{ marginTop: 0 }}>Recent changes to this customer</h3>
        {recent.length === 0 ? <p className="mut" style={{ margin: 0 }}>Nothing changed in the last 30 days.</p> : recent.map((r, i) => (
          <div className="cu-note" key={i}><b>{r.action}</b> <span className="mut" style={{ fontSize: 12 }}>· {r.user_name} · {fmtDateTime(r.created_at)}</span><p className="mut" style={{ fontSize: 12.5 }}>{r.detail}</p></div>
        ))}
      </div>
    </>
  );
}

const Empty = ({ t }) => <div className="card pad"><p className="mut" style={{ margin: 0 }}>{t}</p></div>;

function Orders({ list }) {
  if (!list.length) return <Empty t="No orders yet." />;
  return (
    <div className="card tw"><table>
      <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
      <tbody>{list.map((o) => (
        <tr key={o.id}>
          <td><Link href={`/seller/orders/${o.order_no}`} style={{ textDecoration: "underline" }}>{o.order_no}</Link></td>
          <td>{fmtDate(o.created_at)}</td><td>{inr(o.total)}</td>
          <td><span className={"tag " + statusClass(o.status)}>{o.status}</span></td>
          <td>{o.pay_method} · {o.pay_status}</td>
        </tr>))}
      </tbody></table></div>
  );
}

function Payments({ list }) {
  if (!list.length) return <Empty t="No payments yet." />;
  return (
    <div className="card tw"><table>
      <thead><tr><th>Order</th><th>Date</th><th>Method</th><th>Amount</th><th>Payment status</th><th>Razorpay IDs</th></tr></thead>
      <tbody>{list.map((o) => (
        <tr key={o.id}>
          <td><Link href={`/seller/orders/${o.order_no}`} style={{ textDecoration: "underline" }}>{o.order_no}</Link></td>
          <td>{fmtDate(o.created_at)}</td><td>{o.pay_method}</td><td>{inr(o.total)}</td>
          <td><span className={"tag " + (o.pay_status === "Paid" || o.pay_status === "Refunded" ? "g" : /Refund/.test(o.pay_status) ? "y" : "")}>{o.pay_status}</span></td>
          <td style={{ fontSize: 11, wordBreak: "break-all" }}>{o.razorpay_payment_id || "-"}{o.razorpay_refund_id ? <><br />refund: {o.razorpay_refund_id}</> : null}</td>
        </tr>))}
      </tbody></table></div>
  );
}

function Returns({ list }) {
  if (!list.length) return <Empty t="No returns." />;
  return (
    <div className="card tw"><table>
      <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Reason</th></tr></thead>
      <tbody>{list.map((r) => (
        <tr key={r.id}>
          <td><Link href={`/seller/orders/${r.order_no}`} style={{ textDecoration: "underline" }}>{r.order_no}</Link></td>
          <td>{fmtDate(r.created_at)}</td>
          <td><span className="tag">{r.status}</span>{r.stage ? <><br /><small className="mut">{r.stage}</small></> : null}</td>
          <td style={{ wordBreak: "break-word" }}>{r.reason || "-"}</td>
        </tr>))}
      </tbody></table></div>
  );
}

function Wallet({ w, hidden, canEdit }) {
  return (
    <>
      <p className="cu-block" style={{ marginTop: 0, marginBottom: 12 }}>Wallet is still being built. This is the credit and debit ledger. Checkout does not use it yet.</p>
      {w.rows.length === 0 ? <Empty t="No wallet entries yet." /> : (
        <div className="card tw"><table>
          <thead><tr><th>Date</th><th>Reason</th><th>By</th><th>Amount</th></tr></thead>
          <tbody>{w.rows.map((r) => (
            <tr key={r.id}><td>{fmtDateTime(r.created_at)}</td><td style={{ wordBreak: "break-word" }}>{r.reason}{r.order_no ? ` (${r.order_no})` : ""}</td><td>{r.by_name || "-"}</td>
              <td className={r.amount > 0 ? "pos" : "neg"}><b>{r.amount > 0 ? "+" : "−"}{inr(Math.abs(r.amount))}</b></td></tr>))}
          </tbody></table></div>
      )}
      {canEdit && (
        <form action={adjustWallet} className="card pad">
          {hidden}
          <h3 style={{ marginTop: 0 }}>Add or deduct credit</h3>
          <div className="cu-row">
            <input name="amount" type="number" step="1" placeholder="Amount, e.g. 200 or -100" required style={{ flex: "0 1 190px" }} />
            <input name="reason" placeholder="Reason (required)" maxLength={120} required />
            <Confirm className="btn a s" message="Save this wallet entry?">Save</Confirm>
          </div>
        </form>
      )}
    </>
  );
}

function Notes({ list, hidden, owner }) {
  return (
    <>
      <form action={addNote} className="card pad">
        {hidden}
        <p className="mut" style={{ margin: "0 0 8px", fontSize: 12.5 }}>Private notes. The customer never sees them.</p>
        <textarea name="note" rows={2} maxLength={500} placeholder="Write a note…" required style={{ width: "100%" }} />
        <p style={{ margin: "8px 0 0" }}><button className="btn a s">Add note</button></p>
      </form>
      {list.length === 0 ? <Empty t="No notes yet." /> : (
        <div className="card pad">
          {list.map((n) => (
            <div className="cu-note" key={n.id}>
              <b>{n.author_name || "-"}</b> <span className="mut" style={{ fontSize: 12 }}>· {fmtDateTime(n.created_at)}</span>
              {owner && <form action={deleteNote} style={{ display: "inline", marginLeft: 8 }}>{hidden}<input type="hidden" name="note_id" value={n.id} /><Confirm className="btn r s" message="Delete this note?">Delete</Confirm></form>}
              <p>{n.note}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

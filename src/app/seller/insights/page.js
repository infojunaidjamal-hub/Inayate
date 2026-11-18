import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { insRange, overview, productsTable, productDetail, eventsTable, categoriesList, liveData, RANGE_DAYS } from "@/lib/insights";
import { EVENTS, EVENT_INFO } from "@/lib/track";
import { OrdersLine, LiveActivity } from "./InsightsClient";
import "./insights.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights – Seller Panel" };

const TABS = [["overview", "Overview"], ["products", "Product performance"], ["events", "Events"]];
const num = (n) => Math.round(n || 0).toLocaleString("en-IN");
const inr = (n) => "₹" + num(n);
const pc = (v) => (v == null ? "–" : (v * 100).toFixed(1) + "%");
const g = (sp, k) => String(Array.isArray(sp[k]) ? sp[k][0] : sp[k] ?? "").trim();

function Delta({ d }) {
  if (d == null) return null;
  return <span className={`in-dl ${d >= 0 ? "in-up" : "in-dn"}`}>{d >= 0 ? "+" : ""}{(d * 100).toFixed(1)}% </span>;
}

function Funnel({ steps, note }) {
  const top = Math.max(1, steps[0][1]);
  let worst = 1, wi = 1;
  steps.forEach(([, v], i) => { if (i && steps[i - 1][1] > 0 && v <= steps[i - 1][1] && v / steps[i - 1][1] < worst) { worst = v / steps[i - 1][1]; wi = i; } });
  return (
    <div className="in-fn">
      {steps.map(([name, v], i) => (
        <div key={name}>
          <p><span>{name}</span><span>{num(v)}{i && steps[i - 1][1] > 0 && v <= steps[i - 1][1] ? ` · ${pc(v / steps[i - 1][1])} of previous` : ""}</span></p>
          <span className="in-bar"><i style={{ width: `${Math.min(100, Math.max(v ? 3 : 0, (v / top) * 100))}%` }} /></span>
        </div>
      ))}
      {note && steps[0][1] > 0 && worst < 1 && <p className="in-note">Biggest drop-off: {steps[wi - 1][0].toLowerCase()} to {steps[wi][0].toLowerCase()} ({pc(1 - worst)} leave).</p>}
    </div>
  );
}

function Donut({ cod, prepaid }) {
  const t = cod + prepaid, r = 52, c = 2 * Math.PI * r, share = t ? cod / t : 0;
  return (
    <>
      <svg viewBox="0 0 150 150" style={{ maxWidth: 170, margin: "4px auto", display: "block" }} role="img" aria-label={`${Math.round(share * 100)}% COD, ${100 - Math.round(share * 100)}% prepaid`}>
        <circle cx="75" cy="75" r={r} fill="none" stroke="#cfc8f0" strokeWidth="20" />
        {t > 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#f27d62" strokeWidth="20" strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 75 75)" />}
        <text x="75" y="80" textAnchor="middle" fontSize="20" fontFamily="Playfair Display,serif" fill="currentColor">{t ? Math.round(share * 100) + "%" : "–"}</text>
      </svg>
      <div className="in-legend"><span style={{ "--c": "#f27d62" }}>COD {num(cod)}</span><span style={{ "--c": "#cfc8f0" }}>Prepaid {num(prepaid)}</span></div>
    </>
  );
}

export default async function Insights({ searchParams }) {
  await requirePerm("insights");
  const sp = await searchParams;
  const r = insRange(sp);
  const tab = TABS.some(([k]) => k === g(sp, "tab")) ? g(sp, "tab") : "overview";
  const q = g(sp, "q"), cat = g(sp, "cat"), sort = ["orders", "revenue", "conv", "views"].includes(g(sp, "sort")) ? g(sp, "sort") : "orders";
  const href = (extra = {}) => {
    const p = new URLSearchParams({ tab, range: String(r.days), ...(q ? { q } : {}), ...(cat ? { cat } : {}), sort, ...extra });
    return "?" + p.toString();
  };
  const exportQs = new URLSearchParams({ range: String(r.days), ...(q ? { q } : {}), ...(cat ? { cat } : {}), sort }).toString();

  const o = tab === "overview" ? overview(r) : null;
  const rows = tab === "products" ? productsTable(r, { q, cat, sort }) : [];
  const sel = tab === "products" ? productDetail(r, g(sp, "p") || rows[0]?.id) : null;
  const ev = tab === "events" ? eventsTable(r) : null;
  const cats = tab === "products" ? categoriesList() : [];
  const k = o?.kpis;

  return (
    <>
      <div className="in-top">
        <div><h2>Insights</h2><p className="mut">See what shoppers view, add to cart and buy.</p></div>
        <div className="in-tools">
          <div className="in-seg" role="group" aria-label="Date range">
            {RANGE_DAYS.map((d) => <Link key={d} href={href({ range: String(d), p: "" })} className={d === r.days ? "on" : ""}>Last {d} days</Link>)}
          </div>
          <a className="btn a s" href={`/seller/insights/export?${exportQs}`}>Export to Excel</a>
        </div>
      </div>
      <div className="in-tabs" role="tablist">
        {TABS.map(([key, name]) => <Link key={key} href={href({ tab: key, p: "" })} className={key === tab ? "on" : ""}>{name}</Link>)}
      </div>

      {tab === "overview" && o && (
        <>
          {!o.anyEvents && <p className="in-empty">Shopper events (views, add to cart, checkout) start appearing once shoppers visit the store after this update. Orders, revenue, returns and cities already use your real orders.</p>}
          <div className="in-kpis">
            <div className="in-card in-k"><small>Orders</small><b>{num(k.orders.v)}</b><Delta d={k.orders.d} /><i>vs previous {r.days} days</i></div>
            <div className="in-card in-k"><small>Revenue</small><b>{inr(k.revenue.v)}</b><Delta d={k.revenue.d} /><i>vs previous {r.days} days</i></div>
            <div className="in-card in-k"><small>Conversion</small><b>{pc(k.conv.v)}</b><Delta d={k.conv.d} /><i>orders per product view</i></div>
            <div className="in-card in-k"><small>Return rate</small><b>{pc(k.ret.v)}</b><i>{k.ret.b ? `${k.ret.a} returns / ${k.ret.b} delivered` : "no deliveries yet"}</i></div>
            <div className="in-card in-k"><small>RTO rate</small><b>{pc(k.rto.v)}</b><i>{k.rto.b ? `${k.rto.a} returned / ${k.rto.b} shipped` : "nothing shipped yet"}</i></div>
            <div className="in-card in-k"><small>NDR success</small><b>{pc(k.ndr.v)}</b><i>{k.ndr.b ? `${k.ndr.a} delivered / ${k.ndr.b} after a failed try` : "no failed deliveries yet"}</i></div>
          </div>
          <div className="in-g2">
            <div className="in-card"><h3>Orders per day</h3><OrdersLine points={o.daily} /></div>
            <div className="in-card"><h3>COD and prepaid</h3><p className="in-sub">Share of orders by payment type</p><Donut cod={o.pay.cod} prepaid={o.pay.prepaid} /></div>
          </div>
          <div className="in-g3">
            <div className="in-card"><h3>City-wise orders</h3><p className="in-sub">Top cities in this period</p>
              <div className="in-bars">
                {o.cities.length === 0 && <p className="mut">No orders in this period.</p>}
                {o.cities.map(([city, n]) => <div key={city}><span>{city}</span><span className="in-bar"><i style={{ width: `${(n / o.cities[0][1]) * 100}%` }} /></span><b style={{ fontWeight: 500 }}>{num(n)}</b></div>)}
              </div>
            </div>
            <div className="in-card"><h3>Store funnel</h3><p className="in-sub">From product view to order</p><Funnel steps={o.funnel} /></div>
          </div>
          <p className="in-note">Orders do not include cancelled or unpaid orders. Revenue also leaves out refunded and returned-to-origin orders. Checkout counts one per visit.</p>
        </>
      )}

      {tab === "products" && (
        <>
          <form className="in-filters" action="/seller/insights">
            <input type="hidden" name="tab" value="products" /><input type="hidden" name="range" value={r.days} />
            <input type="search" name="q" defaultValue={q} placeholder="Search name or SKU" aria-label="Search product" />
            <select name="cat" defaultValue={cat} aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
            <select name="sort" defaultValue={sort} aria-label="Sort"><option value="orders">Top sellers</option><option value="revenue">Revenue</option><option value="conv">Conversion</option><option value="views">Views</option></select>
            <button className="btn o s">Apply</button><span className="in-sub" style={{ margin: 0 }}>Last {r.days} days</span>
          </form>
          <div className="in-card in-wrap">
            <table className="in-table">
              <thead><tr><th>Product</th><th>Views</th><th>Add to cart</th><th>Checkout</th><th>Orders</th><th>Conversion</th><th>Revenue</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--mut)" }}>No products match. Clear the filters.</td></tr>}
                {rows.map((p, i) => (
                  <tr key={p.id} className={sel?.id === p.id ? "on" : ""}>
                    <td><Link href={href({ p: String(p.id) })}>{i < 3 && sort === "orders" && p.orders > 0 ? "⭐ " : ""}{p.name}</Link><small>{p.sku} · {p.category}{p.status !== "Active" ? " · Draft" : ""}</small></td>
                    <td>{num(p.views)}</td><td>{num(p.adds)}</td><td>{num(p.checkouts)}</td><td>{num(p.orders)}</td><td>{pc(p.conv)}</td><td>{inr(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sel && (
            <div className="in-card in-detail">
              <h3>{sel.name}</h3>
              <p className="in-sub">Funnel for the last {r.days} days. Tap another product above to compare. Impressions: {num(sel.imps)}.</p>
              <Funnel note steps={[["Viewed", sel.views], ["Added to cart", sel.adds], ["Started checkout", sel.checkouts], ["Ordered", sel.orders]]} />
              {sel.variants.length > 0 && <p className="in-note">Items sold by variant: {sel.variants.map((v) => `${v.label} (${v.qty})`).join(", ")}.</p>}
            </div>
          )}
        </>
      )}

      {tab === "events" && ev && (
        <>
          <div className="in-card">
            <h3>Live activity</h3>
            <p className="in-sub">What shoppers did on the store in the last 12 hours. Each bar is one hour. Tap a name to hide or show it.</p>
            <LiveActivity initial={liveData()} />
          </div>
          <div className="in-card" style={{ marginTop: 12 }}>
            <h3>Tracked events</h3>
            <p className="in-sub">Counts for the last {r.days} days. Collected without names or phone numbers. Each visitor gets a random id.</p>
            <div className="in-wrap">
              <table className="in-table" style={{ minWidth: 420 }}>
                <thead><tr><th>Event</th><th style={{ textAlign: "left" }}>What it means</th><th>Count</th></tr></thead>
                <tbody>{EVENTS.map((e) => <tr key={e}><td><span className="in-tag">{e}</span></td><td style={{ textAlign: "left", whiteSpace: "normal" }}>{EVENT_INFO[e]}</td><td>{num(ev[e])}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

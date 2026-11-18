import { requirePerm } from "@/lib/auth";
import { REPORTS, RANGES, ORDER_STATUSES, PAY_STATUSES, parseFilters, filterQs, countReport } from "@/lib/reports";
import "./reports.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports & Excel – Seller Panel" };

export default async function ReportsPage({ searchParams }) {
  await requirePerm("reports");
  const f = parseFilters(await searchParams);

  return (
    <>
      <h1 style={{ margin: 0 }}>Reports &amp; Excel</h1>
      <p className="mut" style={{ margin: "4px 0 18px" }}>Orders, customers, returns aur payments ki report Excel (.xlsx) ya CSV mein download karein.</p>

      <h2 className="sp-h">Filter chunein</h2>
      <form className="rp-filters" action="/seller/reports">
        <label>Date
          <select name="range" defaultValue={f.range}>{RANGES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        </label>
        <label>Se (sirf &quot;Apni date&quot; mein)<input type="date" name="from" defaultValue={f.rawFrom} /></label>
        <label>Tak<input type="date" name="to" defaultValue={f.rawTo} /></label>
        <label>Order status
          <select name="status" defaultValue={f.status}><option value="">Sab</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label>Payment status
          <select name="pay" defaultValue={f.pay}><option value="">Sab</option>{PAY_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <button className="btn a">Apply</button>
      </form>
      <p className="rp-note">Chuna hua: <b>{f.label}</b>{f.status ? ` · Order status: ${f.status}` : ""}{f.pay ? ` · Payment: ${f.pay}` : ""}. Har card mein likha hai ki us par kaun-sa filter lagta hai.</p>

      <h2 className="sp-h">Reports download karein</h2>
      <div className="rp-g">
        {REPORTS.map((r) => {
          const n = countReport(r.id, f);
          const off = n === null;
          const qs = (fmt) => `/seller/reports/download?${filterQs(f, { type: r.id, format: fmt })}`;
          return (
            <div key={r.id} className={"rp-card" + (off ? " rp-off" : "")}>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
              <p className="rp-uses">Filter: {r.uses}</p>
              {off ? (
                <p className="rp-count">Is store mein abhi ye data nahi hai.</p>
              ) : (
                <>
                  <p className="rp-count"><b>{n}</b> {n === 1 ? "row" : "rows"}</p>
                  <div className="rp-btns">
                    <a className="x" href={qs("xlsx")}>Excel (.xlsx)</a>
                    <a href={qs("csv")}>CSV</a>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="mut" style={{ fontSize: 13 }}>Samay India (IST) ke hisaab se hai. Order ki date par filter lagta hai. &quot;Order items (GST)&quot; mein GST price ke andar maana gaya hai, isliye final hisaab apne CA se zaroor milayein.</p>
    </>
  );
}

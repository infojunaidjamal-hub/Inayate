import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { can } from "@/lib/perms";
import { activityWhere, areaOf, AREAS, MANAGER_HIDDEN, KEEP_DAYS } from "@/lib/activity";
import { fmtDateTime } from "@/lib/customers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity – Store Admin" };

const PAGE = 50;
const ROLE = { seller: "Owner", manager: "Manager", operator: "Operator" };

// Kisne kya badla. Owner sab dekhta hai, Manager Team / Security / Payments ke alawa sab. Operator ko ye page nahi dikhta.
export default async function Activity({ searchParams }) {
  const me = await requirePerm("activity");
  const sp = await searchParams;
  const q = String(sp.q || "").trim().slice(0, 80);
  const area = AREAS.includes(sp.area) ? sp.area : "";
  const who = String(sp.who || "").slice(0, 60);
  const days = [1, 7, 30].includes(Number(sp.days)) ? Number(sp.days) : KEEP_DAYS;
  const page = Math.max(1, Number(sp.p) || 1);

  const f = { q, area, who, days };
  const { where, params } = activityWhere(me.role, f);
  const total = one(`SELECT COUNT(*) AS c FROM activity_log a WHERE ${where}`, ...params).c;
  const rows = all(`SELECT a.*, u.role AS user_role FROM activity_log a LEFT JOIN users u ON u.id = a.user_id WHERE ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`, ...params, PAGE, (page - 1) * PAGE);

  // Dropdown mein sirf wahi staff / area jo is role ko dikh sakte hain
  const base = activityWhere(me.role, { days: KEEP_DAYS });
  const whoList = all(`SELECT DISTINCT a.user_name FROM activity_log a WHERE ${base.where} ORDER BY a.user_name`, ...base.params).map((r) => r.user_name);
  const areaList = all(`SELECT DISTINCT COALESCE(a.area, 'Other') AS area FROM activity_log a WHERE ${base.where}`, ...base.params).map((r) => r.area);

  const qs = (extra) => { const u = new URLSearchParams({ ...(q && { q }), ...(area && { area }), ...(who && { who }), ...(days !== KEEP_DAYS && { days }), ...extra }); const s = u.toString(); return s ? "?" + s : ""; };
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const owner = me.role === "seller";

  return (
    <>
      <h1 style={{ margin: 0 }}>Activity log</h1>
      <p className="mut" style={{ margin: "4px 0 14px" }}>
        Kisne, kab, kya badla. Sirf pichhle {KEEP_DAYS} din ki entries rehti hain, purani apne aap hat jaati hain.
        {!owner && <> {MANAGER_HIDDEN.join(", ")} ki entries sirf Owner ko dikhti hain.</>}
      </p>

      <form className="card pad" method="get" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input name="q" defaultValue={q} placeholder="Search name, action or detail" style={{ flex: "1 1 200px", margin: 0 }} />
        <select name="area" defaultValue={area} style={{ width: "auto", margin: 0 }}>
          <option value="">All areas</option>
          {areaList.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select name="who" defaultValue={who} style={{ width: "auto", margin: 0 }}>
          <option value="">All staff</option>
          {whoList.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select name="days" defaultValue={String(days)} style={{ width: "auto", margin: 0 }}>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value={String(KEEP_DAYS)}>Last {KEEP_DAYS} days</option>
        </select>
        <button className="btn a s">Filter</button>
        {(q || area || who || days !== KEEP_DAYS) && <Link href="/seller/activity" className="btn o s">Clear</Link>}
        {owner && <a className="btn o s" href={`/seller/activity/export${qs({})}`}>Download CSV</a>}
      </form>

      <p className="mut" style={{ margin: "0 0 8px", fontSize: 13 }}>{total} entr{total === 1 ? "y" : "ies"}</p>
      {rows.length === 0 ? <div className="card pad"><p className="mut" style={{ margin: 0 }}>Koi entry nahi mili.</p></div> : (
        <div className="card tw">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Area</th><th>What changed</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mut" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.created_at)}</td>
                  <td><b>{r.user_name}</b>{r.user_role && <><br /><span className="mut" style={{ fontSize: 12 }}>{ROLE[r.user_role] || r.user_role}</span></>}</td>
                  <td><span className="tag">{r.area || areaOf(r.action)}</span></td>
                  <td style={{ wordBreak: "break-word" }}>{r.action}{r.detail && <><br /><span className="mut" style={{ fontSize: 12.5 }}>{r.detail}</span></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="tabs" style={{ marginTop: 12 }}>
          {page > 1 && <Link href={`/seller/activity${qs({ p: page - 1 })}`}>← Newer</Link>}
          <span className="mut" style={{ alignSelf: "center" }}>Page {page} of {pages}</span>
          {page < pages && <Link href={`/seller/activity${qs({ p: page + 1 })}`}>Older →</Link>}
        </div>
      )}
    </>
  );
}

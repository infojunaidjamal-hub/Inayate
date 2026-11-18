import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SUGGEST_TAGS } from "@/lib/customers";
import "./customers.css";
import { hrefWith } from "@/lib/qs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers – Seller Panel" };

// Customers ki list. Naam par click karke poora Customer 360 page khulta hai (edit, block, tags, notes, history).
export default async function Customers({ searchParams }) {
  await requirePerm("customers");
  const sp = await searchParams;
  const q = String(sp.q || "").trim().slice(0, 60);
  const tag = String(sp.tag || "").slice(0, 20);
  const st = sp.st === "blocked" ? "blocked" : sp.st === "active" ? "active" : "";
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const where = ["u.role = 'buyer'", "(u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)"];
  const params = [like, like, like];
  if (tag) where.push("EXISTS (SELECT 1 FROM customer_tags t WHERE t.user_id = u.id AND t.tag = ?)"), params.push(tag);
  if (st) where.push(st === "blocked" ? "u.disabled = 1" : "COALESCE(u.disabled, 0) = 0");
  const list = all(
    `SELECT u.id, u.name, u.mobile, u.email, u.created_at, u.disabled,
       (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
       (SELECT COALESCE(SUM(total), 0) FROM orders o WHERE o.user_id = u.id AND o.pay_status = 'Paid' AND o.status NOT IN ('Cancelled','Refunded')) AS spent,
       (SELECT group_concat(tag, '|') FROM customer_tags t WHERE t.user_id = u.id) AS tags
     FROM users u WHERE ${where.join(" AND ")} ORDER BY u.id DESC LIMIT 200`,
    ...params
  );
  const allTags = all("SELECT tag, COUNT(*) AS n FROM customer_tags GROUP BY tag ORDER BY n DESC, tag LIMIT 12").map((r) => r.tag);
  const chips = [...new Set([...SUGGEST_TAGS, ...allTags])].slice(0, 12);
  const href = hrefWith("/seller/customers", { q, tag, st });

  return (
    <>
      <h2>Customers ({list.length})</h2>
      <form className="two" style={{ gridTemplateColumns: "2fr auto" }}>
        <input name="q" placeholder="Search by name, mobile or email" defaultValue={q} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        {st && <input type="hidden" name="st" value={st} />}
        <button className="btn" style={{ height: 40 }}>Search</button>
      </form>
      <div className="tabs">
        <Link href={href({ st: "" })} className={!st ? "on" : ""}>All</Link>
        <Link href={href({ st: "active" })} className={st === "active" ? "on" : ""}>Active</Link>
        <Link href={href({ st: "blocked" })} className={st === "blocked" ? "on" : ""}>Blocked</Link>
        <span className="mut" style={{ alignSelf: "center", fontSize: 12 }}>Tag:</span>
        {chips.map((t) => <Link key={t} href={href({ tag: tag === t ? "" : t })} className={tag === t ? "on" : ""}>{t}</Link>)}
      </div>
      <div className="tw">
        <table>
          <thead><tr><th>Name</th><th>Mobile</th><th>Tags</th><th>Joined</th><th>Orders</th><th>Total spent</th><th>Status</th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><Link href={`/seller/customers/${u.id}`} style={{ fontWeight: 500, textDecoration: "underline" }}>{u.name}</Link>{u.email ? <><br /><small className="mut">{u.email}</small></> : null}</td>
                <td>{u.mobile}</td>
                <td>{u.tags ? u.tags.split("|").map((t) => <span key={t} className="tag" style={{ marginRight: 4 }}>{t}</span>) : <span className="mut">-</span>}</td>
                <td>{fmtDate(u.created_at)}</td>
                <td>{u.orders}</td>
                <td>{inr(u.spent)}</td>
                <td>{u.disabled ? <span className="tag x">Blocked</span> : <span className="tag g">Active</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && <p className="mut">No customer found.</p>}
    </>
  );
}

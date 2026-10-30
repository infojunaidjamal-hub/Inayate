import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers – Seller Panel" };

export default async function Customers({ searchParams }) {
  await requireSeller();
  const { q = "" } = await searchParams;
  const like = `%${String(q).trim()}%`;
  const list = all(
    `SELECT u.id, u.name, u.mobile, u.email, u.created_at,
       (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
       (SELECT COALESCE(SUM(total), 0) FROM orders o WHERE o.user_id = u.id AND o.pay_status = 'Paid' AND o.status NOT IN ('Cancelled','Refunded')) AS spent
     FROM users u WHERE u.role = 'buyer' AND (u.name LIKE ? OR u.mobile LIKE ?) ORDER BY u.id DESC LIMIT 200`,
    like, like
  );
  return (
    <>
      <h2>Customers ({list.length})</h2>
      <form className="two" style={{ gridTemplateColumns: "2fr auto" }}>
        <input name="q" placeholder="Naam ya mobile number se dhundhein" defaultValue={q} />
        <button className="btn" style={{ height: 40 }}>Search</button>
      </form>
      <div className="tw">
        <table>
          <thead><tr><th>Naam</th><th>Mobile</th><th>Jude</th><th>Orders</th><th>Kul kharid</th><th></th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.email ? <><br /><small className="mut">{u.email}</small></> : null}</td>
                <td>{u.mobile}</td>
                <td>{fmtDate(u.created_at)}</td>
                <td>{u.orders > 0 ? <Link href={`/seller/orders?q=${u.mobile}`} style={{ textDecoration: "underline" }}>{u.orders}</Link> : 0}</td>
                <td>{inr(u.spent)}</td>
                <td style={{ minWidth: 190 }}><ResetForm id={u.id} mobile={u.mobile} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && <p className="mut">Koi customer nahi mila.</p>}
      <p className="mut" style={{ fontSize: 12 }}>Customer password bhool jaye to yahan se temporary password banao aur WhatsApp par bhejo. Customer baad mein Account &gt; Password badlein se apna password rakh sakta hai.</p>
    </>
  );
}

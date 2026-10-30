import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { all, inr } from "@/lib/db";
import { statusClass, fmtDate } from "@/lib/format";
import SellerNav from "@/components/SellerNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders – Seller Panel" };

const FILTERS = ["All", "Placed", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];

export default async function SellerOrders({ searchParams }) {
  await requireSeller();
  const { status = "All" } = await searchParams;
  const orders = FILTERS.includes(status) && status !== "All"
    ? all("SELECT * FROM orders WHERE status = ? ORDER BY id DESC", status)
    : all("SELECT * FROM orders ORDER BY id DESC");
  return (
    <>
      <SellerNav />
      <h2>Orders</h2>
      <div className="tabs">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "All" ? "/seller/orders" : `/seller/orders?status=${f}`} className={f === status ? "on" : ""}>{f}</Link>
        ))}
      </div>
      {orders.length === 0 && <p className="mut">Is status ka koi order nahi hai.</p>}
      {orders.map((o) => (
        <Link key={o.id} href={`/seller/orders/${o.order_no}`} className="row" style={{ color: "inherit" }}>
          <span><b>{o.order_no}</b> <span className="mut">· {o.ship_name} · {fmtDate(o.created_at)}</span></span>
          <span>
            <span className={`tag ${statusClass(o.status)}`}>{o.status}</span>{" "}
            <span className="tag y">{o.pay_method}: {o.pay_status}</span>
            <b style={{ marginLeft: 8 }}>{inr(o.total)}</b>
          </span>
        </Link>
      ))}
    </>
  );
}

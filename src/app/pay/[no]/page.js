import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { one, inr } from "@/lib/db";
import PayButton from "./PayButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment – Inayate Bags" };

export default async function PayPage({ params }) {
  const { no } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "buyer") redirect("/seller");
  const o = one("SELECT * FROM orders WHERE order_no = ? AND user_id = ?", no, user.id);
  if (!o) notFound();
  if (o.status !== "Awaiting Payment") redirect("/order/" + no);

  return (
    <div className="card pad" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Payment</h2>
      <p>Order number: <b>{o.order_no}</b></p>
      <p style={{ fontSize: 22 }}>Total: <b>{inr(o.total)}</b></p>
      <p className="mut">UPI, Card ya Netbanking se payment karein. Payment hote hi order confirm ho jayega.</p>
      <PayButton orderNo={o.order_no} name={user.name} mobile={user.mobile} email={user.email} />
    </div>
  );
}

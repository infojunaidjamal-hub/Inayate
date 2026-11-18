import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { STAFF } from "@/lib/perms";
import { one } from "@/lib/db";
import { ensureInvoice, business } from "@/lib/invoices";
import InvoiceSheet from "@/components/InvoiceSheet";
import PrintBtn from "@/components/PrintBtn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default async function InvoicePage({ params }) {
  const { no } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/order/${no}/invoice`);
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o || (o.user_id !== user.id && !STAFF.includes(user.role))) notFound();
  const inv = ensureInvoice(o.id);
  if (!inv) {
    return (
      <div className="card pad" style={{ maxWidth: 560, margin: "20px auto" }}>
        <h2 style={{ marginTop: 0 }}>Invoice abhi ready nahi hai</h2>
        <p className="mut">Invoice order pack hote hi ban jata hai. Thodi der baad dobara dekhein.</p>
        <Link href={`/order/${no}`} className="btn o">← Order par wapas</Link>
      </div>
    );
  }
  return (
    <>
      <div className="inv-bar"><PrintBtn /><Link href={`/order/${no}`} className="btn o" style={{ minHeight: 44 }}>← Order</Link></div>
      <InvoiceSheet kind="invoice" doc={inv} order={o} biz={business()} />
    </>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { STAFF } from "@/lib/perms";
import { one } from "@/lib/db";
import { business } from "@/lib/invoices";
import InvoiceSheet from "@/components/InvoiceSheet";
import PrintBtn from "@/components/PrintBtn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Credit note", robots: { index: false, follow: false } };

export default async function CreditNotePage({ params }) {
  const { no, id } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/order/${no}/credit-note/${id}`);
  const o = one("SELECT * FROM orders WHERE order_no = ?", no);
  if (!o || (o.user_id !== user.id && !STAFF.includes(user.role))) notFound();
  const row = one("SELECT * FROM credit_notes WHERE id = ? AND order_id = ?", Number(id), o.id);
  if (!row) notFound();
  return (
    <>
      <div className="inv-bar"><PrintBtn /><Link href={`/order/${no}`} className="btn o" style={{ minHeight: 44 }}>← Order</Link></div>
      <InvoiceSheet kind="credit" doc={{ ...row, data: JSON.parse(row.data) }} order={o} biz={business()} />
    </>
  );
}

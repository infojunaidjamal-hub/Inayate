import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { business } from "@/lib/invoices";
import InvoiceSheet from "@/components/InvoiceSheet";
import PrintBtn from "@/components/PrintBtn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print invoices", robots: { index: false, follow: false } };

const ids = (v) => String(v || "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);

// /seller/invoices/print?ids=1,2,3   (invoices)    /seller/invoices/print?cn=4,5   (credit notes)
export default async function PrintInvoices({ searchParams }) {
  await requirePerm("invoices");
  const sp = await searchParams;
  const biz = business();
  const inv = ids(sp.ids).map((id) => one("SELECT * FROM invoices WHERE id = ?", id)).filter(Boolean);
  const cns = ids(sp.cn).map((id) => one("SELECT * FROM credit_notes WHERE id = ?", id)).filter(Boolean);
  const order = (id) => one("SELECT * FROM orders WHERE id = ?", id);
  const parse = (r) => ({ ...r, data: JSON.parse(r.data) });
  return (
    <>
      <div className="inv-bar">
        <PrintBtn label={`Print ${inv.length + cns.length} page${inv.length + cns.length === 1 ? "" : "s"}`} />
        <Link href="/seller/invoices" className="btn o" style={{ minHeight: 44 }}>← Invoices</Link>
      </div>
      {inv.length + cns.length === 0 && <p className="mut">Kuch chuna nahi gaya.</p>}
      {inv.map((r) => <InvoiceSheet key={`i${r.id}`} kind="invoice" doc={parse(r)} order={order(r.order_id)} biz={biz} />)}
      {cns.map((r) => <InvoiceSheet key={`c${r.id}`} kind="credit" doc={parse(r)} order={order(r.order_id)} biz={biz} />)}
    </>
  );
}

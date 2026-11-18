import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import BulkUpload from "./BulkUpload";
import "./bulk.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulk upload (Excel) – Seller Panel" };

export default async function BulkPage() {
  await requirePerm("products");
  return (
    <>
      <h1 style={{ margin: 0 }}>Bulk upload (Excel)</h1>
      <p className="mut" style={{ margin: "4px 0 18px" }}>Naye products ek saath banayein ya purane products ka price, stock waghairah Excel se badlein.</p>

      <div className="bk-steps">
        <div className="bk-card">
          <h3>Step 1: Template download karein</h3>
          <p>Naye products ke liye khali template lein. Purane badalne hon to &quot;Abhi ke products&quot; lein, Excel mein badlein aur wapas upload karein. Template mein Instructions sheet bhi hai.</p>
          <div className="bk-btns">
            <a className="p" href="/seller/bulk/template?mode=new">Khali template (.xlsx)</a>
            <a href="/seller/bulk/template?mode=current">Abhi ke products (.xlsx)</a>
          </div>
        </div>
        <div className="bk-card">
          <h3>Niyam (chhote mein)</h3>
          <p style={{ margin: 0 }}>
            SKU se product pehchana jata hai: SKU maujood hai to update, nahi hai to naya. Update mein khali cell ka matlab purani value rehti hai.
            Naye product mein Name aur Price zaroori hain, aur Status khali ho to Draft banta hai. Ek baar mein 500 rows tak.
            Photos Excel se nahi judti, wo <Link href="/seller/products" style={{ textDecoration: "underline" }}>Products</Link> mein edit karke lagayein.
          </p>
        </div>
      </div>

      <BulkUpload />
    </>
  );
}

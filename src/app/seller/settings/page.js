import { requirePerm } from "@/lib/auth";
import { business, GSTIN_RE } from "@/lib/invoices";
import { saveBusinessSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business & GST – Seller Panel" };

const STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

export default async function Settings({ searchParams }) {
  await requirePerm("settings");
  const { err, ok } = await searchParams;
  const b = business();
  return (
    <>
      <h2>Business &amp; GST</h2>
      <p className="mut" style={{ marginTop: -8 }}>Ye jaankari GST invoice aur credit note par chhapti hai.</p>
      {err && <p className="err" role="alert">{err}</p>}
      {ok && <p className="ok" role="status">{ok}</p>}
      {!GSTIN_RE.test(b.gstin || "") && <p className="err">GSTIN abhi {b.gstin ? "sahi nahi hai" : "nahi daala gaya"}. Invoice par seller ka GSTIN dikhna zaroori hota hai.</p>}
      <form action={saveBusinessSettings} className="card pad" style={{ maxWidth: 640 }}>
        <label htmlFor="bn">Store ka naam</label>
        <input id="bn" name="name" defaultValue={b.name} required maxLength={80} />
        <label htmlFor="bl">Business ka poora (legal) naam</label>
        <input id="bl" name="legal" defaultValue={b.legal} required maxLength={100} />
        <label htmlFor="bg">GSTIN (15 akshar)</label>
        <input id="bg" name="gstin" defaultValue={b.gstin} maxLength={15} placeholder="24ABCDE1234F1Z5" autoCapitalize="characters" />
        <label htmlFor="ba">Pata (invoice par)</label>
        <textarea id="ba" name="address" rows={3} defaultValue={b.address} required maxLength={250} />
        <label htmlFor="bs">State</label>
        <input id="bs" name="state" list="states" defaultValue={b.state} required />
        <datalist id="states">{STATES.map((s) => <option key={s} value={s} />)}</datalist>
        <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>Buyer ka state yahi ho to CGST + SGST lagta hai, alag ho to IGST.</p>
        <div className="two">
          <div><label htmlFor="bp">Invoice prefix</label><input id="bp" name="prefix" defaultValue={b.prefix} required maxLength={6} autoCapitalize="characters" /></div>
          <div><label htmlFor="bh">Default HSN code</label><input id="bh" name="defaultHsn" defaultValue={b.defaultHsn} inputMode="numeric" maxLength={8} required /></div>
        </div>
        <p className="mut" style={{ fontSize: 12 }}>Invoice number aisa banta hai: <b>{b.prefix}/26-27/0001</b> (saal April se March). Prefix badalne par sirf naye invoice par asar padta hai. Jis product mein HSN nahi likha, usme default HSN lagta hai.</p>
        <button className="btn a" style={{ minHeight: 44 }}>Save karein</button>
      </form>
    </>
  );
}

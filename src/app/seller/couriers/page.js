import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { loadPartners, pincodeListExists } from "@/lib/logistics";
import { daysText } from "@/lib/shipMath";
import { partnerToggle, samplePincodes } from "../logistics/actions";
import { AddPartner, RateCard, PincodeUpload, PincodeCheck } from "./Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courier partners – Seller Panel" };

const promise = (p) => {
  const r = Object.values(p.rates);
  if (!r.length) return "-";
  const lo = Math.min(...r.map((x) => x.dmin)), hi = Math.max(...r.map((x) => x.dmax));
  return lo === hi ? `${lo} day${lo > 1 ? "s" : ""}` : `${lo} to ${hi} days`;
};

export default async function Couriers({ searchParams }) {
  await requirePerm("logistics");
  const sp = await searchParams;
  const tab = ["a", "b", "c"].includes(sp.tab) ? sp.tab : "a";
  const partners = loadPartners(false);
  const sel = partners.find((p) => p.id === Number(sp.c)) || partners[0];
  const raw = sel ? one("SELECT * FROM couriers WHERE id = ?", sel.id) : null;
  const counts = Object.fromEntries(all("SELECT courier_id, COUNT(*) c FROM courier_pincodes GROUP BY courier_id").map((r) => [r.courier_id, r.c]));
  const hasList = pincodeListExists();
  const pins = tab === "c" && sel ? all("SELECT * FROM courier_pincodes WHERE courier_id = ? ORDER BY pincode LIMIT 60", sel.id) : [];
  const picker = (t) => (
    <form method="get" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="tab" value={t} />
      <select name="c" defaultValue={sel?.id} style={{ width: 220, margin: 0 }}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className="btn o s">Open</button>
    </form>
  );

  return (
    <>
      <h2>Courier partners</h2>
      <p className="mut" style={{ marginTop: -8 }}>Who ships for you, what they charge, and where they deliver. Rates abhi dummy hain, asli numbers se badal dein.</p>
      <details style={{ margin: "10px 0" }}><summary className="btn a" style={{ display: "inline-block", cursor: "pointer" }}>+ Add partner</summary><div style={{ marginTop: 10 }}><AddPartner /></div></details>
      <p style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["a", "Partners"], ["b", "Rate card"], ["c", "Pincodes"]].map(([t, l]) => (
          <Link key={t} href={`/seller/couriers?tab=${t}${sel ? `&c=${sel.id}` : ""}`} className={`btn ${tab === t ? "a" : "o"} s`}>{l}</Link>
        ))}
      </p>

      {tab === "a" && (
        <div className="card pad" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead><tr><th>Partner</th><th>Mode</th><th>Delivery promise</th><th>COD</th><th>NDR attempts</th><th>Express</th><th>Pincodes</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                  <td><b>{p.name}</b></td><td><span className="tag">Manual</span></td><td>{promise(p)}</td><td>{p.noCod ? "No" : "Yes"}</td><td><b>{p.ndr}</b></td>
                  <td>{p.exp ? "Yes" : "No"}</td><td>{(counts[p.id] || 0).toLocaleString("en-IN")}</td>
                  <td><form action={partnerToggle}><input type="hidden" name="id" value={p.id} /><button className={`tag ${p.active ? "g" : ""}`} style={{ cursor: "pointer", border: 0 }}>{p.active ? "On" : "Off"}</button></form></td>
                  <td><Link className="btn o s" href={`/seller/couriers?tab=b&c=${p.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mut" style={{ fontSize: 12 }}>Mode: sab partners abhi <b>Manual</b> hain (aap tracking ID khud likhte hain). Aggregator (API) baad mein. <b>NDR attempts</b> = partner kitni baar delivery koshish karta hai. <b>Express</b> = ₹199 wale orders le sakta hai.</p>
          <p className="mut" style={{ fontSize: 12 }}>Jab tak kisi bhi partner ki pincode list upload nahi hoti, website sab pincodes par delivery maanti hai aur Express nahi dikhata.</p>
        </div>
      )}

      {tab === "b" && sel && (
        <div className="card pad">
          <div className="row" style={{ border: 0, padding: 0 }}><h3>Rate card · {sel.name}</h3>{picker("b")}</div>
          <RateCard key={sel.id} p={raw} rates={sel.rates} />
        </div>
      )}

      {tab === "c" && sel && (
        <div className="card pad">
          <div className="row" style={{ border: 0, padding: 0, flexWrap: "wrap" }}><h3>Pincodes · {sel.name}</h3>{picker("c")}</div>
          <p className="mut" style={{ fontSize: 12 }}>Columns: Pincode, City, Zone (A to E), COD (yes/no), Prepaid (yes/no). Purani rows update hoti hain, kuch delete nahi hota.</p>
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <a className="btn o s" href="/seller/couriers/template">Download Excel template</a>
            <PincodeUpload id={sel.id} />
          </p>
          {!hasList && (
            <form action={samplePincodes} className="card pad" style={{ background: "#fbeed0", margin: "8px 0" }}>
              Abhi koi pincode list nahi hai (website sab pincodes par delivery maan rahi hai). Sirf test ke liye 11 dummy pincodes load kar sakte hain.
              <b> Dhyan: load karne ke baad sirf wahi 11 pincodes deliverable honge, jab tak aap asli list upload na karein.</b>{" "}
              <button className="btn o s">Load sample pincodes</button>
            </form>
          )}
          <p className="mut" style={{ fontSize: 13 }}>{(counts[sel.id] || 0).toLocaleString("en-IN")} pincodes{(counts[sel.id] || 0) > 60 ? " (pehli 60 dikh rahi hain)" : ""}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%" }}>
              <thead><tr><th>Pincode</th><th>City</th><th>Zone</th><th>COD</th><th>Prepaid</th></tr></thead>
              <tbody>{pins.map((x) => <tr key={x.pincode}><td><b>{x.pincode}</b></td><td>{x.city}</td><td>{x.zone}</td><td>{x.cod && !sel.noCod ? "Yes" : "No"}</td><td>{x.prepaid ? "Yes" : "No"}</td></tr>)}</tbody>
            </table>
          </div>
          <div style={{ maxWidth: 360, marginTop: 12 }}><PincodeCheck id={sel.id} /></div>
        </div>
      )}
    </>
  );
}

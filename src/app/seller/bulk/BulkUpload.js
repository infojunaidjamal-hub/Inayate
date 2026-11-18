"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { previewUpload, applyUpload } from "./actions";

const TAG = { new: ["new", "Naya"], update: ["update", "Update"], same: ["same", "Koi badlav nahi"], error: ["error", "Galti"] };
const show = (v) => (v === "" || v === null || v === undefined ? "khali" : String(v));

export default function BulkUpload() {
  const [n, setN] = useState(0); // Cancel dabane par sab saaf
  return <Flow key={n} reset={() => setN((x) => x + 1)} />;
}

function Flow({ reset }) {
  const [pv, previewAction, previewing] = useActionState(previewUpload, null);
  const [ap, applyAction, applying] = useActionState(applyUpload, null);

  if (ap?.done) {
    const c = ap.counts;
    return (
      <div className="bk-ok" role="status">
        <b>Ho gaya.</b> {c.new} naye product bane, {c.update} update hue{c.error ? `, ${c.error} galat rows chhod di gayi` : ""}{c.same ? `, ${c.same} mein koi badlav nahi tha` : ""}.
        <div className="bk-btns" style={{ marginTop: 10 }}>
          <Link className="bk-btn p" href="/seller/products" style={{ textDecoration: "none" }}>Products dekhein</Link>
          <button type="button" className="bk-btn" onClick={reset}>Aur file upload karein</button>
        </div>
      </div>
    );
  }

  const ready = pv?.counts ? pv.counts.new + pv.counts.update : 0;
  return (
    <>
      <div className="bk-card" style={{ marginBottom: 16 }}>
        <h3>Step 2: File upload karein</h3>
        <form action={previewAction}>
          <input className="bk-file" type="file" name="file" accept=".xlsx,.csv" aria-label="Excel ya CSV file" required />
          <button className="bk-btn p" disabled={previewing}>{previewing ? "Check ho raha hai…" : "File check karein"}</button>
        </form>
        <p className="bk-note" style={{ margin: "10px 0 0" }}>Ye sirf check karega. Kuch bhi tab tak nahi badlega jab tak aap Apply na dabayein.</p>
      </div>

      {pv?.error && <div className="bk-err" role="alert">{pv.error}</div>}
      {ap?.error && <div className="bk-err" role="alert">{ap.error}</div>}

      {pv?.rows && (
        <>
          <h2 className="sp-h">Step 3: Check ka natija ({pv.fileName})</h2>
          <div className="bk-sum">
            <span className="n">Naye: <b>{pv.counts.new}</b></span>
            <span className="u">Update: <b>{pv.counts.update}</b></span>
            <span>Koi badlav nahi: <b>{pv.counts.same}</b></span>
            <span className="e">Galti: <b>{pv.counts.error}</b></span>
          </div>
          {pv.ignored?.length > 0 && <p className="bk-note">In columns ko nazarandaaz kiya gaya (naam pehchane nahi): {pv.ignored.join(", ")}</p>}

          <div className="bk-tw">
            <table>
              <thead><tr><th>Row</th><th>SKU</th><th>Naam</th><th>Natija</th><th>Detail</th></tr></thead>
              <tbody>
                {pv.rows.map((r) => (
                  <tr key={r.rowNum}>
                    <td>{r.rowNum}</td>
                    <td>{r.sku || "—"}</td>
                    <td>{r.name || "—"}</td>
                    <td><span className={`tag ${TAG[r.action][0]}`}>{TAG[r.action][1]}</span></td>
                    <td>
                      {r.action === "new" && r.summary}
                      {r.action === "same" && "Sab kuch pehle jaisa hi hai"}
                      {r.action === "update" && <ul>{r.changes.map((c) => <li key={c.field}>{c.field}: <span className="bk-from">{show(c.from)}</span> → <b>{show(c.to)}</b></li>)}</ul>}
                      {r.errors.length > 0 && <ul>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                      {r.notes.length > 0 && <div className="bk-note">{r.notes.join(". ")}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={applyAction} className="bk-btns">
            <input type="hidden" name="payload" value={pv.payload} />
            <button className="bk-btn p" disabled={applying || ready === 0}>
              {applying ? "Lag raha hai…" : ready ? `Apply karein (${pv.counts.new} naye, ${pv.counts.update} update)` : "Lagane layak koi row nahi"}
            </button>
            <button type="button" className="bk-btn" onClick={reset}>Cancel</button>
          </form>
          {pv.counts.error > 0 && ready > 0 && <p className="bk-note">Galti wali {pv.counts.error} rows chhod di jayengi. Unhe theek karke dobara upload kar sakte hain.</p>}
        </>
      )}
    </>
  );
}

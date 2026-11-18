"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateAddress, deleteAddress, setDefaultAddress } from "../actions";

function AddressCard({ a }) {
  const [editing, setEditing] = useState(false);
  const [s, action, busy] = useActionState(updateAddress, null);
  const [f, setF] = useState({ label: a.label, name: a.name, line: a.line, city: a.city, state: a.state, pincode: a.pincode, makeDefault: false });
  const dlg = useRef(null);
  useEffect(() => { if (s?.ok) setEditing(false); }, [s]);
  const set = (k) => (e) => setF({ ...f, [k]: k === "makeDefault" ? e.target.checked : k === "pincode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value });
  const open = () => { setF({ label: a.label, name: a.name, line: a.line, city: a.city, state: a.state, pincode: a.pincode, makeDefault: false }); setEditing(true); };

  return (
    <div className="card pad" style={{ marginBottom: 12 }}>
      <b>{a.label}</b> {a.is_default ? <span className="tag g">Default</span> : null}
      <p style={{ margin: "6px 0 10px" }}>{a.name}<br />{a.line}, {a.city}, {a.state} {a.pincode}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn o s" style={{ minHeight: 44 }} onClick={editing ? () => setEditing(false) : open} aria-expanded={editing}>{editing ? "Close" : "Edit"}</button>
        {!a.is_default && (
          <form action={setDefaultAddress}><input type="hidden" name="id" value={a.id} /><button className="btn o s" style={{ minHeight: 44 }}>Default banayein</button></form>
        )}
        <button type="button" className="btn o s danger" style={{ minHeight: 44 }} onClick={() => dlg.current.showModal()}>Delete</button>
      </div>

      {editing && (
        <form action={action} style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <input type="hidden" name="id" value={a.id} />
          <div className="two">
            <div><label htmlFor={`en-${a.id}`}>Naam</label><input id={`en-${a.id}`} name="name" value={f.name} onChange={set("name")} required /></div>
            <div><label htmlFor={`el-${a.id}`}>Label (Home / Office)</label><input id={`el-${a.id}`} name="label" value={f.label} onChange={set("label")} /></div>
          </div>
          <label htmlFor={`ea-${a.id}`}>Ghar / society / area</label>
          <input id={`ea-${a.id}`} name="line" value={f.line} onChange={set("line")} required />
          <div className="three">
            <div><label htmlFor={`ec-${a.id}`}>City</label><input id={`ec-${a.id}`} name="city" value={f.city} onChange={set("city")} required /></div>
            <div><label htmlFor={`es-${a.id}`}>State</label><input id={`es-${a.id}`} name="state" value={f.state} onChange={set("state")} required /></div>
            <div><label htmlFor={`ep-${a.id}`}>Pincode</label><input id={`ep-${a.id}`} name="pincode" inputMode="numeric" maxLength={6} value={f.pincode} onChange={set("pincode")} required /></div>
          </div>
          {!a.is_default && (
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="makeDefault" checked={f.makeDefault} onChange={set("makeDefault")} style={{ width: "auto" }} /> Ise default address banayein
            </label>
          )}
          {s?.error && <p className="err" role="alert">{s.error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn a" style={{ minHeight: 44 }} disabled={busy}>{busy ? "Ruko..." : "Save karein"}</button>
            <button type="button" className="btn o" style={{ minHeight: 44 }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      <dialog ref={dlg} className="dlg" aria-labelledby={`dd-${a.id}`}>
        <h3 id={`dd-${a.id}`}>Ye address delete karein?</h3>
        <p className="mut" style={{ margin: 0 }}>{a.label}: {a.line}, {a.city}, {a.state} {a.pincode}. Ise wapas nahi laya ja sakta. Purane orders par asar nahi padega.</p>
        <div className="dlg-btns">
          <form action={deleteAddress} onSubmit={() => dlg.current.close()} style={{ flex: 1, display: "flex" }}>
            <input type="hidden" name="id" value={a.id} />
            <button className="btn danger" style={{ flex: 1, minHeight: 44 }}>Delete</button>
          </form>
          <button type="button" className="btn o" onClick={() => dlg.current.close()}>Cancel</button>
        </div>
      </dialog>
    </div>
  );
}

export default function AddressList({ list }) {
  return list.map((a) => <AddressCard key={a.id} a={a} />);
}

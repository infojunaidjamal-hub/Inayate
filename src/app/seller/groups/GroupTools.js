"use client";
import { useActionState, useState } from "react";
import { createGroup } from "./actions";
import "./groups.css";

// Searchable checklist: seller listings chunta hai, chune hue ids hidden inputs se jate hain
function Checklist({ items, name, picked, setPicked }) {
  const [q, setQ] = useState("");
  const shown = items.filter((p) => !q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <>
      {picked.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} placeholder="Search by listing name or SKU" aria-label="Search listings" />
      <div className="gp-list">
        {shown.length === 0 && <p className="gp-row mut">No listings found.</p>}
        {shown.map((p) => (
          <label className="gp-row" key={p.id}>
            <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
            {p.image ? <img src={p.image} alt="" /> : <span className="gp-ph" />}
            <span className="gp-nm">{p.name}<small>{p.sku}{p.status !== "Active" ? " · Draft" : ""}</small></span>
          </label>
        ))}
      </div>
    </>
  );
}

// Naya group banane ka form
export function GroupCreate({ items }) {
  const [s, action, busy] = useActionState(createGroup, null);
  const [picked, setPicked] = useState([]);
  return (
    <form action={action} className="card pad">
      <label htmlFor="gname">Group name (optional)</label>
      <input id="gname" name="name" maxLength={60} placeholder="for example: Floral dupatta" />
      <p className="mut" style={{ fontSize: 12, margin: "0 0 10px" }}>Tick the listings that are the same product in different colours. The first one you tick is shown first.</p>
      <Checklist items={items} name="pick" picked={picked} setPicked={setPicked} />
      {s?.error && <p className="err" role="alert">{s.error}</p>}
      <p style={{ marginBottom: 0 }}><button className="btn a" disabled={busy || picked.length < 2}>{busy ? "Creating..." : `Create group (${picked.length} chosen)`}</button></p>
    </form>
  );
}

// Maujooda group mein aur listings jodna
export function AddToGroup({ items }) {
  const [picked, setPicked] = useState([]);
  if (!items.length) return <p className="mut" style={{ fontSize: 12 }}>All other listings are already in groups.</p>;
  return (
    <details className="gp-add">
      <summary>Add more listings to this group</summary>
      <Checklist items={items} name="add" picked={picked} setPicked={setPicked} />
      <p className="mut" style={{ fontSize: 12 }}>{picked.length} chosen. Press &quot;Save group&quot; to add them.</p>
    </details>
  );
}

export function ConfirmButton({ message, children, className = "btn r s" }) {
  return <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}

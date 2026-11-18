import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { withCovers } from "@/lib/images";
import { colourLabel } from "@/lib/group";
import { disbandGroup, saveGroup } from "./actions";
import { GroupCreate, AddToGroup, ConfirmButton } from "./GroupTools";
import "./groups.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Listing groups – Seller Panel" };

export default async function Groups({ searchParams }) {
  await requirePerm("products");
  const { made, saved } = await searchParams;
  const rows = withCovers(all("SELECT id, name, sku, status, colours, specs, colour_main, group_key, group_label, group_pos FROM products ORDER BY group_pos, id"));
  const groups = new Map();
  for (const r of rows) if (r.group_key) groups.set(r.group_key, [...(groups.get(r.group_key) || []), r]);
  const free = rows.filter((r) => !r.group_key).sort((a, b) => b.id - a.id).map((r) => ({ id: r.id, name: r.name, sku: r.sku, status: r.status, image: r.image || null }));

  return (
    <>
      <div className="sec"><h2>Listing groups</h2></div>
      <p className="mut">A group joins separate listings that are the same product in different colours. On the product page the customer sees a photo strip ("Selected Colour: Wine") and can switch between the listings. Each listing keeps its own photos, price, stock and sizes.</p>
      {made && <p className="gp-ok" role="status">Group created. You can set the colour names below.</p>}
      {saved && <p className="gp-ok" role="status">Saved.</p>}

      <h3 style={{ margin: "18px 0 8px" }}>Create a group</h3>
      {free.length < 2 ? <p className="mut">You need at least 2 listings that are not in a group yet.</p> : <GroupCreate items={free} />}

      <h3 style={{ margin: "26px 0 8px" }}>Your groups ({groups.size})</h3>
      {groups.size === 0 && <p className="mut">No groups yet.</p>}
      {[...groups.entries()].map(([key, list]) => (
        <div className="card pad gp-card" key={key}>
          <div className="gp-head">
            <h3>{key} <span className="mut" style={{ fontSize: 12, fontWeight: 400 }}>· {list.length} listings</span></h3>
          </div>
          <form action={saveGroup}>
            <input type="hidden" name="key" value={key} />
            <div className="gp-mem gp-h" aria-hidden="true"><span /><span>Listing</span><span>Colour name</span><span>Order</span><span /></div>
            {list.map((p) => (
              <div className="gp-mem" key={p.id}>
                {p.image ? <img src={p.image} alt="" /> : <span className="gp-ph" />}
                <span style={{ minWidth: 0 }}><Link href={`/seller/products/${p.id}`}>{p.name}</Link><br /><span className="mut" style={{ fontSize: 11 }}>{p.sku}{p.status !== "Active" ? " · Draft (hidden from the strip)" : ""}</span></span>
                <input type="text" name={`label_${p.id}`} defaultValue={colourLabel(p, false)} maxLength={40} placeholder="for example: Wine" aria-label={`Colour name for ${p.name}`} />
                <input type="number" name={`pos_${p.id}`} defaultValue={p.group_pos} min={0} max={999} aria-label={`Order of ${p.name}`} />
                <label className="gp-rm"><input type="checkbox" name={`remove_${p.id}`} />Remove</label>
              </div>
            ))}
            <AddToGroup items={free} />
            <p style={{ marginBottom: 0 }}><button className="btn a s">Save group</button></p>
          </form>
          <form action={disbandGroup} style={{ marginTop: 10 }}>
            <input type="hidden" name="key" value={key} />
            <ConfirmButton message="This ungroups all these listings. The listings themselves stay. Continue?">Ungroup all</ConfirmButton>
          </form>
        </div>
      ))}
    </>
  );
}

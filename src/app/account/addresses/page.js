import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { deleteAddress, setDefaultAddress } from "../actions";
import AddressForm from "./AddressForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Addresses – Inayate Bags" };

export default async function Addresses() {
  const user = await getUser();
  if (!user) redirect("/login");
  const list = all("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id", user.id);
  return (
    <>
      <h2>Saved Addresses</h2>
      {list.length === 0 && <p className="mut">Abhi koi address save nahi hai.</p>}
      {list.map((a) => (
        <div key={a.id} className="card pad" style={{ marginBottom: 12 }}>
          <b>{a.label}</b> {a.is_default ? <span className="tag g">Default</span> : null}
          <p style={{ margin: "6px 0 10px" }}>{a.name}<br />{a.line}, {a.city}, {a.state} {a.pincode}</p>
          <div style={{ display: "flex", gap: 8 }}>
            {!a.is_default && (
              <form action={setDefaultAddress}><input type="hidden" name="id" value={a.id} /><button className="btn o s">Default banayein</button></form>
            )}
            <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="btn o s">Delete</button></form>
          </div>
        </div>
      ))}
      <AddressForm />
    </>
  );
}

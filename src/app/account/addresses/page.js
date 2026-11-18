import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all } from "@/lib/db";
import AddressForm from "./AddressForm";
import AddressList from "./AddressList";

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
      <AddressList list={list} />
      <AddressForm />
    </>
  );
}

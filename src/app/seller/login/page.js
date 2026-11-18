import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { STAFF } from "@/lib/perms";
import AuthShell from "./AuthShell";
import Form from "./Form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store Admin Login" };

export default async function StaffLogin() {
  const user = await getUser();
  if (user && STAFF.includes(user.role)) redirect("/seller");
  return (
    <AuthShell title="Store Admin Login" sub="Apna email ya mobile aur password daalein.">
      <Form />
    </AuthShell>
  );
}

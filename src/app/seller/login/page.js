import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Form from "./Form";

export const metadata = { title: "Seller Login" };

export default async function SellerLogin() {
  const user = await getUser();
  if (user?.role === "seller") redirect("/seller");
  return (
    <>
      <h2>Seller Login</h2>
      <Form />
      <p className="mut">
        Naye seller hain? <Link href="/seller/register" style={{ textDecoration: "underline" }}>Register karein</Link>
      </p>
    </>
  );
}

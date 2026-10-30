import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller Register" };

export default async function SellerRegister() {
  const user = await getUser();
  if (user?.role === "seller") redirect("/seller");
  // registration tabhi khulta hai jab .env mein SELLER_SIGNUP_CODE set ho
  const open = Boolean(process.env.SELLER_SIGNUP_CODE);

  return (
    <>
      <h2>Seller Register</h2>
      {open ? (
        <RegisterForm />
      ) : (
        <div className="card pad" style={{ maxWidth: 420 }}>
          <p style={{ margin: 0 }}>Seller registration abhi band hai. Store owner se sampark karein.</p>
        </div>
      )}
      <p className="mut">
        Pehle se account hai? <Link href="/seller/login" style={{ textDecoration: "underline" }}>Login karein</Link>
      </p>
    </>
  );
}

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Forms from "./Forms";

export const metadata = { title: "Login – Inayate Bags" };

export default async function LoginPage({ searchParams }) {
  const { next = "" } = await searchParams;
  const user = await getUser();
  if (user) redirect(user.role === "seller" ? "/seller" : next.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <>
      <h2>Welcome</h2>
      <Forms next={next} />
      <p className="mut" style={{ marginTop: 20 }}>Seller hain? <a href="/seller/login" style={{ textDecoration: "underline" }}>Seller login yahan hai</a></p>
    </>
  );
}

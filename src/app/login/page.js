import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Forms from "./Forms";

export const metadata = { title: "Login – Inayate Bags" };

export default async function LoginPage({ searchParams }) {
  const { next = "", tab = "" } = await searchParams;
  const user = await getUser();
  if (user) redirect(user.role !== "buyer" ? "/seller" : next.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return <Forms next={next} initialTab={tab === "signup" ? "signup" : "login"} />;
}

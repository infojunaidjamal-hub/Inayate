import { redirect } from "next/navigation";
import { getPre } from "@/lib/staffauth";
import AuthShell from "../AuthShell";
import VerifyForm from "./VerifyForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verification code" };

export default async function Verify() {
  const pre = await getPre();
  if (!pre) redirect("/seller/login");
  return (
    <AuthShell step="Step 2 of 2" title="Verification code" sub="Authenticator app kholein aur wahan dikha 6 digit code daalein."
      aside={{ h: "Ek aur kadam surakshit login ka.", p: "Ye code har 30 second mein badalta hai, isliye sirf aapke phone ke paas hota hai." }}>
      <VerifyForm />
    </AuthShell>
  );
}

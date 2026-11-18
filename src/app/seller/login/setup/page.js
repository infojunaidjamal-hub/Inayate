import { redirect } from "next/navigation";
import { getActor } from "@/lib/staffauth";
import AuthShell from "../AuthShell";
import SetupBlock from "../SetupBlock";

export const dynamic = "force-dynamic";
export const metadata = { title: "OTP setup" };

export default async function Setup() {
  const a = await getActor();
  if (!a) redirect("/seller/login");
  if (a.user.totp_secret) redirect(a.viaPre ? "/seller/login/verify" : "/seller/security");
  return (
    <AuthShell title="Authenticator app jodein" sub="Pehli baar ek minute ka kaam hai. Phir har login par app ka code poochha jayega."
      aside={{ h: "Pehli baar: apna login surakshit karein.", p: "Ye sirf ek baar karna hai. Password chori ho jaye tab bhi bina aapke phone ke koi andar nahi aa sakta." }}>
      <SetupBlock />
    </AuthShell>
  );
}

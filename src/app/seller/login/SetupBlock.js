import { getActor, pendingSecret } from "@/lib/staffauth";
import { otpauthUri } from "@/lib/totp";
import { qrSvg } from "@/lib/qr";
import { SITE } from "@/lib/site";
import SetupForm from "./SetupForm";

// Login ke beech aur Security page, dono mein yahi dikhta hai
export default async function SetupBlock() {
  const a = await getActor();
  if (!a) return null;
  const secret = pendingSecret(a.user);
  const svg = qrSvg(otpauthUri(a.user.email || a.user.mobile || a.user.name, secret, SITE.name), { label: "OTP setup ka QR code" });
  return <SetupForm svg={svg} secret={secret} viaPre={a.viaPre} />;
}

import Link from "next/link";
import { SITE } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";

export const metadata = { title: "Help & Support" };

export default function Help() {
  const wa = waLink("Namaste, mujhe madad chahiye.");
  return (
    <>
      <h2>Help &amp; Support</h2>
      <div className="grid">
        <div className="card pad"><b>WhatsApp par chat</b><p className="mut">Order, return ya payment ki madad seedha humse.</p><a className="btn a s" href={wa} target="_blank" rel="noopener noreferrer">Chat shuru karein</a></div>
        <div className="card pad"><b>Contact</b><p className="mut" style={{ marginBottom: 0 }}>{SITE.email}<br />{SITE.phone}<br />{SITE.hours}</p></div>
        <div className="card pad"><b>Policies</b><p style={{ marginBottom: 0, lineHeight: 2 }}>
          <Link href="/shipping" style={{ textDecoration: "underline" }}>Shipping &amp; Returns</Link><br />
          <Link href="/terms" style={{ textDecoration: "underline" }}>Terms</Link> · <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy</Link></p></div>
      </div>
    </>
  );
}

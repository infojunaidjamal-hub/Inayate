// WhatsApp links ek hi jagah se. Store ka number SITE.whatsapp se aata hai.
//   waLink("message")           -> store ke WhatsApp par (message optional)
//   waTo("9876543210", "msg")   -> kisi customer ko (India ka +91 apne aap lagta hai)
import { SITE } from "@/lib/site";

const withText = (url, text) => (text ? `${url}?text=${encodeURIComponent(text)}` : url);
export const waLink = (text = "") => withText(`https://wa.me/${SITE.whatsapp}`, text);
export const waTo = (mobile, text = "") => withText(`https://wa.me/91${String(mobile || "").replace(/\D/g, "").slice(-10)}`, text);

"use server";
import { run } from "@/lib/db";
import { clientIp, minutesLocked, recordFail } from "@/lib/throttle";
import { ensureLeads, normMobile } from "@/lib/leads";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Popup form. Server actions are public endpoints, so everything is checked here again.
export async function subscribe(prev, form) {
  // Honeypot: the "website" field is hidden from people, only bots fill it. Pretend it worked.
  if (String(form.get("website") || "").trim()) return { ok: true };

  // Same throttle table the login uses: 8 tries per 15 minutes per IP, then a 15 minute pause.
  const key = `sub:${await clientIp()}`;
  const wait = minutesLocked(key);
  if (wait) return { error: `Too many attempts. Please try again in ${wait} minute${wait > 1 ? "s" : ""}.` };
  recordFail(key, 8);

  // Naya popup mobile number leta hai. (Email wala purana raasta neeche waise hi chalta hai.)
  if (form.get("mobile") != null) {
    const mobile = normMobile(form.get("mobile"));
    if (!mobile) return { error: "Please enter a valid 10-digit mobile number." };
    ensureLeads();
    // UNIQUE + INSERT OR IGNORE: dobara signup error nahi hota, jawab same rehta hai.
    run("INSERT OR IGNORE INTO popup_leads (mobile, notify, source) VALUES (?, ?, ?)", mobile, form.get("notify") === "on" ? 1 : 0, "popup");
    return { ok: true };
  }

  const email = String(form.get("email") || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { error: "Please enter a valid email address." };

  // UNIQUE + INSERT OR IGNORE: a repeat signup is not an error, and the reply is identical,
  // so nobody can use this form to find out who is already on the list.
  run("INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)", email, "popup");
  return { ok: true };
}

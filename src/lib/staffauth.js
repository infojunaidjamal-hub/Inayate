// Staff login ke beech ke kadam: password theek ho gaya par OTP baaki ("pre" cookie), aur "is device par yaad rakhein"
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { one, run } from "@/lib/db";
import { signToken, fpOf, startSession, getUser } from "@/lib/auth";
import { STAFF } from "@/lib/perms";
import { logAct } from "@/lib/activity";

const PRE = "maison_pre", TD = "maison_td";
const prod = process.env.NODE_ENV === "production";
const eq = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const opts = (maxAge) => ({ httpOnly: true, sameSite: "lax", secure: prod, path: "/", maxAge });
const staffRow = (id) => one(`SELECT * FROM users WHERE id = ? AND disabled = 0 AND role IN ('seller','manager','operator')`, Number(id));

export async function setPre(userId, remember) {
  const body = `${userId}.${Date.now() + 10 * 60 * 1000}.${remember ? 1 : 0}`;
  (await cookies()).set(PRE, `${body}.${signToken("pre." + body)}`, opts(600));
}
export async function getPre() {
  const t = (await cookies()).get(PRE)?.value;
  if (!t) return null;
  const [id, exp, rm, sig] = t.split(".");
  if (!sig || !eq(sig, signToken(`pre.${id}.${exp}.${rm}`)) || Date.now() > Number(exp)) return null;
  const user = staffRow(id);
  return user ? { user, remember: rm === "1" } : null;
}
export async function clearPre() { (await cookies()).delete(PRE); }

// Trusted device: 30 din tak OTP nahi poochhta. Password ya OTP badalte hi ye cookie bekaar ho jati hai.
const tdSig = (u, exp) => signToken(`td.${u.id}.${exp}.${fpOf(u.password_hash + "|" + u.totp_secret)}`);
export async function setTrusted(u) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  (await cookies()).set(TD, `${u.id}.${exp}.${tdSig(u, exp)}`, opts(30 * 24 * 3600));
}
export async function isTrusted(u) {
  const t = (await cookies()).get(TD)?.value;
  if (!t || !u.totp_secret) return false;
  const [id, exp, sig] = t.split(".");
  return Number(id) === u.id && Date.now() < Number(exp) && !!sig && eq(sig, tdSig(u, exp));
}

export async function completeLogin(u, remember) {
  await clearPre();
  await startSession(u.id, remember ? 30 * 24 : 8);
  run("UPDATE users SET last_login = datetime('now') WHERE id = ?", u.id);
  logAct(u, "Login", remember ? "30 din yaad rakha" : "");
}

// Setup ke waqt: ya to login ho chuka staff, ya password ke baad wala (pre) user
export async function getActor() {
  const u = await getUser();
  if (u && STAFF.includes(u.role)) return { user: staffRow(u.id), viaPre: false };
  const p = await getPre();
  return p ? { user: p.user, viaPre: true, remember: p.remember } : null;
}
export { staffRow };

// OTP setup: QR dikhane ke liye secret (pehli baar banta hai, phir wahi rehta hai jab tak confirm na ho)
import { newSecret, sealSecret, openSecret } from "@/lib/totp";
export function pendingSecret(user) {
  if (user.totp_pending) { try { return openSecret(user.totp_pending); } catch {} }
  const s = newSecret();
  run("UPDATE users SET totp_pending = ? WHERE id = ?", sealSecret(s), user.id);
  return s;
}

// Staff ko dene ke liye temporary password (milte-julte akshar l, 1, O, 0 nahi)
import { randomBytes } from "node:crypto";
export function tempPassword() {
  const L = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(10), (b) => L[b % L.length]).join("");
}

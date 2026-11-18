// Login system: password hashing + cookie session (koi extra package nahi)
import { scryptSync, randomBytes, timingSafeEqual, createHmac, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { STAFF, can, otpRequired } from "@/lib/perms";

const COOKIE = "maison_session";
const DAYS = 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET set karna zaroori hai");
  return "maison-dev-secret-change-me"; // sirf apne computer par testing ke liye
}

export function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(pw, salt, 64).toString("hex");
}

export function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const sign = (text) => createHmac("sha256", secret()).update(text).digest("hex");
export const signToken = sign;
// Session password ke fingerprint se bandhi hai: password badalte hi purane saare login band ho jate hain
const fp = (hash) => createHash("sha256").update(String(hash || "")).digest("hex").slice(0, 16);
export const fpOf = fp;

const COMMON = new Set(["12345678", "123456789", "1234567890", "password", "password1", "password123", "qwerty123", "qwertyuiop", "11111111", "00000000", "abcd1234", "iloveyou", "admin123", "welcome123"]);
export function checkPassword(pw, mobile = "") {
  if (pw.length < 8) return "Password kam se kam 8 akshar ka rakhein.";
  if (COMMON.has(pw.toLowerCase()) || pw === mobile || /^(.)\1+$/.test(pw)) return "Ye password bahut aasaan hai. Koi mushkil password chunein.";
  return "";
}

// hours: buyers ke liye 7 din; staff ke liye login par 8 ghante ya "yaad rakhein" par 30 din
export async function startSession(userId, hours = DAYS * 24) {
  const exp = Date.now() + hours * 60 * 60 * 1000;
  const body = `${userId}.${exp}`;
  const row = one("SELECT password_hash FROM users WHERE id = ?", userId);
  (await cookies()).set(COOKIE, `${body}.${sign(`${body}.${fp(row?.password_hash)}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: hours * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

// Logged-in user (ya null)
export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig) return null;
  const row = one("SELECT id, name, mobile, email, role, avatar, avatar_shape, password_hash, disabled, must_change, (totp_secret IS NOT NULL) AS has_otp FROM users WHERE id = ?", Number(id));
  if (!row || row.disabled) return null; // band kiya hua account login nahi rehta
  const good = sign(`${id}.${exp}.${fp(row.password_hash)}`);
  if (sig.length !== good.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  if (Date.now() > Number(exp)) return null;
  const { password_hash, ...user } = row; // hash kabhi bahar nahi jata
  return user;
}

// Staff (Owner / Manager / Operator) pages ke liye. allowSetup = security page par password ya OTP badalne dena
// (warna "pehle password badlo" wala redirect baar baar chalta).
export async function requireStaff({ allowSetup = false } = {}) {
  const user = await getUser();
  if (!user || !STAFF.includes(user.role)) redirect("/seller/login");
  if (!allowSetup) {
    if (user.must_change) redirect("/seller/security?force=password");
    if (otpRequired(user.role) && !user.has_otp) redirect("/seller/security?force=otp");
  }
  return user;
}

// Kisi kaam ki ijazat check karo (lib/perms.js mein likhi hai). Har page aur har action mein lagao.
export async function requirePerm(perm) {
  const user = await requireStaff();
  if (!can(user.role, perm)) redirect("/seller?denied=1");
  return user;
}

// Purane naam ke liye: sirf Owner
export const requireSeller = () => requirePerm("team");

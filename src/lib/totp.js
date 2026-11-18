// Authenticator app wala OTP (RFC 6238, SHA-1, 6 digit, 30 second). Koi extra package nahi.
import { createHmac, createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { authSecret } from "@/lib/secret";

const A32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function b32encode(buf) {
  let bits = 0, val = 0, out = "";
  for (const b of buf) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += A32[(val >>> (bits - 5)) & 31]; bits -= 5; }
    val &= (1 << bits) - 1;
  }
  if (bits > 0) out += A32[(val << (5 - bits)) & 31];
  return out;
}
export function b32decode(str) {
  let bits = 0, val = 0; const out = [];
  for (const c of String(str).replace(/[\s=-]/g, "").toUpperCase()) {
    const i = A32.indexOf(c);
    if (i < 0) throw new Error("bad base32");
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; val &= (1 << bits) - 1; }
  }
  return Buffer.from(out);
}

export function hotp(key, counter, digits = 6) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", key).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, "0");
}
export const stepOf = (ms = Date.now()) => Math.floor(ms / 30000);

// Sahi code ho to uska step wapas deta hai (replay rokne ke liye save karna hai), warna null.
// +-1 step (30 second) ki chhoot phone ki ghadi thodi aage-peeche ho to.
export function verifyTotp(secretB32, code, lastStep = 0, now = Date.now()) {
  const c = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const key = b32decode(secretB32), cur = stepOf(now);
  for (const w of [0, -1, 1]) {
    const s = cur + w;
    if (s <= lastStep) continue;
    const good = hotp(key, s);
    if (timingSafeEqual(Buffer.from(good), Buffer.from(c))) return s;
  }
  return null;
}
export const newSecret = () => b32encode(randomBytes(20));
export const otpauthUri = (account, secret, issuer) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

// Secret database mein seedha nahi, encrypt karke rakhte hain (AUTH_SECRET se)
const key32 = () => scryptSync(authSecret(), "maison-totp-v1", 32);
export function sealSecret(plain) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key32(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("hex"), c.getAuthTag().toString("hex"), ct.toString("hex")].join(".");
}
export function openSecret(sealed) {
  const [v, iv, tag, ct] = String(sealed || "").split(".");
  if (v !== "v1") throw new Error("bad secret");
  const d = createDecipheriv("aes-256-gcm", key32(), Buffer.from(iv, "hex"));
  d.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([d.update(Buffer.from(ct, "hex")), d.final()]).toString("utf8");
}

// Backup codes: phone kho jaye to ek-ek baar kaam aate hain
const BC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeBackupCodes(n = 8) {
  return Array.from({ length: n }, () => {
    const b = randomBytes(8), s = Array.from(b, (x) => BC[x % BC.length]).join("");
    return s.slice(0, 4) + "-" + s.slice(4);
  });
}
export const hashBackup = (code) => createHash("sha256").update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");

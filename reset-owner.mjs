// Emergency: Owner ka password ya OTP kho jaye (backup codes bhi na hon) to apne computer / server par ye chalayein:
//     node reset-owner.mjs
// Ye naya temporary password banata hai, OTP band karta hai, aur login par naya password aur OTP dobara set karwata hai.
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

if (!existsSync("data/maison.db")) { console.log("X data/maison.db nahi mila. Ye maison-bags folder se chalayein."); process.exit(1); }
const db = new DatabaseSync("data/maison.db");
const owners = db.prepare("SELECT id, name, email, mobile FROM users WHERE role = 'seller' ORDER BY id").all();
if (!owners.length) { console.log("X Koi Owner account nahi mila."); process.exit(1); }
const pick = process.argv[2] ? owners.find((o) => String(o.id) === process.argv[2] || o.email === process.argv[2] || o.mobile === process.argv[2]) : owners[0];
if (!pick) { console.log("X Ye Owner nahi mila. Mojooda:", owners.map((o) => `${o.id}: ${o.email || o.mobile}`).join(" | ")); process.exit(1); }

const L = "abcdefghjkmnpqrstuvwxyz23456789";
const pw = Array.from(randomBytes(12), (b) => L[b % L.length]).join("");
const salt = randomBytes(16).toString("hex");
const hash = salt + ":" + scryptSync(pw, salt, 64).toString("hex");
const cols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, pick.id);
if (cols.includes("must_change")) db.prepare("UPDATE users SET must_change = 1, totp_secret = NULL, totp_pending = NULL, totp_last = 0, disabled = 0 WHERE id = ?").run(pick.id);
try { db.prepare("DELETE FROM backup_codes WHERE user_id = ?").run(pick.id); } catch {}
try { db.prepare("DELETE FROM auth_throttle").run(); } catch {}
console.log(`\nOwner: ${pick.name} (${pick.email || pick.mobile})`);
console.log(`Naya temporary password: ${pw}`);
console.log("Login karein, naya password rakhein aur authenticator app dobara jodein.");

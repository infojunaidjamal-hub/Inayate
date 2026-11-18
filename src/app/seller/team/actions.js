"use server";
import { revalidatePath } from "next/cache";
import { one, run, transaction } from "@/lib/db";
import { requirePerm, hashPassword } from "@/lib/auth";
import { tempPassword } from "@/lib/staffauth";
import { clearFails } from "@/lib/throttle";
import { logAct } from "@/lib/activity";
import { ROLE_LABEL } from "@/lib/perms";

const s = (f, k) => String(f.get(k) ?? "").trim();
// Sirf Manager ya Operator par kaam hota hai. Owner ko yahan se chheda nahi ja sakta.
const target = (f) => one("SELECT * FROM users WHERE id = ? AND role IN ('manager','operator')", Number(s(f, "id")));
const refresh = () => revalidatePath("/seller/team");

export async function addStaff(prev, form) {
  const me = await requirePerm("team");
  const name = s(form, "name"), email = s(form, "email").toLowerCase(), mobile = s(form, "mobile"), role = s(form, "role");
  if (name.length < 2) return { error: "Naam likhein." };
  if (!["manager", "operator"].includes(role)) return { error: "Role chunein." };
  if (!email && !mobile) return { error: "Email ya mobile, kam se kam ek zaroori hai." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Sahi email likhein." };
  if (mobile && !/^[6-9]\d{9}$/.test(mobile)) return { error: "10 digit ka sahi mobile likhein." };
  if (email && one("SELECT id FROM users WHERE lower(email) = ?", email)) return { error: "Ye email kisi aur account par hai." };
  if (mobile && one("SELECT id FROM users WHERE mobile = ?", mobile)) return { error: "Ye mobile kisi aur account par hai." };
  const pw = tempPassword();
  run("INSERT INTO users (name, mobile, email, password_hash, role, must_change) VALUES (?, ?, ?, ?, ?, 1)", name, mobile || null, email || null, hashPassword(pw), role);
  logAct(me, "Staff jodha", `${name} (${ROLE_LABEL[role]})`);
  refresh();
  return { password: pw, name, mobile };
}

export async function resetStaffPassword(prev, form) {
  const me = await requirePerm("team");
  const u = target(form);
  if (!u) return { error: "Staff nahi mila." };
  const pw = tempPassword();
  run("UPDATE users SET password_hash = ?, must_change = 1 WHERE id = ?", hashPassword(pw), u.id);
  clearFails(`staff:${(u.email || "").toLowerCase()}`); clearFails(`staff:${u.mobile || ""}`); clearFails(`pw:${u.id}`);
  logAct(me, "Staff ka password reset kiya", u.name);
  return { password: pw, name: u.name, mobile: u.mobile };
}

export async function resetStaffOtp(form) {
  const me = await requirePerm("team");
  const u = target(form);
  if (u) {
    transaction(() => {
      run("UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_last = 0 WHERE id = ?", u.id);
      run("DELETE FROM backup_codes WHERE user_id = ?", u.id);
    });
    clearFails(`otp:${u.id}`);
    logAct(me, "Staff ka OTP reset kiya", u.name);
  }
  refresh();
}

export async function toggleStaff(form) {
  const me = await requirePerm("team");
  const u = target(form);
  if (u) { run("UPDATE users SET disabled = ? WHERE id = ?", u.disabled ? 0 : 1, u.id); logAct(me, u.disabled ? "Staff chalu kiya" : "Staff band kiya", u.name); }
  refresh();
}

export async function setStaffRole(form) {
  const me = await requirePerm("team");
  const u = target(form), role = s(form, "role");
  if (u && ["manager", "operator"].includes(role) && role !== u.role) {
    run("UPDATE users SET role = ? WHERE id = ?", role, u.id);
    logAct(me, "Staff ka role badla", `${u.name}: ${ROLE_LABEL[u.role]} → ${ROLE_LABEL[role]}`);
  }
  refresh();
}

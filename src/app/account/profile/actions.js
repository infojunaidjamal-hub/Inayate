"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { storeImage, deleteStored } from "@/lib/images";
import { startOtp, checkOtp } from "@/lib/otp";

async function buyer() {
  const u = await getUser();
  if (!u || u.role !== "buyer") redirect("/login?next=/account");
  return u;
}

// Naam: bina password aur bina code ke
export async function saveName(prev, form) {
  const user = await buyer();
  const name = String(form.get("name") || "").trim();
  if (name.length < 2 || name.length > 60) return { error: "Naam 2 se 60 akshar ke beech likhein." };
  run("UPDATE users SET name = ? WHERE id = ?", name, user.id);
  revalidatePath("/", "layout");
  return { ok: "Naam save ho gaya." };
}

const taken = (kind, value, userId) =>
  kind === "mobile"
    ? one("SELECT id FROM users WHERE mobile = ? AND id <> ?", value, userId)
    : one("SELECT id FROM users WHERE email = ? AND id <> ?", value, userId);

// Mobile ya email badalne ka pehla step: naya number / email check karke code bhejna
export async function startContactChange(prev, form) {
  const user = await buyer();
  const kind = form.get("kind") === "email" ? "email" : "mobile";
  const raw = String(form.get("value") || "").trim();
  let value;
  if (kind === "mobile") {
    value = raw.replace(/[\s-]/g, "").replace(/^\+?91/, "");
    if (!/^[6-9]\d{9}$/.test(value)) return { error: "10 digit ka sahi mobile number daalein.", kind };
  } else {
    value = raw.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value) || value.length > 120) return { error: "Sahi email daalein.", kind };
  }
  const row = one("SELECT mobile, email FROM users WHERE id = ?", user.id);
  if (value === (kind === "mobile" ? row.mobile : row.email)) return { error: "Ye wahi hai jo abhi saved hai.", kind };
  if (taken(kind, value, user.id)) return { error: kind === "mobile" ? "Ye mobile number kisi aur account par hai." : "Ye email kisi aur account par hai.", kind };

  const r = await startOtp(user.id, kind, value);
  if (r.error) return { error: r.error, kind };
  return { step: "verify", kind, target: value, devCode: r.devCode };
}

// Doosra step: code sahi ho to hi badlega. Naya number / email server ne code ke saath yaad rakha hai.
export async function confirmContactChange(prev, form) {
  const user = await buyer();
  const kind = form.get("kind") === "email" ? "email" : "mobile";
  const code = String(form.get("code") || "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "6 digit ka code daalein." };
  const c = checkOtp(user.id, kind, code);
  if (c.error) return { error: c.error };
  if (taken(kind, c.target, user.id)) return { error: kind === "mobile" ? "Ye mobile number kisi aur account par hai." : "Ye email kisi aur account par hai." };
  run(`UPDATE users SET ${kind} = ? WHERE id = ?`, c.target, user.id);
  revalidatePath("/", "layout");
  return { done: true, ok: kind === "mobile" ? "Mobile number badal gaya. Ab isi se login hoga." : "Email badal gaya." };
}

// Profile photo ab hamesha gol hoti hai (Circle/Square ka option hata diya gaya hai)
const shapeOf = () => "circle";

// Photo (browser mein crop hokar aati hai) + shape: bina password ke
export async function saveAvatar(prev, form) {
  const user = await buyer();
  const res = await storeImage(form.get("photo"), "avatar-");
  if (res.error) return { error: res.error };
  const old = one("SELECT avatar FROM users WHERE id = ?", user.id)?.avatar;
  run("UPDATE users SET avatar = ?, avatar_shape = ? WHERE id = ?", res.url, shapeOf(form), user.id);
  if (old && old.startsWith("/uploads/avatar-")) await deleteStored(old);
  revalidatePath("/", "layout");
  return { ok: "Photo save ho gayi." };
}

// Sirf shape badalna (nayi photo ke bina)
export async function setAvatarShape(form) {
  const user = await buyer();
  run("UPDATE users SET avatar_shape = ? WHERE id = ?", shapeOf(form), user.id);
  revalidatePath("/", "layout");
}

export async function removeAvatar() {
  const user = await buyer();
  const old = one("SELECT avatar FROM users WHERE id = ?", user.id)?.avatar;
  run("UPDATE users SET avatar = NULL WHERE id = ?", user.id);
  if (old && old.startsWith("/uploads/avatar-")) await deleteStored(old);
  revalidatePath("/", "layout");
}

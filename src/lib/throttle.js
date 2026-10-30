// Galat password ki baar baar koshish rokna: 5 galat koshish par 15 minute ke liye rok
import { headers } from "next/headers";
import { one, run } from "@/lib/db";

const WINDOW = 15 * 60 * 1000;
const LOCK = 15 * 60 * 1000;

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "local";
}

// kitne minute baaki hain (0 = rok nahi hai)
export function minutesLocked(key) {
  const r = one("SELECT locked_until FROM auth_throttle WHERE key = ?", key);
  return r && r.locked_until > Date.now() ? Math.ceil((r.locked_until - Date.now()) / 60000) : 0;
}

export function recordFail(key, max = 5) {
  const now = Date.now();
  const r = one("SELECT * FROM auth_throttle WHERE key = ?", key);
  if (!r || now - r.first_at > WINDOW) {
    run("INSERT OR REPLACE INTO auth_throttle (key, fails, first_at, locked_until) VALUES (?, 1, ?, 0)", key, now);
    return;
  }
  const fails = r.fails + 1;
  run("UPDATE auth_throttle SET fails = ?, locked_until = ? WHERE key = ?", fails, fails >= max ? now + LOCK : 0, key);
}

export function clearFails(key) {
  run("DELETE FROM auth_throttle WHERE key = ?", key);
}

export const lockMessage = (m) => `Bahut zyada galat koshish hui. ${m} minute baad dobara try karein.`;

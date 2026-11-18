// Popup se aaye mobile numbers. Table apne aap ban jati hai (pehle se kuch banane ki zaroorat nahi).
import { run } from "@/lib/db";

let ready = false;
export function ensureLeads() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS popup_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobile TEXT NOT NULL UNIQUE,
    notify INTEGER NOT NULL DEFAULT 1,
    source TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  ready = true;
}

// "+91 98765 43210", "09876543210" jaise likhe number ko 10 digit mein badalta hai. Galat ho to "".
export function normMobile(v) {
  let m = String(v || "").replace(/[\s-]/g, "");
  if (/^(\+91|91)\d{10}$/.test(m)) m = m.slice(-10);
  if (/^0\d{10}$/.test(m)) m = m.slice(1);
  return /^[6-9]\d{9}$/.test(m) ? m : "";
}

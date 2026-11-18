import { run } from "@/lib/db";

// Phase 8: Activity log. Kisne, kab, kya badla.
// - Har entry ka ek "area" hota hai (Orders, Customers, Team...). Naya action jodo to areaOf() mein dekh lo.
// - Sirf 30 din ki entries rakhi jaati hain, purani apne aap hat jaati hain.
// - Kaun dekh sakta hai: Owner sab, Manager MANAGER_HIDDEN ke alawa sab, Operator kuch nahi (perm "activity" mein sirf Owner aur Manager hain).
export const KEEP_DAYS = 30;
export const AREAS = ["Orders", "Returns", "Payments", "Products", "Blog", "Customers", "Subscribers", "Chatbot", "Team", "Security", "Other"];
export const MANAGER_HIDDEN = ["Team", "Security", "Payments"]; // inhe sirf Owner dekh sakta hai

// Action ke shabd se area pata karna (migrate.js ke p8_001 mein bhi yahi hisaab SQL mein hai)
export function areaOf(action) {
  const a = String(action || "");
  if (/^chat_answer/i.test(a)) return "Chatbot";
  if (/^staff/i.test(a)) return "Team";
  if (/^(login|password badla|otp|naye backup|backup code)/i.test(a)) return "Security";
  if (/^(refund|business)/i.test(a)) return "Payments";
  if (/^(customer|wallet)/i.test(a)) return "Customers";
  if (/^subscriber/i.test(a)) return "Subscribers";
  if (/^return/i.test(a)) return "Returns";
  if (/^(order|hold order|rto|invoice|credit note)/i.test(a)) return "Orders";
  if (/^blog/i.test(a)) return "Blog";
  if (/^(product|listing group|style video)/i.test(a)) return "Products";
  return "Other";
}

// Kisne kya kiya: activity log mein ek line likhta hai (error aaye to kaam nahi rokta)
export function logAct(user, action, detail = "", area = "") {
  try {
    const g = globalThis, day = new Date().toISOString().slice(0, 10);
    if (g.__actPruned !== day) { // din mein ek baar 30 din se purani entries hatao
      run(`DELETE FROM activity_log WHERE created_at < datetime('now', '-${KEEP_DAYS} days')`);
      g.__actPruned = day;
    }
    run("INSERT INTO activity_log (user_id, user_name, action, detail, area) VALUES (?, ?, ?, ?, ?)", user?.id ?? null, user?.name || "-", action, String(detail).slice(0, 300), area || areaOf(action));
  } catch (e) {
    console.error("logAct:", e.message);
  }
}

// Activity page aur CSV dono ke liye: role ke hisaab se kaun si entries dikh sakti hain + filters.
// f = { q, area, who, days }. Table ka naam "a" hona chahiye.
export function activityWhere(role, f = {}) {
  const w = [`a.created_at >= datetime('now', ?)`];
  const p = [`-${Math.min(KEEP_DAYS, Number(f.days) || KEEP_DAYS)} days`];
  if (role === "seller") { /* Owner: sab */ }
  else if (role === "manager") w.push(`COALESCE(a.area, 'Other') NOT IN (${MANAGER_HIDDEN.map(() => "?").join(",")})`), p.push(...MANAGER_HIDDEN);
  else w.push("1 = 0"); // baaki sab roles (Operator) kuch nahi dekhte
  if (f.area) w.push("COALESCE(a.area, 'Other') = ?"), p.push(f.area);
  if (f.who) w.push("a.user_name = ?"), p.push(f.who);
  if (f.q) { const l = `%${String(f.q).replace(/[%_]/g, "")}%`; w.push("(a.user_name LIKE ? OR a.action LIKE ? OR a.detail LIKE ?)"), p.push(l, l, l); }
  return { where: w.join(" AND "), params: p };
}

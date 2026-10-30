// Webhook ko apne computer par test karne ke liye (Razorpay ke bina).
// Chalane ka tarika:  node test-webhook.mjs MB1050
// (website chalti honi chahiye, aur order "Awaiting Payment" mein ho jisne Razorpay payment shuru kiya ho)
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const no = process.argv[2];
if (!no) { console.log("Order number likho, jaise: node test-webhook.mjs MB1050"); process.exit(1); }
const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
if (!env.RAZORPAY_WEBHOOK_SECRET) { console.log("X .env mein RAZORPAY_WEBHOOK_SECRET nahi hai. node batch5/batch5.mjs chalao."); process.exit(1); }

const db = new DatabaseSync("data/maison.db");
const o = db.prepare("SELECT * FROM orders WHERE order_no = ?").get(no);
db.close();
if (!o) { console.log("X Order nahi mila:", no); process.exit(1); }
if (!o.razorpay_order_id) { console.log("X Is order par Razorpay payment shuru nahi hui (pehle Pay Now dabao, phir payment window band kar do)."); process.exit(1); }

const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_TEST" + Date.now(), order_id: o.razorpay_order_id, amount: Math.round(o.total * 100) } } } });
const sig = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
const res = await fetch("http://localhost:3000/api/razorpay/webhook", { method: "POST", body, headers: { "x-razorpay-signature": sig, "content-type": "application/json" } });
console.log("Server ne kaha:", res.status, await res.text());
console.log("Ab order page refresh karo: order Paid / Placed hona chahiye.");

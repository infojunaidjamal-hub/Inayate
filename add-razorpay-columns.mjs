import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/maison.db");
const cols = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);

for (const c of ["razorpay_order_id", "razorpay_payment_id"]) {
  if (!cols.includes(c)) {
    db.exec(`ALTER TABLE orders ADD COLUMN ${c} TEXT`);
    console.log("added:", c);
  } else {
    console.log("already hai:", c);
  }
}
console.log("Done. Purana data safe hai.");

// Database helper: Node ka built-in SQLite use hota hai (koi extra package nahi)
import path from "node:path";

const g = globalThis;

// Naye columns apne aap jud jate hain (purana data safe rehta hai)
function ensureSchema(db) {
  const pc = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
  for (const c of ["specs", "group_key"]) if (!pc.includes(c)) db.exec(`ALTER TABLE products ADD COLUMN ${c} TEXT`);
  if (!db.prepare("PRAGMA table_info(users)").all().some((c) => c.name === "avatar")) db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
  db.exec("CREATE TABLE IF NOT EXISTS auth_throttle (key TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_at INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0)");
  const cols = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
  for (const c of ["delivered_at", "razorpay_refund_id", "refunded_at", "refund_note"]) {
    if (!cols.includes(c)) db.exec(`ALTER TABLE orders ADD COLUMN ${c} TEXT`);
  }
}

function open() {
  if (!g.__maisonDbRW) {
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
    g.__maisonDbRW = new DatabaseSync(path.join(process.cwd(), "data", "maison.db"));
    g.__maisonDbRW.exec("PRAGMA foreign_keys = ON;");
    ensureSchema(g.__maisonDbRW);
  }
  return g.__maisonDbRW;
}

// SQLite ke rows ko saadhe (plain) objects mein badalta hai,
// taaki Next.js unhe client components ko bhej sake
const plain = (row) => (row ? { ...row } : row);

export function all(sql, ...params) {
  return open().prepare(sql).all(...params).map(plain);
}

export function one(sql, ...params) {
  return plain(open().prepare(sql).get(...params));
}

// INSERT / UPDATE / DELETE ke liye
export function run(sql, ...params) {
  return open().prepare(sql).run(...params);
}

// Kai changes ek saath: ya to sab ho, ya kuch bhi nahi (beech mein error aaye to)
export function transaction(fn) {
  const db = open();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

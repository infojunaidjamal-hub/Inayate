// Database helper: Node ka built-in SQLite use hota hai (koi extra package nahi)
import path from "node:path";
import { BLOG_SEED } from "@/lib/blogSeed";
import { runMigrations } from "./migrate";

const g = globalThis;

// Naye columns apne aap jud jate hain (purana data safe rehta hai)
function ensureSchema(db) {
  const pc = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
  for (const c of ["specs", "group_key"]) if (!pc.includes(c)) db.exec(`ALTER TABLE products ADD COLUMN ${c} TEXT`);
  if (!db.prepare("PRAGMA table_info(users)").all().some((c) => c.name === "avatar")) db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
  const uc = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  for (const [c, t] of [["totp_secret", "TEXT"], ["totp_pending", "TEXT"], ["totp_last", "INTEGER DEFAULT 0"], ["must_change", "INTEGER DEFAULT 0"], ["disabled", "INTEGER DEFAULT 0"], ["last_login", "TEXT"]]) {
    if (!uc.includes(c)) db.exec(`ALTER TABLE users ADD COLUMN ${c} ${t}`);
  }
  db.exec("CREATE TABLE IF NOT EXISTS backup_codes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, hash TEXT NOT NULL, used_at TEXT)");
  db.exec("CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_name TEXT, action TEXT NOT NULL, detail TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("CREATE TABLE IF NOT EXISTS auth_throttle (key TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_at INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0)");
  const cols = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
  for (const c of ["delivered_at", "razorpay_refund_id", "refunded_at", "refund_note", "razorpay_order_id", "razorpay_payment_id"]) {
    if (!cols.includes(c)) db.exec(`ALTER TABLE orders ADD COLUMN ${c} TEXT`);
  }
  // checkout redesign: shipping method, COD fee, coupon, discounts, order note, gift flag
  for (const [c, t] of [["ship_method", "TEXT"], ["cod_fee", "INTEGER DEFAULT 0"], ["coupon", "TEXT"], ["coupon_discount", "INTEGER DEFAULT 0"], ["online_discount", "INTEGER DEFAULT 0"], ["order_note", "TEXT"], ["gift", "INTEGER DEFAULT 0"]]) {
    if (!cols.includes(c)) db.exec(`ALTER TABLE orders ADD COLUMN ${c} ${t}`);
  }

  // profile photo ka shape, "back in stock" requests, mobile/email badalne ke codes
  if (!db.prepare("PRAGMA table_info(users)").all().some((c) => c.name === "avatar_shape")) db.exec("ALTER TABLE users ADD COLUMN avatar_shape TEXT DEFAULT 'circle'");
  db.exec("UPDATE users SET avatar_shape = 'circle' WHERE avatar_shape IS NOT NULL AND avatar_shape <> 'circle'"); // purani square photo bhi ab gol
  db.exec(`CREATE TABLE IF NOT EXISTS stock_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, user_id INTEGER, contact TEXT NOT NULL, kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_waiting ON stock_alerts(product_id, contact) WHERE status = 'waiting'");
  db.exec(`CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL,
    code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`);

  // Blog: posts aur unse jude products. Table pehli baar banti hai to 4 sample posts jud jate hain.
  const blogFresh = !db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'blog_posts'").get();
  db.exec(`CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT, body TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General', cover_url TEXT, cover_alt TEXT, meta_title TEXT, meta_desc TEXT, focus_kw TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', author TEXT, published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS blog_post_products (
    post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (post_id, product_id))`);
  if (blogFresh) {
    const ins = db.prepare("INSERT INTO blog_posts (slug, title, excerpt, body, category, focus_kw, status, author, published_at) VALUES (?,?,?,?,?,?,'Published','Inayate Bags',?)");
    for (const p of BLOG_SEED) ins.run(p.slug, p.title, p.excerpt, p.body, p.category, p.focus, p.date);
  }
}

function open() {
  if (!g.__maisonDbRW) {
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
    g.__maisonDbRW = new DatabaseSync(path.join(process.cwd(), "data", "maison.db"));
    g.__maisonDbRW.exec("PRAGMA foreign_keys = ON;");
  }
  // Schema aur migrations ek hi baar chalte hain. Dev server pehle se chal raha ho (purana connection bacha ho)
  // tab bhi naya code pehle request par apne aap migration laga deta hai.
  if (g.__maisonSchema !== 14) {
    ensureSchema(g.__maisonDbRW);
    runMigrations(g.__maisonDbRW);
    g.__maisonSchema = 14;
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
// Andar andar bulane par (transaction ke andar transaction) sabse bahar wala hi BEGIN / COMMIT karta hai
export function transaction(fn) {
  const db = open();
  if (g.__maisonTxDepth > 0) return fn();
  g.__maisonTxDepth = 1;
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  } finally {
    g.__maisonTxDepth = 0;
  }
}

export { inr } from "./money"; // ek hi jagah: lib/money.js

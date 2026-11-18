// Database badlav ek hi baar lagte hain (schema_migrations table mein likha rehta hai kaun sa lag chuka).
// Naya badlav lagne se pehle database ka backup bhi ban jata hai.
import { makeBackup } from "./backup";
import { p5Up } from "./migrateP5";

function cols(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}
function addCol(db, table, col, type) {
  if (!cols(db, table).includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
}

const MIGRATIONS = [
  {
    id: "p1_001_catalog",
    name: "Categories, variants, ratings, outbox",
    up(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        position INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        photo TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS categories_unique ON categories (COALESCE(parent_id, 0), lower(name))");

      for (const [c, t] of [["category_id", "INTEGER"], ["subcategory_id", "INTEGER"], ["subcategory", "TEXT"], ["option_names", "TEXT"],
        ["rating_start", "REAL"], ["rating_start_count", "INTEGER NOT NULL DEFAULT 0"], ["show_rating", "INTEGER NOT NULL DEFAULT 1"]]) addCol(db, "products", c, t);

      db.exec(`CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku TEXT NOT NULL UNIQUE,
        opts TEXT NOT NULL,
        label TEXT NOT NULL,
        price INTEGER NOT NULL,
        mrp INTEGER NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        position INTEGER NOT NULL DEFAULT 0
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS product_variants_pid ON product_variants (product_id)");

      for (const [c, t] of [["variant_id", "INTEGER"], ["variant_label", "TEXT"], ["sku", "TEXT"]]) addCol(db, "order_items", c, t);

      db.exec(`CREATE TABLE IF NOT EXISTS message_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        channel TEXT NOT NULL DEFAULT 'email',
        to_addr TEXT,
        subject TEXT,
        body TEXT NOT NULL,
        kind TEXT,
        ref TEXT,
        status TEXT NOT NULL DEFAULT 'saved'
      )`);

      // Purani text categories ko categories table mein laao (kuch delete nahi hota; "Tote" aur "tote" ek ho jate hain)
      const used = db.prepare("SELECT DISTINCT TRIM(category) AS c FROM products WHERE category IS NOT NULL AND TRIM(category) <> '' ORDER BY c").all();
      const ins = db.prepare("INSERT OR IGNORE INTO categories (name, position) VALUES (?, ?)");
      used.forEach((r, i) => ins.run(r.c, i));
      for (const c of db.prepare("SELECT id, name FROM categories WHERE parent_id IS NULL").all()) {
        db.prepare("UPDATE products SET category_id = ?, category = ? WHERE lower(TRIM(category)) = lower(?)").run(c.id, c.name, c.name);
      }
    },
  },
  {
    id: "p1_002_swatches",
    name: "Colour swatches for variant options",
    up(db) {
      addCol(db, "products", "option_swatches", "TEXT"); // {"Black":"#1f1b19"} seller ke chune colours
    },
  },
  {
    id: "p1_003_groups",
    name: "Listing groups: label and order inside a group",
    up(db) {
      addCol(db, "products", "group_label", "TEXT"); // group mein is listing ka naam (jaise Wine)
      addCol(db, "products", "group_pos", "INTEGER NOT NULL DEFAULT 0"); // group mein order
    },
  },
  {
    id: "p3_001_order_flow",
    name: "Order flow: status history, hold, COD confirm, NDR/RTO, return photos",
    up(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS order_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'status',
        code TEXT,
        label TEXT,
        detail TEXT,
        by_id INTEGER,
        by_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS order_events_oid ON order_events (order_id)");
      for (const [c, t] of [["hold_reasons", "TEXT"], ["hold_at", "TEXT"], ["confirmed_at", "TEXT"], ["packed_at", "TEXT"], ["ready_at", "TEXT"],
        ["picked_at", "TEXT"], ["cod_token", "TEXT"], ["cod_sent_at", "TEXT"], ["cod_confirmed_at", "TEXT"],
        ["ndr_attempts", "INTEGER NOT NULL DEFAULT 0"], ["ndr_reason", "TEXT"], ["rto_stage", "TEXT"],
        ["cancel_reason", "TEXT"], ["cancelled_by", "TEXT"], ["cancelled_at", "TEXT"]]) addCol(db, "orders", c, t);
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS orders_cod_token ON orders (cod_token) WHERE cod_token IS NOT NULL");
      for (const [c, t] of [["reason_code", "TEXT"], ["photos", "TEXT"], ["stage", "TEXT"]]) addCol(db, "returns", c, t);

      // Purane orders todte nahi: naye naam par le aate hain
      const hasDelivered = cols(db, "orders").includes("delivered_at");
      db.exec("UPDATE orders SET status = 'Confirmed', confirmed_at = created_at WHERE status = 'Placed'");
      db.exec("UPDATE orders SET confirmed_at = created_at WHERE confirmed_at IS NULL AND status IN ('Confirmed','Packed','Shipped','Delivered')");
      db.exec("UPDATE orders SET status = 'In transit', picked_at = COALESCE(picked_at, created_at) WHERE status = 'Shipped'");
      db.exec("INSERT INTO order_events (order_id, kind, code, label, created_at, by_name) SELECT id, 'status', 'Placed', 'Order placed', created_at, 'Buyer' FROM orders");
      if (hasDelivered) db.exec("INSERT INTO order_events (order_id, kind, code, label, created_at, by_name) SELECT id, 'status', 'Delivered', 'Delivered', delivered_at, 'Seller' FROM orders WHERE delivered_at IS NOT NULL");
      db.exec("INSERT INTO order_events (order_id, kind, code, label, created_at, by_name) SELECT id, 'status', 'Cancelled', 'Cancelled', created_at, 'System' FROM orders WHERE status = 'Cancelled'");
      // Purane returns: stage set karo
      db.exec("UPDATE returns SET stage = 'requested' WHERE stage IS NULL AND status = 'Requested'");
      db.exec("UPDATE returns SET stage = 'accepted' WHERE stage IS NULL AND status = 'Approved'");
      db.exec("UPDATE returns SET stage = 'rejected' WHERE stage IS NULL AND status = 'Rejected'");
      db.exec("UPDATE returns SET stage = 'refunded' WHERE stage IS NULL AND status = 'Refunded'");
      db.exec("INSERT INTO order_events (order_id, kind, code, label, created_at, by_name) SELECT order_id, 'return', 'requested', 'Return requested', created_at, 'Buyer' FROM returns");
    },
  },
  {
    id: "p9_001_chatbot",
    name: "Chatbot: chat log (questions, topic, answered, sent to WhatsApp)",
    up(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        question TEXT NOT NULL,
        intent TEXT,
        answered INTEGER NOT NULL DEFAULT 1,
        handover INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS chat_logs_created ON chat_logs (created_at)");
    },
  },
  {
    id: "p9_002_chat_answers",
    name: "Chatbot: answers taught by the seller",
    up(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS chat_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        phrases TEXT,
        answer TEXT NOT NULL,
        link_label TEXT,
        link_url TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        uses INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
    },
  },
  {
    id: "p9_003_chat_languages",
    name: "Chatbot: taught answers in Hinglish / Hindi / Gujarati, language in chat log",
    up(db) {
      const has = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
      for (const col of ["answer_hl", "answer_hi", "answer_gu"]) if (!has("chat_answers", col)) db.exec(`ALTER TABLE chat_answers ADD COLUMN ${col} TEXT`);
      if (!has("chat_logs", "lang")) db.exec("ALTER TABLE chat_logs ADD COLUMN lang TEXT");
    },
  },
  {
    id: "p8_001_customers_activity",
    name: "Customers 360 (notes, tags, wallet ledger), subscriber unsubscribe, activity log area",
    up(db) {
      const has = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
      db.exec(`CREATE TABLE IF NOT EXISTS customer_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        note TEXT NOT NULL,
        author_id INTEGER,
        author_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS customer_notes_user ON customer_notes (user_id)");
      db.exec(`CREATE TABLE IF NOT EXISTS customer_tags (
        user_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (user_id, tag)
      )`);
      // Wallet abhi ban raha hai: ye sirf credit / debit ka khata hai (amount rupaye mein, debit minus). Checkout abhi isse nahi judta.
      db.exec(`CREATE TABLE IF NOT EXISTS wallet_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        order_no TEXT,
        by_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS wallet_ledger_user ON wallet_ledger (user_id)");
      if (!has("subscribers", "unsubscribed_at")) db.exec("ALTER TABLE subscribers ADD COLUMN unsubscribed_at TEXT");
      if (!has("activity_log", "area")) db.exec("ALTER TABLE activity_log ADD COLUMN area TEXT");
      db.exec(`UPDATE activity_log SET area = CASE
        WHEN action LIKE 'chat_answer%' THEN 'Chatbot'
        WHEN action LIKE 'Staff%' THEN 'Team'
        WHEN action LIKE 'Login%' OR action LIKE 'Password badla%' OR action LIKE 'OTP%' OR action LIKE 'Naye backup%' OR action LIKE 'Backup code%' THEN 'Security'
        WHEN action LIKE 'Refund%' THEN 'Payments'
        WHEN action LIKE 'Customer%' OR action LIKE 'Wallet%' THEN 'Customers'
        WHEN action LIKE 'Subscriber%' THEN 'Subscribers'
        WHEN action LIKE 'Return%' THEN 'Returns'
        WHEN action LIKE 'Order%' OR action LIKE 'Hold order%' OR action LIKE 'RTO%' THEN 'Orders'
        WHEN action LIKE 'Blog%' THEN 'Blog'
        WHEN action LIKE 'Product%' OR action LIKE 'Listing group%' THEN 'Products'
        ELSE 'Other' END WHERE area IS NULL`);
      db.exec("DELETE FROM activity_log WHERE created_at < datetime('now', '-30 days')"); // sirf 30 din ka log
      db.exec("CREATE INDEX IF NOT EXISTS activity_log_created ON activity_log (created_at)");
    },
  },
  {
    id: "p4_001_logistics",
    name: "Logistics: couriers, rates, pincodes, shipments, NDR, RTO costs, box size",
    up(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS couriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'manual',
        active INTEGER NOT NULL DEFAULT 1,
        no_cod INTEGER NOT NULL DEFAULT 0,
        cod_fee INTEGER NOT NULL DEFAULT 0,
        rto_charge INTEGER NOT NULL DEFAULT 0,
        extra_pct REAL NOT NULL DEFAULT 0,
        ndr_attempts INTEGER NOT NULL DEFAULT 3,
        express INTEGER NOT NULL DEFAULT 0,
        flat INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0
      )`);
      db.exec(`CREATE TABLE IF NOT EXISTS courier_rates (
        courier_id INTEGER NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
        zone TEXT NOT NULL,
        first INTEGER NOT NULL,
        extra INTEGER NOT NULL DEFAULT 0,
        dmin INTEGER NOT NULL DEFAULT 1,
        dmax INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (courier_id, zone)
      )`);
      db.exec(`CREATE TABLE IF NOT EXISTS courier_pincodes (
        courier_id INTEGER NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
        pincode TEXT NOT NULL,
        city TEXT,
        zone TEXT NOT NULL,
        cod INTEGER NOT NULL DEFAULT 1,
        prepaid INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (courier_id, pincode)
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS courier_pincodes_pin ON courier_pincodes (pincode)");
      db.exec(`CREATE TABLE IF NOT EXISTS shipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        courier_id INTEGER,
        courier_name TEXT,
        awb TEXT,
        zone TEXT,
        pickup_date TEXT,
        weight_g INTEGER, box_l INTEGER, box_w INTEGER, box_h INTEGER,
        charged_kg REAL,
        freight INTEGER NOT NULL DEFAULT 0,
        cod_fee INTEGER NOT NULL DEFAULT 0,
        recommended_id INTEGER,
        override_reason TEXT,
        ndr_max INTEGER NOT NULL DEFAULT 3,
        refreshed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      db.exec(`CREATE TABLE IF NOT EXISTS shipment_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
        order_id INTEGER NOT NULL,
        code TEXT, label TEXT, detail TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS shipment_events_sid ON shipment_events (shipment_id)");
      db.exec(`CREATE TABLE IF NOT EXISTS ndr_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        attempt INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        reason TEXT,
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'open',
        reply TEXT,
        replied_at TEXT,
        message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS ndr_cases_oid ON ndr_cases (order_id)");
      db.exec(`CREATE TABLE IF NOT EXISTS order_costs (
        order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        freight INTEGER NOT NULL DEFAULT 0,
        cod_fee INTEGER NOT NULL DEFAULT 0,
        return_freight INTEGER NOT NULL DEFAULT 0,
        rto_charge INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      for (const [c, t] of [["box_l", "INTEGER"], ["box_w", "INTEGER"], ["box_h", "INTEGER"]]) addCol(db, "products", c, t);
      for (const [c, t] of [["ndr_max", "INTEGER"], ["promised_by", "TEXT"], ["rto_qc", "TEXT"], ["rto_note", "TEXT"], ["rto_received_at", "TEXT"]]) addCol(db, "orders", c, t);

      // Dummy partners aur rates (aap baad mein asli numbers se badal lena). Pincodes bhare nahi jate: "Load sample pincodes" button se.
      if (db.prepare("SELECT COUNT(*) c FROM couriers").get().c === 0) {
        const P = [
          ["Local rider (Surat)", 2, 0, 25, 1, 0, { A: [40, 0, 1, 1] }],
          ["DTDC", 3, 0, 35, 0, 0, { A: [28, 20, 2, 3], B: [36, 26, 3, 4], C: [44, 32, 4, 5], D: [52, 40, 5, 7], E: [70, 56, 7, 10] }],
          ["Delhivery", 3, 1, 30, 0, 0, { A: [32, 22, 1, 2], B: [40, 28, 2, 3], C: [48, 36, 3, 4], D: [58, 44, 4, 6], E: [78, 62, 6, 9] }],
          ["Bluedart", 3, 0, 34, 0, 0, { A: [45, 30, 1, 1], B: [52, 36, 1, 2], C: [60, 44, 2, 3], D: [72, 54, 3, 5], E: [95, 76, 5, 7] }],
          ["India Post (Speed Post)", 3, 0, 0, 0, 1, { A: [24, 16, 3, 5], B: [30, 20, 3, 6], C: [38, 26, 4, 7], D: [46, 32, 5, 9], E: [60, 42, 7, 10] }],
        ];
        const ic = db.prepare("INSERT INTO couriers (name, ndr_attempts, express, cod_fee, flat, no_cod, active, position) VALUES (?,?,?,?,?,?,?,?)");
        const ir = db.prepare("INSERT INTO courier_rates (courier_id, zone, first, extra, dmin, dmax) VALUES (?,?,?,?,?,?)");
        P.forEach((p, i) => {
          const id = Number(ic.run(p[0], p[1], p[2], p[3], p[4], p[5], i === 4 ? 0 : 1, i).lastInsertRowid);
          for (const [z, r] of Object.entries(p[6])) ir.run(id, z, r[0], r[1], r[2], r[3]);
        });
      }
      // Dummy pincodes (testing ke liye). Asli list baad mein Excel upload se: purani rows update hoti hain.
      if (db.prepare("SELECT COUNT(*) c FROM courier_pincodes").get().c === 0) {
        const PINS = [["395009", "Surat (Adajan)", "A"], ["395007", "Surat (Vesu)", "A"], ["380001", "Ahmedabad", "B"], ["390001", "Vadodara", "B"], ["400001", "Mumbai", "C"], ["110001", "New Delhi", "C"], ["411001", "Pune", "C"], ["560001", "Bengaluru", "D"], ["700001", "Kolkata", "D"], ["781001", "Guwahati", "E"], ["190001", "Srinagar", "E"]];
        const ip = db.prepare("INSERT OR IGNORE INTO courier_pincodes (courier_id, pincode, city, zone, cod, prepaid) VALUES (?,?,?,?,?,1)");
        for (const c of db.prepare("SELECT id, no_cod FROM couriers").all()) {
          const zones = new Set(db.prepare("SELECT zone FROM courier_rates WHERE courier_id = ?").all(c.id).map((r) => r.zone));
          for (const [pin, city, zone] of PINS) if (zones.has(zone)) ip.run(c.id, pin, city, zone, c.no_cod ? 0 : 1);
        }
      }
      // purane orders ke liye ndr_max
      db.exec("UPDATE orders SET ndr_max = 3 WHERE ndr_max IS NULL");
    },
  },
  {
    id: "p7_001_insights",
    name: "Insights: anonymous shop events",
    up(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS shop_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        visitor TEXT,
        product_id INTEGER,
        variant_id INTEGER,
        order_id INTEGER,
        value INTEGER,
        ts TEXT NOT NULL DEFAULT (datetime('now')))`);
      db.exec("CREATE INDEX IF NOT EXISTS shop_events_ev_ts ON shop_events (event, ts)");
      db.exec("CREATE INDEX IF NOT EXISTS shop_events_prod ON shop_events (product_id, event, ts)");
    },
  },
  {
    id: "p0_001_performance_indexes",
    name: "Speed: indexes for the columns the shop, seller panel and chatbot search on",
    up(db) {
      // Safe by design: har index se pehle dekhta hai ki table aur column hai, aur pehle se koi index (UNIQUE / PRIMARY KEY ya purana) wahi column
      // sabse aage rakhta hai to chhod deta hai. Isliye base schema kuch bhi ho, ye kabhi fail nahi hota aur doosri baar chalane par kuch nahi badalta.
      const colsOf = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
      const covered = (t, cols) =>
        db.prepare(`PRAGMA index_list(${t})`).all().some((ix) => {
          const have = db.prepare(`PRAGMA index_info(${ix.name})`).all().sort((a, b) => a.seqno - b.seqno).map((c) => c.name);
          return cols.every((c, i) => have[i] === c);
        });
      const make = (table, cols, expr) => {
        const have = colsOf(table);
        if (!have.length || !cols.every((c) => have.includes(c))) return; // table ya column nahi hai
        if (!expr && covered(table, cols)) return; // pehle se hai
        const name = `ix_${table}_${cols.join("_")}${expr ? "_ci" : ""}`;
        db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${expr || cols.join(", ")})`);
      };
      // Orders: customer ke orders, status + date ki list, date ke reports, Razorpay webhook ki khoj
      make("orders", ["user_id"]);
      make("orders", ["status", "created_at"]);
      make("orders", ["created_at"]);
      make("orders", ["razorpay_order_id"]);
      make("order_items", ["order_id"]);
      make("order_items", ["product_id"]);
      make("returns", ["order_id"]);
      make("returns", ["user_id"]);
      make("shipments", ["order_id"]);
      make("shipments", ["awb"]);
      // Catalogue
      make("products", ["status"]);
      make("products", ["category_id"]);
      make("products", ["group_key"]);
      make("products", ["sku"]);
      make("product_images", ["product_id", "position"]);
      make("product_variants", ["product_id"]);
      make("reviews", ["product_id"]);
      make("reviews", ["user_id"]);
      make("stock_alerts", ["product_id"]);
      make("stock_alerts", ["user_id"]);
      // Customers
      make("users", ["role"]);
      make("users", ["email"], "lower(email)"); // email se khoj (subscribers ke saath jodna, duplicate check)
      make("addresses", ["user_id"]);
      make("wishlist", ["user_id"]);
      make("wishlist", ["product_id"]);
      make("customer_tags", ["tag"]);
      make("message_outbox", ["status"]);
      make("chat_logs", ["created_at"]);
      db.exec("ANALYZE"); // query planner ko naye index ka andaza de do
    },
  },
  {
    id: "p5_001_returns_invoices",
    name: "Returns by item, refund destination and ledger, GST invoices, credit notes, business settings, product HSN",
    up: p5Up,
  },
  {
    id: "sv_001_style_videos",
    name: "Home page: Style Story videos",
    up(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS style_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file TEXT NOT NULL,
        poster TEXT,
        product_id INTEGER NOT NULL,
        line1 TEXT NOT NULL DEFAULT '',
        line2 TEXT NOT NULL DEFAULT '',
        duration INTEGER,
        bytes INTEGER,
        position INTEGER NOT NULL DEFAULT 0,
        live INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS ix_style_videos_live ON style_videos (live, position)");
    },
  },
];

export function runMigrations(db) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, name TEXT, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  const done = new Set(db.prepare("SELECT id FROM schema_migrations").all().map((r) => r.id));
  const pending = MIGRATIONS.filter((m) => !done.has(m.id));
  if (!pending.length) return;
  // Purane database mein kuch hai to pehle uska backup (pehli baar ka naya database khali hota hai)
  try { if (db.prepare("SELECT COUNT(*) c FROM products").get().c > 0) makeBackup(db, "before-" + pending[0].id); } catch (e) { console.error("backup:", e); }
  for (const m of pending) {
    db.exec("BEGIN");
    try {
      m.up(db);
      db.prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)").run(m.id, m.name);
      db.exec("COMMIT");
      console.log("[migrate] applied", m.id);
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

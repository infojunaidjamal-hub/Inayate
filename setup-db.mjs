// Maison Bags: local database setup (built-in SQLite, no extra packages)
// Run from project folder:  node setup-db.mjs
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";

mkdirSync("data", { recursive: true });
const FILE = "data/maison.db";
if (existsSync(FILE)) unlinkSync(FILE); // fresh start every time you run this script
const db = new DatabaseSync(FILE);
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'buyer',      -- buyer | seller
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT, name TEXT, line TEXT NOT NULL, city TEXT, state TEXT, pincode TEXT NOT NULL,
  is_default INTEGER DEFAULT 0
);
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, sku TEXT UNIQUE, category TEXT,
  price INTEGER NOT NULL, mrp INTEGER, stock INTEGER DEFAULT 0,
  material TEXT, colours TEXT, size TEXT, weight_g INTEGER, gst_percent INTEGER DEFAULT 12,
  description TEXT, status TEXT DEFAULT 'Active',  -- Active | Draft
  colour_main TEXT, colour_dark TEXT,              -- used for demo illustration
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL, position INTEGER DEFAULT 0
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  ship_name TEXT, ship_mobile TEXT, ship_address TEXT,
  subtotal INTEGER, shipping INTEGER, total INTEGER,
  pay_method TEXT,                                  -- UPI | Card | Netbanking | COD
  pay_status TEXT,                                  -- Paid | COD Pending | Refund Initiated | Refunded | Cancelled
  status TEXT DEFAULT 'Placed',                     -- Placed | Confirmed | Packed | Shipped | Delivered | Cancelled | Return Requested | Return Approved | Return Rejected | Refunded
  courier TEXT, awb TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  name TEXT, price INTEGER, qty INTEGER
);
CREATE TABLE returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT, status TEXT DEFAULT 'Requested',     -- Requested | Approved | Rejected | Refunded
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE wishlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, product_id)
);
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  author TEXT, rating INTEGER, title TEXT, body TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const hash = (pw) => { const s = randomBytes(16).toString("hex"); return s + ":" + scryptSync(pw, s, 64).toString("hex"); };

// Users
const addUser = db.prepare("INSERT INTO users (name,mobile,email,password_hash,role) VALUES (?,?,?,?,?)");
const seller = addUser.run("Maison Seller", "9000000000", "seller@maison.local", hash("seller123"), "seller").lastInsertRowid;
const buyer = addUser.run("Priya Shah", "9999999999", "priya@example.com", null, "buyer").lastInsertRowid;
const buyer2 = addUser.run("Neha Kapoor", "9810000002", null, null, "buyer").lastInsertRowid;

db.prepare("INSERT INTO addresses (user_id,label,name,line,city,state,pincode,is_default) VALUES (?,?,?,?,?,?,?,1)")
  .run(buyer, "Home", "Priya Shah", "12 Demo Society, Adajan", "Surat", "Gujarat", "395009");

// Products
const P = [
  ["Classic Tote","MB-TOT-01","Tote",2499,3299,12,"#b8865b","#8a5d3a","Active"],
  ["Blush Sling","MB-SLG-02","Sling",1799,2399,20,"#e9b5ab","#c98a7e","Active"],
  ["Noir Satchel","MB-SAT-03","Satchel",2999,3999,3,"#3a3532","#1f1b19","Active"],
  ["Ivory Clutch","MB-CLT-04","Clutch",1299,1799,15,"#efe6d8","#cdbda3","Active"],
  ["Olive Shoulder Bag","MB-SHD-05","Shoulder",2199,2899,8,"#8c8a5a","#66643c","Active"],
  ["Wine Mini Bag","MB-SLG-06","Sling",1599,2099,0,"#8b3a4a","#5f2230","Active"],
  ["Tan Weekender","MB-TOT-07","Tote",3499,4499,6,"#c79a6b","#9a6f45","Active"],
  ["Gold Evening Clutch","MB-CLT-08","Clutch",1899,2499,10,"#d8b878","#b08f4c","Draft"],
];
const addP = db.prepare(`INSERT INTO products
  (name,sku,category,price,mrp,stock,colour_main,colour_dark,status,material,size,weight_g,gst_percent,description)
  VALUES (?,?,?,?,?,?,?,?,?, 'Premium Vegan Leather','30 x 12 x 28 cm',650,12,
  'Stylish handbag for everyday use. Spacious interior, strong handles and a detachable strap.')`);
for (const p of P) addP.run(...p);

// Orders
const orderNo = (n) => "MB" + n;
const addO = db.prepare(`INSERT INTO orders
  (order_no,user_id,ship_name,ship_mobile,ship_address,subtotal,shipping,total,pay_method,pay_status,status,courier,awb)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const addI = db.prepare("INSERT INTO order_items (order_id,product_id,name,price,qty) VALUES (?,?,?,?,?)");
const make = (no, uid, nm, mob, addr, items, pm, ps, st, cr, awb) => {
  const sub = items.reduce((s, i) => s + i[2] * i[3], 0), ship = sub >= 1999 ? 0 : 99;
  const id = addO.run(orderNo(no), uid, nm, mob, addr, sub, ship, sub + ship, pm, ps, st, cr, awb).lastInsertRowid;
  for (const i of items) addI.run(id, ...i);
  return id;
};
const A1 = "12 Demo Society, Adajan, Surat 395009";
make(1043, buyer, "Priya Shah", "9999999999", A1, [[1,"Classic Tote",2499,1]], "UPI","Paid","Placed","","");
make(1042, buyer, "Priya Shah", "9999999999", A1, [[4,"Ivory Clutch",1299,1]], "COD","COD Pending","Shipped","Delhivery","DL4829113");
make(1041, buyer2, "Neha Kapoor", "9810000002", "B-4 Palm Heights, Vesu, Surat 395007", [[2,"Blush Sling",1799,2]], "Card","Paid","Delivered","Bluedart","BD771920");
const r = make(1039, null, "Anita Rao", "9820000003", "44 MG Road, Pune 411001", [[3,"Noir Satchel",2999,1]], "UPI","Paid","Return Requested","Delhivery","DL4701220");
db.prepare("INSERT INTO returns (order_id,reason) VALUES (?, 'Colour looks different')").run(r);

// Reviews
const addR = db.prepare("INSERT INTO reviews (product_id,author,rating,title,body) VALUES (?,?,?,?,?)");
addR.run(1,"Priya S.",5,"Brilliant","Quality bahut achhi hai, photo jaisa hi mila.");
addR.run(1,"Neha K.",4,"Value for money","Is price mein premium look.");
addR.run(2,"Anita R.",5,"Wonderful","Delivery fast thi aur packing safe.");

// Summary
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log("\nDatabase ready: " + FILE);
for (const t of ["users","addresses","products","orders","order_items","returns","reviews"]) console.log("  " + t.padEnd(12) + count(t));
console.log("\nSample products:");
for (const p of db.prepare("SELECT name, price, stock, status FROM products LIMIT 3").all()) console.log("  ", p.name, "| Rs", p.price, "| stock", p.stock, "|", p.status);
console.log("\nSeller login: seller@maison.local / seller123");
db.close();

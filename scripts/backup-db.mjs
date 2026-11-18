// Database ka backup abhi turant (website chalti ho tab bhi chalega):  node scripts/backup-db.mjs
// Backup data/backups/ folder mein jata hai. Roz ka backup website khud bhi banati hai (14 din ke).
//
// Backup se wapas lane ke liye: website band karo, phir data/maison.db ko data/backups/ ki kisi file se badal do.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const db = path.join(process.cwd(), "data", "maison.db");
if (!fs.existsSync(db)) { console.log("X data/maison.db nahi mili. Ye script maison-bags folder se chalayein."); process.exit(1); }
const dir = path.join(process.cwd(), "data", "backups");
fs.mkdirSync(dir, { recursive: true });
const now = new Date(Date.now() + 330 * 60000).toISOString().replace(/[:T]/g, "-").slice(0, 19);
const file = path.join(dir, `maison-manual-${now}.db`);
const d = new DatabaseSync(db);
d.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
d.close();
console.log("Backup ban gaya:", path.relative(process.cwd(), file), `(${Math.round(fs.statSync(file).size / 1024)} KB)`);

// Database ka backup: data/backups folder mein. Roz ek (pehli request par apne aap), 14 din ke rakhe jate hain.
import fs from "node:fs";
import path from "node:path";

const KEEP_DAYS = 14;
const dir = () => path.join(process.cwd(), "data", "backups");
const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10); // India ki date

// db = khula database. VACUUM INTO se saaf, poori copy banti hai (chalte database par bhi safe)
export function makeBackup(db, tag = "") {
  fs.mkdirSync(dir(), { recursive: true });
  const name = `maison-${tag || today()}.db`;
  const file = path.join(dir(), name);
  if (fs.existsSync(file)) return file;
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}

// Roz ka backup: aaj ka na ho to bana do, purane (14 din se zyada) hata do
export function ensureDailyBackup(db) {
  try {
    const file = path.join(dir(), `maison-${today()}.db`);
    if (!fs.existsSync(file)) makeBackup(db);
    const limit = Date.now() - KEEP_DAYS * 864e5;
    for (const f of fs.readdirSync(dir())) {
      if (!/^maison-\d{4}-\d{2}-\d{2}\.db$/.test(f)) continue; // before-... wale backup chhedte nahi
      const p = path.join(dir(), f);
      if (fs.statSync(p).mtimeMs < limit) fs.unlinkSync(p);
    }
  } catch (e) {
    console.error("daily backup:", e);
  }
}

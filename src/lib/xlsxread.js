// Excel (.xlsx) aur CSV file padhne wala chhota tool (koi extra package nahi)
import { inflateRawSync } from "node:zlib";

const MAX_ENTRY = 20 * 1024 * 1024;

function unzip(buf) {
  let e = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("Ye sahi Excel (.xlsx) file nahi lag rahi");
  const count = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Excel file kharab lag rahi hai");
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    files.set(name, { method, csize, usize, off });
    p += 46 + nlen + xlen + clen;
  }
  return (name) => {
    const f = files.get(name);
    if (!f) return null;
    if (f.usize > MAX_ENTRY) throw new Error("File bahut badi hai");
    const start = f.off + 30 + buf.readUInt16LE(f.off + 26) + buf.readUInt16LE(f.off + 28);
    const raw = buf.subarray(start, start + f.csize);
    return (f.method === 0 ? raw : inflateRawSync(raw, { maxOutputLength: MAX_ENTRY })).toString("utf8");
  };
}

const unesc = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const textOf = (xml) => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unesc(m[1])).join("");
const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/[^A-Z]/gi, "").toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const attr = (s, name) => (s.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];

// Return: [{ name, rows: [[cell, cell...], ...] }]  (cells hamesha text mein)
export function readXlsx(buf) {
  const read = unzip(buf);
  const wb = read("xl/workbook.xml");
  if (!wb) throw new Error("Ye Excel (.xlsx) file nahi lag rahi");
  const rels = new Map([...(read("xl/_rels/workbook.xml.rels") || "").matchAll(/<Relationship\b([^>]*)>/g)].map((m) => [attr(m[1], "Id"), attr(m[1], "Target")]));
  const shared = [...(read("xl/sharedStrings.xml") || "").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b([^>]*)>/g)) {
    const rid = attr(m[1], "r:id");
    let target = rels.get(rid) || "";
    target = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    const xml = read(target);
    if (!xml) continue;
    const rows = [];
    for (const rm of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowNum = Number(attr(rm[0].slice(0, rm[0].indexOf(">") + 1), "r")) || rows.length + 1;
      const cells = [];
      for (const cm of (rm[1] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = attr(cm[1], "r"), t = attr(cm[1], "t"), inner = cm[2] || "";
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = "";
        if (t === "s") val = shared[Number(v)] ?? "";
        else if (t === "inlineStr") val = textOf(inner);
        else if (t === "str") val = unesc(v ?? "");
        else if (t === "b") val = v === "1" ? "TRUE" : "FALSE";
        else if (t === "e") val = "";
        else val = v === undefined ? "" : unesc(v);
        const idx = ref ? colIndex(ref) : cells.length;
        while (cells.length < idx) cells.push("");
        cells[idx] = val;
      }
      rows[rowNum - 1] = cells;
      if (rowNum > 5000) break;
    }
    sheets.push({ name: unesc(attr(m[1], "name") || ""), rows: Array.from(rows, (r) => r || []) });
  }
  return sheets;
}

// Simple CSV padhna (quotes, comma / semicolon / tab sab chalte hain)
export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const head = text.split(/\r?\n/, 1)[0] || "";
  const delim = [",", ";", "\t"].map((d) => [d, head.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// File ka naam dekhkar xlsx ya csv padho. "Products" naam ki sheet ho to wahi, warna pehli sheet.
export function readTable(buf, fileName = "") {
  const name = fileName.toLowerCase();
  if (name.endsWith(".xls")) throw new Error("Purani .xls file nahi chalegi. Excel mein File > Save As > .xlsx chuniye.");
  const isZip = buf.length > 3 && buf[0] === 0x50 && buf[1] === 0x4b;
  if (name.endsWith(".csv") || (!isZip && !name.endsWith(".xlsx"))) return parseCsv(buf.toString("utf8"));
  const sheets = readXlsx(buf);
  if (!sheets.length) throw new Error("Excel file mein koi sheet nahi mili");
  return (sheets.find((s) => s.name.toLowerCase() === "products") || sheets[0]).rows;
}

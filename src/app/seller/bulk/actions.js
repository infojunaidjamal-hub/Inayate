"use server";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/auth";
import { readTable } from "@/lib/xlsxread";
import { FIELDS, MAX_ROWS, parseRecords, validateImport, applyImport, currentProducts, importContext } from "@/lib/bulkProducts";

// Step 1: file padho aur check karke dikhao (database mein kuch nahi badalta)
export async function previewUpload(prev, fd) {
  await requirePerm("products");
  const file = fd.get("file");
  if (!file || typeof file === "string" || !file.size) return { error: "Pehle ek Excel (.xlsx) ya CSV file chuniye" };
  if (file.size > 1_000_000) return { error: "File 1 MB se badi hai. Rows kam karke dobara try karein." };

  let parsed;
  try {
    parsed = parseRecords(readTable(Buffer.from(await file.arrayBuffer()), file.name));
  } catch (e) {
    return { error: e?.message || "File padh nahi payi. Template wali Excel file use karein." };
  }
  if (parsed.error) return { error: parsed.error };

  const v = validateImport(parsed.records, currentProducts(), importContext());
  return {
    fileName: file.name,
    counts: v.counts,
    ignored: parsed.ignored,
    rows: v.rows.map(({ rowNum, sku, name, action, changes, errors, notes, summary }) => ({ rowNum, sku, name, action, changes, errors, notes, summary })),
    payload: JSON.stringify(parsed.records),
  };
}

// Step 2: "Apply" dabane par sahi rows lagao (galat rows chhod di jati hain)
export async function applyUpload(prev, fd) {
  await requirePerm("products");
  let raw;
  try { raw = JSON.parse(String(fd.get("payload") || "[]")); } catch { raw = null; }
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ROWS) return { error: "Data padh nahi paya. File dobara upload karein." };
  const records = raw.map((r, i) => {
    const rec = { rowNum: Number(r?.rowNum) || i + 2 };
    for (const f of FIELDS) rec[f.key] = String(r?.[f.key] ?? "").slice(0, 2000);
    return rec;
  });
  try {
    const counts = applyImport(records);
    revalidatePath("/seller", "layout");
    revalidatePath("/products");
    revalidatePath("/");
    return { done: true, counts };
  } catch (e) {
    console.error("bulk apply error:", e);
    return { error: "Kuch galat hua, isliye kuch bhi nahi badla. Dobara try karein." };
  }
}

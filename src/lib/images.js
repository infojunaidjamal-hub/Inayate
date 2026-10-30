// Product photos: data/uploads folder mein save hoti hain, /uploads/<naam> se dikhti hain
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { all, one, run } from "@/lib/db";

export const MAX_IMAGES = 8;          // ek product par kitni photo
export const MAX_BYTES = 8 * 1024 * 1024; // ek photo ki limit
const dir = () => join(process.cwd(), "data", "uploads");

// File ke andar dekhkar pehchante hain ki sach mein photo hai (naam se bharosa nahi)
function kind(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG") return "png";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}

export function imagesOf(productId) {
  return all("SELECT id, url FROM product_images WHERE product_id = ? ORDER BY position, id", productId);
}

// Products ki list mein har ek ka pehla (cover) photo jod deta hai: p.image
export function withCovers(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const imgs = all(
    `SELECT product_id, url FROM product_images WHERE product_id IN (${ids.map(() => "?").join(",")}) ORDER BY position, id`,
    ...ids
  );
  const first = {};
  for (const i of imgs) if (!first[i.product_id]) first[i.product_id] = i.url;
  return rows.map((r) => ({ ...r, image: first[r.id] || null }));
}

// Seller form se: photo hatana, nayi photo save karna, cover chunna
export async function applyImages(productId, form) {
  for (const d of form.getAll("del")) run("DELETE FROM product_images WHERE id = ? AND product_id = ?", Number(d), productId);

  let skipped = 0;
  let count = one("SELECT COUNT(*) c FROM product_images WHERE product_id = ?", productId).c;
  const files = form.getAll("photos").filter((f) => typeof f !== "string" && f.size > 0);
  for (const f of files) {
    if (count >= MAX_IMAGES || f.size > MAX_BYTES) { skipped++; continue; }
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = kind(buf);
    if (!ext) { skipped++; continue; }
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    await mkdir(dir(), { recursive: true });
    await writeFile(join(dir(), name), buf);
    const pos = one("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM product_images WHERE product_id = ?", productId).p;
    run("INSERT INTO product_images (product_id, url, position) VALUES (?, ?, ?)", productId, "/uploads/" + name, pos);
    count++;
  }

  const cover = Number(form.get("cover") || 0);
  if (cover) {
    run(
      "UPDATE product_images SET position = (SELECT COALESCE(MIN(position), 0) - 1 FROM product_images WHERE product_id = ?) WHERE id = ? AND product_id = ?",
      productId, cover, productId
    );
  }
  return skipped ? `${skipped} photo save nahi hui (sirf JPG, PNG ya WEBP, 8MB tak, aur ek product par 8 photo tak).` : "";
}

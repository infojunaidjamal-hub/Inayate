import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/perms";
import { one, run } from "@/lib/db";
import { logAct } from "@/lib/activity";
import { storeImage, deleteStored } from "@/lib/images";
import { mp4Info } from "@/lib/mp4";
import { MAX_VIDEO_BYTES, MIN_SEC, MAX_SEC, MAX_LIVE, MAX_TOTAL, RATIO_LABEL, RATIO_HINT, ratioOk, cleanLine } from "@/lib/styleVideos";

export const dynamic = "force-dynamic";

const err = (error, status = 400) => Response.json({ error }, { status });

// Seller: nayi Style video. Server action ki 1 MB limit se bachne ke liye ye route hai (10 MB tak).
// File ko naam se nahi, andar dekh kar parakhte hain: sach mein MP4, 8 se 20 second, aur sahi shape (RATIO, abhi 3:4).
export async function POST(request) {
  const user = await getUser();
  if (!user || !can(user.role, "products")) return err("Please log in again.", 403);

  let form;
  try { form = await request.formData(); } catch { return err("Could not read the upload. Please try again."); }

  const file = form.get("video");
  if (!file || typeof file === "string" || !file.size) return err("Please choose an MP4 video.");
  if (file.size > MAX_VIDEO_BYTES) return err("The video is bigger than 10 MB. Please compress it and try again.");
  const buf = Buffer.from(await file.arrayBuffer());
  const info = mp4Info(buf);
  if (!info) return err("This is not a valid MP4 video. Please export it as MP4 (H.264).");
  if (!(info.seconds >= 1)) return err("Could not read the video length. Please export a standard MP4 (H.264), not a streaming or fragmented one.");
  const secs = Math.round(info.seconds);
  if (secs < MIN_SEC || secs > MAX_SEC) return err(`The video is ${secs} seconds long. It should be ${MIN_SEC} to ${MAX_SEC} seconds.`);
  if (!ratioOk(info.width, info.height)) return err(`The video should be ${RATIO_LABEL} (yours is ${Math.round(info.width)}×${Math.round(info.height)}). ${RATIO_HINT}`.trim());

  const pid = Number(form.get("product_id"));
  const product = Number.isInteger(pid) && pid > 0 ? one("SELECT id, name FROM products WHERE id = ?", pid) : null;
  if (!product) return err("Please choose the linked product.");
  const line1 = cleanLine(form.get("line1")), line2 = cleanLine(form.get("line2"));
  if (!line1) return err("Please write caption line 1.");
  if (one("SELECT COUNT(*) AS n FROM style_videos").n >= MAX_TOTAL) return err(`You can keep up to ${MAX_TOTAL} videos. Please delete an old one first.`);

  let poster = null;
  const pf = form.get("poster");
  if (pf && typeof pf !== "string" && pf.size) {
    const r = await storeImage(pf, "vposter-");
    if (r.error) return err("Poster image: " + r.error);
    poster = r.url;
  }

  const name = `vid-${Date.now()}-${randomBytes(4).toString("hex")}.mp4`;
  try {
    await mkdir(join(process.cwd(), "data", "uploads"), { recursive: true });
    await writeFile(join(process.cwd(), "data", "uploads", name), buf);
  } catch (e) {
    console.error("style video save:", e);
    if (poster) await deleteStored(poster);
    return err("Could not save the video. Please try again.", 500);
  }

  // Ek saath MAX_LIVE se zyada live nahi: naya video "off" save hota hai, seller baad mein badal sakta hai
  const live = one("SELECT COUNT(*) AS n FROM style_videos WHERE live = 1").n < MAX_LIVE ? 1 : 0;
  const pos = one("SELECT COALESCE(MAX(position), 0) + 1 AS p FROM style_videos").p;
  const r = run("INSERT INTO style_videos (file, poster, product_id, line1, line2, duration, bytes, position, live) VALUES (?,?,?,?,?,?,?,?,?)", "/vid/" + name, poster, product.id, line1, line2, secs, file.size, pos, live);
  logAct(user, "Style video added", `${line1} · ${product.name} (video ${r.lastInsertRowid})`);
  return Response.json({ ok: true, id: Number(r.lastInsertRowid), live: !!live, notice: live ? "Video saved and live on the home page." : `Video saved, but it is off because ${MAX_LIVE} videos are already live. Turn another one off to show this one.` });
}

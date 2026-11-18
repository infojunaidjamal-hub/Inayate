"use server";
// Style videos: live on/off, upar-neeche, caption badalna, hatana. Har kaam activity log mein likha jaata hai.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { deleteStored } from "@/lib/images";
import { MAX_LIVE, cleanLine } from "@/lib/styleVideos";

const back = (kind, msg) => redirect(`/seller/videos${msg ? `?${kind}=${encodeURIComponent(msg)}` : ""}`);
const done = (msg) => { revalidatePath("/seller/videos"); revalidatePath("/"); back("ok", msg); };
const row = (form) => one("SELECT * FROM style_videos WHERE id = ?", Number(form.get("id")));
const label = (v) => `${v.line1} (video ${v.id})`;

// Video file /vid/<naam>.mp4 data/uploads se hatao (poster photo deleteStored se hatti hai)
async function removeVideoFile(url) {
  const m = /^\/vid\/([\w-]+\.mp4)$/.exec(url || "");
  if (m) await unlink(join(process.cwd(), "data", "uploads", m[1])).catch(() => {});
}

export async function toggleLive(form) {
  const me = await requirePerm("products");
  const v = row(form);
  if (!v) return back("err", "Video not found.");
  if (!v.live && one("SELECT COUNT(*) AS n FROM style_videos WHERE live = 1").n >= MAX_LIVE) {
    return back("err", `${MAX_LIVE} videos are already live. Turn one off first.`);
  }
  run("UPDATE style_videos SET live = ? WHERE id = ?", v.live ? 0 : 1, v.id);
  logAct(me, v.live ? "Style video turned off" : "Style video turned on", label(v));
  done(v.live ? "Video turned off." : "Video is live on the home page.");
}

export async function moveVideo(form) {
  const me = await requirePerm("products");
  const v = row(form);
  if (!v) return back("err", "Video not found.");
  const up = form.get("dir") === "up";
  const list = all("SELECT id, position FROM style_videos ORDER BY position, id");
  const i = list.findIndex((x) => x.id === v.id), j = up ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return done("");
  // Poori list ko 1, 2, 3... se dobara number do (barabar position hone par bhi sahi chale)
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((x, k) => run("UPDATE style_videos SET position = ? WHERE id = ?", k + 1, x.id));
  logAct(me, "Style video moved", `${label(v)} ${up ? "up" : "down"}`);
  done("");
}

export async function saveVideo(form) {
  const me = await requirePerm("products");
  const v = row(form);
  if (!v) return back("err", "Video not found.");
  const line1 = cleanLine(form.get("line1")), line2 = cleanLine(form.get("line2"));
  const pid = Number(form.get("product_id"));
  const p = Number.isInteger(pid) && pid > 0 ? one("SELECT id, name FROM products WHERE id = ?", pid) : null;
  if (!line1) return back("err", "Please write caption line 1.");
  if (!p) return back("err", "Please choose the linked product.");
  run("UPDATE style_videos SET line1 = ?, line2 = ?, product_id = ? WHERE id = ?", line1, line2, p.id, v.id);
  logAct(me, "Style video edited", `${label(v)} → ${line1} · ${p.name}`);
  done("Video updated.");
}

export async function deleteVideo(form) {
  const me = await requirePerm("products");
  const v = row(form);
  if (v) {
    run("DELETE FROM style_videos WHERE id = ?", v.id);
    await removeVideoFile(v.file);
    if (v.poster) await deleteStored(v.poster);
    logAct(me, "Style video deleted", label(v));
  }
  done("Video deleted.");
}

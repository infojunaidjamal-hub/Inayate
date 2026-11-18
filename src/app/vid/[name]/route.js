import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { join } from "node:path";

// /vid/<naam>.mp4: Style story ki videos data/uploads se dikhata hai.
// Range support zaroori hai (iPhone / Safari bina iske video nahi chalate, aur aage-peeche karna isi se hota hai).
const HEAD = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };

export async function GET(req, { params }) {
  const { name } = await params;
  if (!/^[\w-]+\.mp4$/.test(name)) return new Response("Not found", { status: 404 });
  const path = join(process.cwd(), "data", "uploads", name);
  try {
    const size = (await stat(path)).size;
    const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") || "");
    if (!r) return new Response(Readable.toWeb(createReadStream(path)), { headers: { ...HEAD, "Content-Length": String(size) } });
    const start = r[1] === "" ? size - Number(r[2]) : Number(r[1]); // "bytes=-500" = aakhri 500 bytes
    const end = r[1] === "" || r[2] === "" ? size - 1 : Math.min(Number(r[2]), size - 1);
    if (!(start >= 0 && start <= end && start < size)) return new Response(null, { status: 416, headers: { ...HEAD, "Content-Range": `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(path, { start, end })), { status: 206, headers: { ...HEAD, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

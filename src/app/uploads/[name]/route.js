import { readFile } from "node:fs/promises";
import { join } from "node:path";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// /uploads/<naam> par data/uploads folder ki photo dikhata hai
export async function GET(_req, { params }) {
  const { name } = await params;
  const m = /^[\w-]+\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(join(process.cwd(), "data", "uploads", name));
    return new Response(buf, {
      headers: { "Content-Type": TYPES[m[1]], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

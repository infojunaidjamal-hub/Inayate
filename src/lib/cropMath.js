// Photo crop ka hisaab (pure code). Sab kuch photo ke ASLI pixels mein (natural px).
// box = { x, y, s }  -> square crop frame ka upar-left kona (x, y) aur side s.
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Shuru mein frame photo ke beech mein, chhoti side ka 90%
export function initialBox(W, H) {
  const s = Math.min(W, H) * 0.9;
  return { x: (W - s) / 2, y: (H - s) / 2, s };
}

// Frame ko khiskana (photo ke bahar nahi ja sakta)
export function moveBox(b, dx, dy, W, H) {
  return { s: b.s, x: clamp(b.x + dx, 0, W - b.s), y: clamp(b.y + dy, 0, H - b.s) };
}

// Kone (corner) se bada-chhota karna. Samne wala kona tika rehta hai, frame hamesha square.
// corner: "nw" | "ne" | "sw" | "se"; (px, py) = pointer ki jagah photo ke pixels mein; min = sabse chhota side
export function resizeBox(b, corner, px, py, W, H, min = 40) {
  const west = corner.includes("w"), north = corner.includes("n");
  const ax = west ? b.x + b.s : b.x; // tika hua kona
  const ay = north ? b.y + b.s : b.y;
  const sx = west ? -1 : 1, sy = north ? -1 : 1;
  const room = Math.min(sx > 0 ? W - ax : ax, sy > 0 ? H - ay : ay);
  const s = clamp(Math.max((px - ax) * sx, (py - ay) * sy), Math.min(min, room), room);
  return { x: sx > 0 ? ax : ax - s, y: sy > 0 ? ay : ay - s, s };
}

// Frame ko beech se bada-chhota karna (keyboard + / -)
export function scaleBox(b, ns, W, H, min = 40) {
  const s = clamp(ns, Math.min(min, W, H), Math.min(W, H));
  const cx = b.x + b.s / 2, cy = b.y + b.s / 2;
  return { s, x: clamp(cx - s / 2, 0, W - s), y: clamp(cy - s / 2, 0, H - s) };
}

// Final photo ke liye asli photo ka hissa
export const sourceRect = (b) => ({ sx: b.x, sy: b.y, side: b.s });

import { COLOURS, isHex } from "@/lib/swatch";

// "Naam: value" lines (specs) mein se kisi naam ki value
function specValue(specs, nameRe) {
  for (const line of String(specs || "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0 && nameRe.test(line.slice(0, i).trim())) {
      const v = line.slice(i + 1).trim();
      if (v) return v;
    }
  }
  return "";
}

// Colour hex se sabse paas ka naam (jaise #8a8f57 -> "Olive"). Sirf aakhri sahara.
function nearestColourName(hex) {
  if (!isHex(hex)) return "";
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = n(hex);
  let best = "", d = Infinity;
  for (const [name, h] of Object.entries(COLOURS)) {
    const [r2, g2, b2] = n(h);
    const dist = Math.hypot(r - r2, g - g2, b - b2);
    if (dist < d) { d = dist; best = name; }
  }
  return d <= 90 ? best[0].toUpperCase() + best.slice(1) : "";
}

// Group ke "Selected Colour: ..." mein listing ka asli colour:
// 1) seller ka likha colour naam  2) listing ka "Colours" field  3) specs ka "Colour: ..."  4) bag ke colour se naam  5) (optional) listing ka naam
export function colourLabel(p, fallbackName = true) {
  const own = String(p.group_label || "").trim();
  if (own) return own;
  const c = String(p.colours || "").split(",").map((x) => x.trim()).filter(Boolean).join(", ");
  if (c) return c;
  const s = specValue(p.specs, /^colou?r$/i);
  if (s) return s;
  const g = nearestColourName(p.colour_main);
  if (g) return g;
  return fallbackName ? String(p.name || "") : "";
}

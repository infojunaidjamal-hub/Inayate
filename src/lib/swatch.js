// Colour ke naam se circle ka colour. Seller apna colour bhi chun sakta hai (products.option_swatches).
export const COLOURS = {
  black: "#1f1b19", white: "#ffffff", cream: "#f3ead8", ivory: "#f1ead9", beige: "#d9c7a5", tan: "#b8865b", brown: "#7a4e2d", camel: "#c19a6b",
  red: "#c0392b", maroon: "#6d1f2c", wine: "#722f37", pink: "#e9a7a0", blush: "#e8b4ac", orange: "#e67e22", yellow: "#f1c40f", gold: "#d4a634",
  green: "#2e8b57", olive: "#7d8450", mint: "#a8d5ba", blue: "#2e6fa8", navy: "#1c2b4a", teal: "#1f7a7a", purple: "#6c4a9c", grey: "#8a8a8a", gray: "#8a8a8a", silver: "#c0c0c0",
};
export const isColourOption = (name) => /colou?r/i.test(String(name || ""));
export const isHex = (s) => /^#[0-9a-f]{6}$/i.test(String(s || ""));
// seller ka chuna colour pehle, phir naam se, warna null
export const swatchFor = (value, swatches = {}) => {
  const own = swatches?.[value];
  if (isHex(own)) return own;
  return COLOURS[String(value || "").trim().toLowerCase()] || null;
};
export function parseSwatches(raw) {
  try { const o = JSON.parse(raw || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch { return {}; }
}

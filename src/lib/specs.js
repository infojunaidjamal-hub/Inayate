// Seller "Capacity: 10 L" jaisi lines likhta hai, yahan wo (naam, value) ki list ban jati hai
export function parseSpecs(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() } : null;
    })
    .filter((r) => r && r.k && r.v)
    .slice(0, 40);
}

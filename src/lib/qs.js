// Page ke links banana jahan kuch filter bane rehte hain: const href = hrefWith("/seller/customers", { q, tag, st });
// href({ tag: "VIP" }) -> "/seller/customers?q=asha&tag=VIP". Khali value link mein nahi aati.
export const hrefWith = (path, base) => (over = {}) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== "" && v != null && v !== false) u.set(k, String(v));
  const s = u.toString();
  return path + (s ? "?" + s : "");
};

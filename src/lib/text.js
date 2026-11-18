// Form ke text ko saaf karna: aage-peeche ke space hatao aur beech ke kai space ek kar do.
export const clean = (s) => String(s ?? "").trim().replace(/\s+/g, " ");

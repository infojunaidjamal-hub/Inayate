// CSV ka ek hi jagah ka helper (activity, subscribers, payments export aur lib/xlsx.js yahin se lete hain).
// Naam jaise "=cmd" Excel mein formula na ban jaye, isliye aage ' laga dete hain.
export const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

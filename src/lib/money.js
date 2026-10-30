// Client components ke liye (lib/db.js server-only hai)
export const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

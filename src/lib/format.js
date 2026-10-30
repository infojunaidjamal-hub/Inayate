// Chhote helpers: status ka rang aur date
export const statusClass = (s) =>
  ({
    Delivered: "g", Refunded: "g", "Return Approved": "g",
    Cancelled: "x", "Return Rejected": "x",
    Shipped: "y", Packed: "y", "Return Requested": "y", "Awaiting Payment": "y",
  })[s] || "";

export function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(String(d).replace(" ", "T") + "Z");
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

// Seller order ko is tarah aage badha sakta hai
export const NEXT_STATUS = {
  "Awaiting Payment": ["Cancelled"],
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
};

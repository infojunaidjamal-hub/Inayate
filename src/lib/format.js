// Chhote helpers: status ka rang aur date
export const statusClass = (s) =>
  ({
    Delivered: "g", Refunded: "g", "Return Approved": "g",
    Cancelled: "x", "Return Rejected": "x",
    Shipped: "y", Packed: "y", "Return Requested": "y", "Awaiting Payment": "y",
    "On Hold": "y", NDR: "x", RTO: "x", "RTO Done": "x", "Ready to ship": "y", "Picked up": "y", "In transit": "y", "Out for delivery": "y",
  })[s] || "";

export function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(String(d).replace(" ", "T") + "Z");
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

// Seller order ko is tarah aage badha sakta hai (Placed sirf andar ka / purana status hai)
export const NEXT_STATUS = {
  "Awaiting Payment": ["Cancelled"],
  Placed: ["Confirmed", "Cancelled"],
  "On Hold": ["Confirmed", "Cancelled"],
  Confirmed: ["Packed", "Cancelled"],
  Packed: ["Ready to ship", "Cancelled"],
  "Ready to ship": ["Picked up", "Cancelled"],
  "Picked up": ["In transit"],
  "In transit": ["Out for delivery"],
  "Out for delivery": ["Delivered", "NDR"],
  NDR: ["Out for delivery", "RTO"],
  Shipped: ["Delivered"], // purana status, migration ke baad nahi bachta
};

// Buyer ke liye wajah ki list (client aur server dono use karte hain)
export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Want to change size, colour or address",
  "Found a better price",
  "Delivery will take too long",
  "Other",
];

export const RETURN_REASONS = [
  ["wrong_size", "Wrong size", false],
  ["damaged", "Damaged", true],
  ["wrong_item", "Wrong item received", true],
  ["quality", "Quality is not as expected", true],
  ["changed_mind", "Changed my mind", false],
  ["other", "Other", false],
]; // [code, label, photos zaroori]

// Date + time (IST), activity / notes / chat log ke liye
export function fmtDateTime(d) {
  if (!d) return "";
  const dt = new Date(String(d).replace(" ", "T") + "Z");
  return isNaN(dt) ? String(d) : dt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// YYYY-MM-DD (UTC), reports aur insights ke liye
export const ymd = (d) => d.toISOString().slice(0, 10);

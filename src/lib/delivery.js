// "Get it by ..." ki tareekh. Din badalne ho to sirf DELIVERY_DAYS badlo.
export const DELIVERY_DAYS = 5;
export const deliveryBy = (from = Date.now()) =>
  new Date(from + DELIVERY_DAYS * 864e5).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

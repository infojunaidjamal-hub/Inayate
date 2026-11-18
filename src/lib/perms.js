// Kaun kya kar sakta hai. Kuch badalna ho to sirf yahan badlo.
// Role ke naam database mein: "seller" = Owner, "manager" = Manager, "operator" = Operator
export const STAFF = ["seller", "manager", "operator"];
export const ROLE_LABEL = { seller: "Owner", manager: "Manager", operator: "Operator" };

const ALL = STAFF;
const OM = ["seller", "manager"];
const OWNER = ["seller"];
export const PERMS = {
  dashboard: ALL,   // dashboard
  security: ALL,    // apna password, OTP aur backup codes
  orders: ALL,      // orders dekhna (pata aur mobile label ke liye sab ko dikhta hai)
  ship: ALL,        // pack / ship, courier aur tracking, bulk Confirm-Pack, label print
  deliver: OM,      // "Delivered" mark karna aur order cancel karna
  products: OM,     // products, price, photos, bulk upload
  blog: OM,         // blog likhna, SEO aur publish karna
  verify: OM,       // On Hold order verify ya reject karna
  logistics: OM,    // courier partners, rate card, pincodes
  returns: OM,      // return approve ya reject
  customers: OM,    // customers ki list aur search
  activity: OM,     // activity log
  chats: OM,        // chatbot log (buyers ne kya poocha)
  refund: OWNER,    // refund karna
  invoices: OM,     // GST invoices, credit notes, GST register
  settings: OWNER,  // business naam, GSTIN, invoice settings
  payments: OWNER,  // payments ka hisaab aur CSV
  insights: OM,     // Insights: shoppers ka funnel, product performance, live activity
  reports: OWNER,   // reports, Excel aur subscribers CSV
  team: OWNER,      // staff jodna, password aur OTP reset
};
// "Order cancel" ke liye alag naam bhi chalta hai, wahi OM wali ijazat
PERMS.cancel = OM;

// Team page ki table ke liye (kaam, permission)
export const PERM_ROWS = [
  ["Dashboard", "dashboard"], ["Orders dekhna", "orders"], ["Pack / ship, bulk Confirm-Pack, label print", "ship"],
  ["Order ka pata aur mobile (label ke liye)", "orders"], ["Delivered mark karna, order cancel", "deliver"], ["On Hold order verify / reject", "verify"], ["Courier partners, rates, pincodes", "logistics"],
  ["Products, price, photos, bulk upload", "products"], ["Blog likhna aur publish karna", "blog"], ["Returns approve / reject", "returns"],
  ["Customers (360 view, notes, tags, block) aur Subscribers", "customers"], ["Refund karna", "refund"], ["Payments aur CSV", "payments"],
  ["Insights (shoppers ka funnel, live activity, product performance)", "insights"], ["Reports & Excel, Subscribers CSV", "reports"], ["GST invoices, credit notes, GST register", "invoices"], ["Business & GST settings (GSTIN, invoice prefix)", "settings"], ["Activity log (Manager ko Team, Security, Payments nahi dikhte)", "activity"], ["Chatbot log dekhna", "chats"], ["Staff jodna, password aur OTP reset", "team"],
];

export const can = (role, perm) => !!PERMS[perm]?.includes(role);
// Owner aur Manager ke liye OTP zaroori, Operator ke liye optional
export const otpRequired = (role) => role === "seller" || role === "manager";

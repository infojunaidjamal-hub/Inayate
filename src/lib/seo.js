// Website ka asli address (.env mein SITE_URL). Live hone par apna domain likhna.
export const siteUrl = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
export const abs = (p) => (!p ? siteUrl() : p.startsWith("http") ? p : siteUrl() + p);

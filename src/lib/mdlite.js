// Blog ka text (Markdown jaisa) ko blocks mein todta hai. Koi HTML nahi chalta, isliye safe hai.
// Chalta hai: ## ## heading, ### subheading, - list, 1. list, > tip box, **bold**, *italic*,
// [text](link), ![alt](photo-url) aur {{product:12}} (product card).
export const headId = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function parseBlocks(md) {
  const lines = String(md || "").replace(/\r/g, "").split("\n");
  const out = [];
  let para = [], list = null, quote = null;
  const flush = () => {
    if (para.length) out.push({ t: "p", text: para.join(" ") });
    if (list) out.push({ t: list.ord ? "ol" : "ul", items: list.items });
    if (quote) out.push({ t: "tip", text: quote.join(" ") });
    para = []; list = null; quote = null;
  };
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if (!l) { flush(); continue; }
    if ((m = /^\{\{product:(\d+)\}\}$/.exec(l))) { flush(); out.push({ t: "product", id: Number(m[1]) }); continue; }
    if ((m = /^(#{2,3})\s+(.+)$/.exec(l))) { flush(); out.push({ t: m[1].length === 2 ? "h2" : "h3", text: m[2], id: headId(m[2]) }); continue; }
    if ((m = /^!\[(.*?)\]\((\S+?)\)$/.exec(l))) { flush(); out.push({ t: "img", alt: m[1], src: m[2] }); continue; }
    if ((m = /^>\s?(.*)$/.exec(l))) { if (!quote) { flush(); quote = []; } quote.push(m[1]); continue; }
    if ((m = /^[-*]\s+(.+)$/.exec(l))) { if (!list || list.ord) { flush(); list = { ord: false, items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^\d+\.\s+(.+)$/.exec(l))) { if (!list || !list.ord) { flush(); list = { ord: true, items: [] }; } list.items.push(m[1]); continue; }
    if (list || quote) flush();
    para.push(l);
  }
  flush();
  return out;
}

export const productIdsIn = (md) => [...new Set([...String(md || "").matchAll(/\{\{product:(\d+)\}\}/g)].map((m) => Number(m[1])))];
export const safeHref = (h) => /^(https?:\/\/|\/(?!\/)|mailto:)/i.test(h);
export const safeImg = (s) => /^(https:\/\/|\/uploads\/)/i.test(s);

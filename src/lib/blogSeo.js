// Blog ka SEO checklist. Seller editor (live) aur posts ki list (score) dono yahi use karte hain.
export const slugify = (s) =>
  String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function seoCheck({ title = "", slug = "", excerpt = "", body = "", metaTitle = "", metaDesc = "", kw = "", coverUrl = "", coverAlt = "", products = 0 }) {
  const t = (metaTitle || title).trim();
  const d = (metaDesc || excerpt).trim();
  const k = kw.trim().toLowerCase();
  const text = body.replace(/\{\{product:\d+\}\}/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  const lines = text.split("\n").map((l) => l.trim());
  const heads = lines.filter((l) => /^#{2,3}\s+/.test(l)).map((l) => l.replace(/^#+\s+/, "").toLowerCase());
  const firstPara = (lines.find((l) => l && !/^(#|>|-|\*|\d+\.|!\[)/.test(l)) || "").toLowerCase();
  const kwSlug = slugify(k);
  const items = [];
  const add = (ok, label, tip) => items.push({ ok: !!ok, label, tip });

  if (!k) {
    add(false, "Focus keyword set karo", "Wo word ya phrase likho jise log Google par search karte hain (jaise \"tote bag for college\").");
  } else {
    add(true, "Focus keyword set hai", "");
    add(t.toLowerCase().includes(k), "Keyword title mein hai", "Title ke shuru ke paas keyword likho.");
    add(d.toLowerCase().includes(k), "Keyword meta description mein hai", "Meta description mein keyword ek baar zaroor likho.");
    add(firstPara.includes(k), "Keyword pehle paragraph mein hai", "Post ke pehle paragraph mein keyword aana chahiye.");
    add(kwSlug && slug.includes(kwSlug), "Keyword URL (slug) mein hai", "Slug mein keyword jodo, jaise \"" + kwSlug + "\".");
    add(heads.some((h) => h.includes(k)), "Keyword kisi subheading mein hai", "Kam se kam ek ## heading mein keyword likho.");
  }
  add(t.length >= 30 && t.length <= 60, `Title 30 se 60 akshar ka ho (abhi ${t.length})`, "Google title 60 akshar ke baad kaat deta hai.");
  add(d.length >= 110 && d.length <= 160, `Meta description 110 se 160 akshar ki ho (abhi ${d.length})`, "Search result ke neeche dikhne wali line.");
  add(words >= 300, `Post kam se kam 300 shabdon ki ho (abhi ${words})`, "Lambe, kaam ke posts Google par behtar chalte hain.");
  add(heads.length >= 2, "Kam se kam 2 subheadings hain", "Post ko ## heading se hisson mein baanto.");
  add(products > 0 || /\{\{product:\d+\}\}/.test(body) || /\]\(\/products/.test(body), "Post mein kisi product ka link hai", "Neeche Products section se product jodo.");
  add(!!coverUrl && coverAlt.trim().length > 4, "Cover photo aur uska alt text hai", "Cover photo lagao aur uska chhota description (alt) likho.");

  const ok = items.filter((i) => i.ok).length;
  const score = Math.round((ok / items.length) * 100);
  return { items, score, words, level: score >= 80 ? "Good" : score >= 50 ? "Okay" : "Needs work" };
}

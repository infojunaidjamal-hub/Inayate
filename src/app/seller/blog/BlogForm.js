"use client";
import { useActionState, useMemo, useRef, useState } from "react";
import { saveBlog } from "./actions";
import { seoCheck, slugify } from "@/lib/blogSeo";
import "./blog.css";

// Phone ki badi photo ko 1600px ki chhoti photo bana deta hai (site tez rehti hai)
async function shrink(file, max = 1600) {
  try {
    if (!file.type.startsWith("image/")) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

const Cnt = ({ n, min, max }) => <span className={`bf-cnt ${n === 0 ? "" : n >= min && n <= max ? "good" : "bad"}`}>{n}/{max}</span>;

export default function BlogForm({ post, linked = [], categories = [], products = [], siteUrl = "" }) {
  const [s, action, busy] = useActionState(saveBlog, null);
  const v = s?.values || post || {};
  const t = (x) => (x === null || x === undefined ? "" : x);

  const [title, setTitle] = useState(t(v.title));
  const [slug, setSlug] = useState(t(v.slug));
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(t(v.excerpt));
  const [body, setBody] = useState(t(v.body));
  const [metaTitle, setMetaTitle] = useState(t(v.meta_title));
  const [metaDesc, setMetaDesc] = useState(t(v.meta_desc));
  const [kw, setKw] = useState(t(v.focus_kw));
  const [coverAlt, setCoverAlt] = useState(t(v.cover_alt));
  const [ids, setIds] = useState(() => (s?.values?.products || linked).map(Number));
  const [q, setQ] = useState("");
  const [coverPicked, setCoverPicked] = useState("");
  const [coverPrev, setCoverPrev] = useState("");
  const [removeCover, setRemoveCover] = useState(false);
  const ta = useRef(null);

  const hasCover = !removeCover && (!!coverPicked || !!post?.cover_url);
  const seo = useMemo(
    () => seoCheck({ title, slug, excerpt, body, metaTitle, metaDesc, kw, coverUrl: hasCover ? "x" : "", coverAlt, products: ids.length }),
    [title, slug, excerpt, body, metaTitle, metaDesc, kw, hasCover, coverAlt, ids.length]
  );

  function onTitle(e) {
    setTitle(e.target.value);
    if (!slugTouched) setSlug(slugify(e.target.value));
  }

  // ---- editor buttons ----
  function edit(fn) {
    const el = ta.current;
    const s0 = el.selectionStart, e0 = el.selectionEnd;
    const [next, a, b] = fn(body, s0, e0);
    setBody(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a, b); });
  }
  const wrap = (pre, post2 = pre, ph = "text") => edit((x, a, b) => {
    const sel = x.slice(a, b) || ph;
    return [x.slice(0, a) + pre + sel + post2 + x.slice(b), a + pre.length, a + pre.length + sel.length];
  });
  const prefix = (p, ph) => edit((x, a, b) => {
    const ls = x.lastIndexOf("\n", a - 1) + 1;
    const hasSel = b > a;
    const text = hasSel ? x.slice(ls, b) : ph;
    const out = hasSel ? text.split("\n").map((l) => p + l).join("\n") : p + ph;
    const next = x.slice(0, ls) + out + x.slice(hasSel ? b : ls);
    return [next, ls + p.length, ls + out.length];
  });
  const block = (text) => edit((x, a) => {
    const lead = x.slice(0, a).endsWith("\n\n") || a === 0 ? "" : x.slice(0, a).endsWith("\n") ? "\n" : "\n\n";
    const ins = lead + text + "\n\n";
    return [x.slice(0, a) + ins + x.slice(a), a + ins.length, a + ins.length];
  });
  const link = () => edit((x, a, b) => {
    const sel = x.slice(a, b) || "link text";
    const ins = `[${sel}](/products)`;
    return [x.slice(0, a) + ins + x.slice(b), a + sel.length + 3, a + sel.length + 12];
  });

  async function onCover(e) {
    const input = e.target;
    const f = input.files?.[0];
    if (!f) { setCoverPicked(""); setCoverPrev(""); return; }
    const small = await shrink(f);
    const dt = new DataTransfer();
    dt.items.add(small);
    input.files = dt.files;
    setCoverPicked(small.name);
    setCoverPrev(URL.createObjectURL(small));
    setRemoveCover(false);
  }

  const toggle = (id) => setIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= 12 ? l : [...l, id]));
  const shown = products.filter((p) => !q || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q.toLowerCase()));
  const gpUrl = `${siteUrl.replace(/^https?:\/\//, "")}/blog/${slug || "your-post"}`;

  return (
    <form action={action} className="bf">
      <input type="hidden" name="id" value={post?.id || ""} />
      {ids.map((i) => <input key={i} type="hidden" name="products" value={i} />)}

      <div className="card pad">
        <label htmlFor="b1">Title <Cnt n={title.length} min={30} max={60} /></label>
        <input id="b1" name="title" value={title} onChange={onTitle} required placeholder="Jaise: 5 ways to style a tote for college" />

        <label htmlFor="b2">URL (slug)</label>
        <input id="b2" name="slug" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
        <p className="bf-hint">{gpUrl}</p>

        <div className="two">
          <div>
            <label htmlFor="b3">Category</label>
            <input id="b3" name="category" list="bcats" defaultValue={t(v.category) || "Guides"} required />
            <datalist id="bcats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label htmlFor="b4">Status</label>
            <select id="b4" name="status" defaultValue={v.status || "Draft"}>
              <option value="Draft">Draft (chhupa rahe)</option>
              <option value="Published">Published (sab ko dikhe)</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="b4b">Publish date (khali chhodo to aaj ki date)</label>
          <input id="b4b" name="published_at" type="date" defaultValue={t(v.published_at).slice(0, 10)} />
        </div>

        <label htmlFor="b5">Short summary (blog list mein dikhta hai) <span className="bf-cnt">{excerpt.length}/300</span></label>
        <textarea id="b5" name="excerpt" rows={2} maxLength={300} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />

        <label htmlFor="b6">Post likhein</label>
        <div className="bf-tb" role="toolbar" aria-label="Formatting">
          <button type="button" onClick={() => prefix("## ", "Heading")}>H2</button>
          <button type="button" onClick={() => prefix("### ", "Subheading")}>H3</button>
          <button type="button" onClick={() => wrap("**")}><b>B</b></button>
          <button type="button" onClick={() => wrap("*")}><i>I</i></button>
          <button type="button" onClick={() => prefix("- ", "List item")}>• List</button>
          <button type="button" onClick={() => prefix("1. ", "Step")}>1. List</button>
          <button type="button" onClick={() => prefix("> ", "Quick tip text")}>Tip box</button>
          <button type="button" onClick={link}>Link</button>
          <button type="button" onClick={() => block("![Photo ka description](https://)")}>Photo</button>
        </div>
        <textarea id="b6" ref={ta} name="body" className="bf-body" value={body} onChange={(e) => setBody(e.target.value)}
          placeholder={"Yahan likhna shuru karein.\n\n## Heading ke liye line ke aage ## lagao\n- List ke liye - lagao\n> Tip box ke liye > lagao"} />
        <p className="bf-meta">{seo.words} shabd · lagbhag {Math.max(1, Math.round(seo.words / 200))} min read. Product card dalne ke liye neeche Products mein &quot;Text mein dalo&quot; dabao.</p>

        <div className="bf-sec">Cover photo</div>
        <div className="bf-cover">
          {coverPrev ? <img src={coverPrev} alt="" /> : !removeCover && post?.cover_url ? <img src={post.cover_url} alt="" /> : null}
          <div style={{ flex: 1 }}>
            <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={onCover} />
            {post?.cover_url && <label style={{ fontSize: 12 }}><input type="checkbox" name="remove_cover" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} style={{ width: "auto", margin: "0 6px 0 0" }} />Cover hatayein</label>}
          </div>
        </div>
        <label htmlFor="b7">Cover photo ka alt text (photo ka chhota description)</label>
        <input id="b7" name="cover_alt" value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} placeholder="Jaise: Tan leather tote bag on a wooden chair" />

        <div className="bf-sec">Products (post se jodein)</div>
        <p className="bf-hint">Chune hue products post ke neeche &quot;Shop the story&quot; mein dikhte hain. Kisi bhi product ka card text ke beech mein bhi daal sakte ho. Sirf Active products shop par dikhte hain.</p>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product ka naam ya SKU search karein" aria-label="Product search" />
        <div className="bf-pick">
          {shown.length === 0 && <p className="bf-pi mut">Koi product nahi mila.</p>}
          {shown.map((p) => (
            <div className="bf-pi" key={p.id}>
              <label>
                <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} />
                {p.image ? <img src={p.image} alt="" /> : <span className="ph" />}
                <span style={{ minWidth: 0 }}>{p.name}<small>{p.sku} · ₹{p.price}{p.status !== "Active" ? " · Draft" : ""}</small></span>
              </label>
              <button type="button" onClick={() => { if (!ids.includes(p.id)) toggle(p.id); block(`{{product:${p.id}}}`); }}>Text mein dalo</button>
            </div>
          ))}
        </div>
        <p className="bf-hint" style={{ marginTop: 6 }}>{ids.length} product chune hain (zyada se zyada 12).</p>

        <div className="bf-sec">SEO (Google ke liye)</div>
        <label htmlFor="b8">Focus keyword</label>
        <input id="b8" name="focus_kw" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Jaise: tote bag for college" />
        <label htmlFor="b9">Meta title (khali ho to post ka title) <Cnt n={(metaTitle || title).length} min={30} max={60} /></label>
        <input id="b9" name="meta_title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
        <label htmlFor="b10">Meta description (khali ho to short summary) <Cnt n={(metaDesc || excerpt).length} min={110} max={160} /></label>
        <textarea id="b10" name="meta_desc" rows={3} maxLength={200} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} />

        {s?.error && <p className="err" role="alert">{s.error}</p>}
        <div className="bf-actions">
          <button className="btn a" disabled={busy}>{busy ? "Save ho raha hai..." : post ? "Changes save karein" : "Post save karein"}</button>
        </div>
      </div>

      <aside className="bf-side">
        <div className="card pad">
          <b style={{ fontSize: 13 }}>Google par aisa dikhega</b>
          <div className="bf-gp" style={{ marginTop: 8 }}>
            <div className="u">{gpUrl}</div>
            <div className="t">{(metaTitle || title || "Post ka title").slice(0, 60)}</div>
            <div className="d">{(metaDesc || excerpt || "Yahan meta description dikhegi.").slice(0, 160)}</div>
          </div>
        </div>
        <div className="card pad">
          <div className="bf-score"><b>{seo.score}</b><span className={seo.level.split(" ")[0]}>{seo.level}</span></div>
          <ul className="bf-chk">
            {seo.items.map((i) => (
              <li key={i.label} className={i.ok ? "y" : "n"}>
                <i aria-hidden="true">{i.ok ? "✓" : "✕"}</i>
                <span>{i.label}{!i.ok && i.tip && <small>{i.tip}</small>}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </form>
  );
}

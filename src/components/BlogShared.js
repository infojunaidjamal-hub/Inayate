import BagArt from "@/components/BagArt";

// Blog list aur blog post dono pages ka common CSS aur cover.
export const BLOG_CSS = `
.bl h1,.bl h2,.bl h3,.bl p{margin:0}
.bl-tag{display:inline-block;font-size:12px;font-weight:500;letter-spacing:2px;color:var(--acc);margin-bottom:10px}
.bl-meta{font-size:12px;color:var(--mut)}
.bl-cover{display:grid;place-items:center;overflow:hidden;position:relative}
.bl-cover svg{width:38%;max-width:150px;transform:rotate(-6deg);filter:drop-shadow(0 14px 16px #2a262326)}
.bl-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}

/* list page */
.bl-hero{text-align:center;max-width:640px;margin:10px auto 26px}
.bl-hero h1{font-size:clamp(34px,5.5vw,56px);line-height:1.08;letter-spacing:-1px;margin-bottom:12px}
.bl-hero p{color:var(--mut);font-size:15.5px}
.bl-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:28px}
.bl-chips a{padding:7px 18px;border:1px solid var(--line);border-radius:20px;font-size:13px;background:var(--card);text-decoration:none}
.bl-chips a:hover{border-color:var(--acc)}
.bl-chips a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.bl-feat{display:grid;grid-template-columns:1.1fr .9fr;background:var(--card);border:1px solid var(--line);border-radius:24px;overflow:hidden;text-decoration:none;color:inherit;margin-bottom:22px}
.bl-feat .bl-cover{min-height:320px}
.bl-feat .bl-cover svg{max-width:210px}
.bl-feat-t{padding:34px;display:flex;flex-direction:column;justify-content:center;gap:10px}
.bl-feat-t h2{font-size:clamp(26px,3.6vw,36px);line-height:1.15}
.bl-feat-t p{color:var(--mut)}
.bl-more{font-size:13.5px;font-weight:500;color:var(--acc)}
.bl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.bl-card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .2s,border-color .2s}
.bl-card:hover,.bl-feat:hover{border-color:var(--acc)}
.bl-card:hover{transform:translateY(-3px)}
.bl-card .bl-cover{aspect-ratio:16/10}
.bl-card-t{padding:18px 20px 22px;display:flex;flex-direction:column;gap:8px;flex:1}
.bl-card-t h3{font-size:19px;line-height:1.25}
.bl-card-t p{font-size:13.5px;color:var(--mut)}
.bl-card-t .bl-meta{margin-top:auto}
.bl-empty{text-align:center;color:var(--mut);padding:40px 0}

/* post page */
.bl-post{max-width:720px;margin:10px auto 0}
.bl-back{display:inline-block;font-size:13px;color:var(--mut);text-decoration:none;margin-bottom:18px}
.bl-back:hover{color:var(--acc)}
.bl-draft{background:#f6e3a8;border-radius:12px;padding:10px 16px;font-size:13px;margin-bottom:16px}
.bl-post h1{font-size:clamp(32px,5vw,50px);line-height:1.1;letter-spacing:-1px;margin:6px 0 12px}
.bl-post>.bl-cover{aspect-ratio:16/8;border-radius:22px;margin:22px 0 28px}
.bl-post>.bl-cover svg{max-width:190px}
.bl-toc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 20px;margin:0 0 26px;font-size:14px}
.bl-toc b{display:block;font-size:12px;letter-spacing:1.5px;color:var(--acc);margin-bottom:6px}
.bl-toc ol{margin:0;padding-left:18px}.bl-toc li{margin:3px 0}.bl-toc a{text-decoration:none}.bl-toc a:hover{color:var(--acc)}
.bl-body p{color:#4a423c;font-size:16px;line-height:1.85;margin-bottom:16px}
.bl-body h2{font-size:26px;line-height:1.25;margin:34px 0 10px;scroll-margin-top:90px}
.bl-body h3{font-size:20px;margin:24px 0 8px;scroll-margin-top:90px}
.bl-body ul,.bl-body ol{margin:0 0 18px;padding-left:22px;color:#4a423c;line-height:1.85}
.bl-body li{margin-bottom:6px}
.bl-body a{color:var(--acc);text-decoration:underline;text-underline-offset:2px}
.bl-body figure{margin:22px 0}.bl-body figure img{width:100%;border-radius:16px;display:block}
.bl-body figcaption{font-size:12.5px;color:var(--mut);margin-top:6px;text-align:center}
.bl-tipbox{background:#f3e3d3;border-left:3px solid var(--acc);border-radius:0 14px 14px 0;padding:16px 20px;margin:22px 0;font-size:14.5px;line-height:1.7}
.bl-tipbox b{display:block;font-size:12px;letter-spacing:1.5px;color:var(--acc);margin-bottom:4px}
.bl-embed{max-width:260px;margin:24px 0}
.bl-shop{margin-top:44px}
.bl-shop>h2{font-size:26px;margin-bottom:4px}.bl-shop>p{color:var(--mut);margin-bottom:16px}
.bl-shop .grid-p{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.bl-end{margin-top:40px;text-align:center;background:linear-gradient(120deg,var(--rose),#f3e3d3);border-radius:22px;padding:34px 20px}
.bl-end h2{font-size:clamp(22px,3.4vw,30px);margin-bottom:8px}
.bl-end p{color:#5c4f47;margin-bottom:16px!important}
.bl-end .btn{padding:11px 26px;font-size:14px}
.bl-related{margin-top:54px}
.bl-related>h2{font-size:26px;margin-bottom:16px}
.bl-related .bl-grid{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}

@media(max-width:900px){.bl-feat{grid-template-columns:1fr}.bl-feat .bl-cover{min-height:240px}.bl-grid{grid-template-columns:1fr 1fr}.bl-feat-t{padding:22px}}
@media(max-width:560px){.bl-grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.bl-card{transition:none}}
`;

// Photo na ho to bag ki drawing (har post ka apna colour)
const PALETTE = [
  { bg: "#e5e0f5", main: "#b87e52", dark: "#805638" },
  { bg: "#f7d9cb", main: "#c66f5a", dark: "#8f4636" },
  { bg: "#e2edc9", main: "#62785b", dark: "#435a3e" },
  { bg: "#d7f36a", main: "#b8865b", dark: "#8a5d3a" },
];

export function Cover({ post }) {
  const c = PALETTE[(post.id || 0) % PALETTE.length];
  return (
    <div className="bl-cover" style={{ background: c.bg }}>
      {post.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_url} alt={post.cover_alt || ""} loading="lazy" />
      ) : (
        <BagArt main={c.main} dark={c.dark} />
      )}
    </div>
  );
}

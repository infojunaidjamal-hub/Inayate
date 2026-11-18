import ProductCard from "@/components/ProductCard";
import { parseBlocks, safeHref, safeImg } from "@/lib/mdlite";

// **bold**, *italic* aur [text](link) ko bina HTML ke dikhata hai
function inline(text) {
  return String(text).split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    let m;
    if ((m = /^\*\*([^*]+)\*\*$/.exec(part))) return <strong key={i}>{m[1]}</strong>;
    if ((m = /^\*([^*]+)\*$/.exec(part))) return <em key={i}>{m[1]}</em>;
    if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part))) {
      if (!safeHref(m[2])) return m[1];
      const ext = /^https?:/i.test(m[2]);
      return <a key={i} href={m[2]} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{m[1]}</a>;
    }
    return part;
  });
}

export default function BlogBody({ md, products = {} }) {
  return (
    <div className="bl-body">
      {parseBlocks(md).map((b, i) => {
        switch (b.t) {
          case "h2": return <h2 key={i} id={b.id}>{inline(b.text)}</h2>;
          case "h3": return <h3 key={i} id={b.id}>{inline(b.text)}</h3>;
          case "ul": return <ul key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ol>;
          case "tip": return <div key={i} className="bl-tipbox"><b>QUICK TIP</b>{inline(b.text)}</div>;
          case "img":
            return safeImg(b.src) ? (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} loading="lazy" />
                {b.alt && <figcaption>{b.alt}</figcaption>}
              </figure>
            ) : null;
          case "product":
            return products[b.id] ? <div key={i} className="bl-embed"><ProductCard p={products[b.id]} /></div> : null;
          default: return <p key={i}>{inline(b.text)}</p>;
        }
      })}
    </div>
  );
}

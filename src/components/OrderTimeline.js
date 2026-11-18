// Order / return / RTO ka tracking bar. Server component, kisi data ko nahi chhoota.
import { fmtDate } from "@/lib/format";

export default function OrderTimeline({ steps, title }) {
  if (!steps?.length) return null;
  return (
    <>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      <ol className="fl-tl">
        {steps.map((s) => (
          <li key={s.code} className={s.state}>
            <span className="fl-dot" aria-hidden="true">{s.state === "done" ? "✓" : s.state === "fail" ? "!" : ""}</span>
            <div>
              <div className="n">{s.name}{s.state === "now" ? <span className="mut"> (abhi)</span> : null}</div>
              {(s.date || s.note) && <div className="d">{s.date ? fmtDate(s.date) : ""}{s.date && s.note ? " · " : ""}{s.note || ""}</div>}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

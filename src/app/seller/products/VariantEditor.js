"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { isColourOption, swatchFor } from "@/lib/swatch";

const MAX_COMBOS = 100;
const VS_CSS = ".vs-in{-webkit-appearance:none;appearance:none;width:22px;height:22px;flex:none;border:1px solid #bdb2a6;border-radius:50%;padding:0;background:none;cursor:pointer}.vs-in::-webkit-color-swatch-wrapper{padding:0}.vs-in::-webkit-color-swatch{border:0;border-radius:50%}.vs-in::-moz-color-swatch{border:0;border-radius:50%}.vs-in.unk{border-style:dashed}";
const key = (arr) => arr.map((x) => x.trim().toLowerCase()).join("\u0001");
const abbr = (s) => s.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();

// Sirf wahi options kaam aate hain jinka naam aur kam se kam ek value ho
const usableOf = (options) => options.filter((o) => o.name.trim() && o.values.length);

// options = [{ name, values: [] }] se saari combinations
function combos(options) {
  const usable = usableOf(options); // khali option (jisme value nahi) ignore hota hai
  if (!usable.length) return [];
  return usable.reduce((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
}

// initial = { optionNames: [], variants: [{ id, opts, sku, price, mrp, stock, image, active }] }
export default function VariantEditor({ initial, images, onActive, allowCreate = true }) {
  const [on, setOn] = useState(initial.optionNames.length > 0);
  const [options, setOptions] = useState(() =>
    initial.optionNames.map((name, i) => ({ name, values: [...new Set(initial.variants.map((v) => v.opts[i]).filter(Boolean))] }))
  );
  const [rows, setRows] = useState(initial.variants.map((v) => ({ ...v, price: String(v.price), mrp: String(v.mrp), stock: String(v.stock), image: v.image || "" })));
  const [dropped, setDropped] = useState(() => new Set()); // seller ne jo combination hata di
  const [swatches, setSwatches] = useState(initial.swatches || {}); // colour option ki values ke circle ke colour
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState("");
  const baseRef = useRef(null);

  useEffect(() => { onActive?.(on && rows.length > 0); }, [on, rows.length, onActive]);

  const baseDefaults = () => {
    const get = (id) => (typeof document !== "undefined" ? document.getElementById(id)?.value || "" : "");
    return { sku: get("p2") || "SKU", price: get("p4"), mrp: get("p5") };
  };

  // options badalne par rows dobara bante hain, par purani rows ki values bachi rehti hain
  function rebuild(nextOptions, nextDropped = dropped) {
    const list = combos(nextOptions).filter((c) => !nextDropped.has(key(c)));
    if (list.length > MAX_COMBOS) { setMsg(`That would make ${list.length} variants. The limit is ${MAX_COMBOS}.`); return false; }
    setMsg("");
    const byKey = new Map(rows.map((r) => [key(r.opts), r]));
    const d = baseDefaults();
    const first = rows[0];
    const next = list.map((c) => byKey.get(key(c)) || {
      id: 0, opts: c, sku: `${d.sku}-${c.map(abbr).join("-")}`, price: first?.price || d.price, mrp: first?.mrp || d.mrp, stock: "0", image: "", active: true,
    });
    setOptions(nextOptions);
    setRows(next);
    return true;
  }

  const addValue = (i) => {
    const val = (draft[i] || "").trim();
    if (!val) return;
    if (options[i].values.some((x) => x.toLowerCase() === val.toLowerCase())) { setDraft({ ...draft, [i]: "" }); return; }
    const next = options.map((o, j) => (j === i ? { ...o, values: [...o.values, val] } : o));
    if (rebuild(next)) setDraft({ ...draft, [i]: "" });
  };
  const removeValue = (i, val) => {
    const next = options.map((o, j) => (j === i ? { ...o, values: o.values.filter((x) => x !== val) } : o));
    // is value ki hatayi hui combinations bhi saaf, taaki value dobara jodne par wapas aa jayein
    const keep = new Set([...dropped].filter((k) => !k.split("\u0001").includes(val.trim().toLowerCase())));
    setDropped(keep);
    rebuild(next, keep);
  };
  const setName = (i, name) => setOptions(options.map((o, j) => (j === i ? { ...o, name } : o)));
  const addOption = () => options.length < 3 && setOptions([...options, { name: "", values: [] }]);
  const removeOption = (i) => {
    const next = options.filter((_, j) => j !== i);
    setDropped(new Set());
    if (!next.length) { setOptions([]); setRows([]); setOn(false); return; }
    rebuild(next, new Set()); // ek option hatane par combinations naye sire se bante hain
  };
  const setRow = (i, k, val) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
  const dropRow = (i) => { const d = new Set(dropped); d.add(key(rows[i].opts)); setDropped(d); setRows(rows.filter((_, j) => j !== i)); };
  const applyAll = (k, val) => val !== "" && setRows(rows.map((r) => ({ ...r, [k]: val })));
  const [bulk, setBulk] = useState({ price: "", mrp: "" });

  const payloadNames = useMemo(() => JSON.stringify(on && rows.length ? usableOf(options).map((o) => o.name.trim()) : []), [on, rows.length, options]);
  const payloadRows = useMemo(() => JSON.stringify(on ? rows : []), [on, rows]);
  const total = combos(options).length;

  if (!on) {
    return (
      <div>
        <p className="mut" style={{ margin: "0 0 10px", fontSize: 13 }}>Does this bag come in different colours or sizes? Add variants. Each variant gets its own SKU, price, stock and photo.</p>
        {allowCreate ? <button type="button" className="btn o" onClick={() => { setOn(true); setOptions([{ name: "Colour", values: [] }, { name: "Size", values: [] }]); }}>Add variants</button> : <p className="mut" style={{ margin: 0, fontSize: 13 }}>Variants are off for this listing. To show colours together, use Seller &gt; Listing groups.</p>}
        <input type="hidden" name="option_names" value="[]" />
        <input type="hidden" name="variants" value="[]" />
        <input type="hidden" name="option_swatches" value="{}" />
      </div>
    );
  }

  return (
    <div ref={baseRef}>
      <input type="hidden" name="option_names" value={payloadNames} />
      <input type="hidden" name="variants" value={payloadRows} />
      <input type="hidden" name="option_swatches" value={JSON.stringify(swatches)} />
      <style>{VS_CSS}</style>

      {options.map((o, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <label htmlFor={`vo${i}`} className="mut" style={{ fontSize: 12 }}>Option {i + 1}{i === 1 ? " (optional)" : ""}{isColourOption(o.name) ? " · colour circles" : ""}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input id={`vo${i}`} value={o.name} onChange={(e) => setName(i, e.target.value)} onBlur={() => rebuild(options)} placeholder="Colour, Size, Material..." style={{ width: 180, margin: 0 }} />
            {options.length > 1 && <button type="button" className="btn o s" onClick={() => removeOption(i)} aria-label={`Remove option ${o.name || i + 1}`}>Remove option</button>}
          </div>
          <div style={{ marginTop: 8 }}>
            {o.values.map((val) => (
              <span key={val} style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 6px 6px 0", padding: "4px 6px 4px 12px", borderRadius: 16, background: "#f3e8dc" }}>
                {isColourOption(o.name) && (() => {
                  const hex = swatchFor(val, swatches);
                  return <input type="color" className={"vs-in" + (hex ? "" : " unk")} value={hex || "#cccccc"} onChange={(e) => setSwatches({ ...swatches, [val]: e.target.value })} aria-label={`Colour for ${val}`} title={hex ? `Change the colour of ${val}` : `Pick a colour for ${val}`} />;
                })()}
                {val}
                <button type="button" onClick={() => removeValue(i, val)} aria-label={`Remove ${val}`} style={{ border: 0, background: "none", cursor: "pointer", fontSize: 16, lineHeight: 1, color: "inherit" }}>&times;</button>
              </span>
            ))}
            <span style={{ display: "inline-flex", gap: 6 }}>
              <input value={draft[i] || ""} onChange={(e) => setDraft({ ...draft, [i]: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(i); } }} placeholder="Add a value" aria-label={`Add a value to ${o.name || "option"}`} style={{ width: 140, margin: 0 }} />
              <button type="button" className="btn o s" onClick={() => addValue(i)}>+ Add</button>
            </span>
          </div>
        </div>
      ))}
      {options.some((o) => isColourOption(o.name) && o.values.length) && <p className="mut" style={{ fontSize: 12, margin: "4px 0 10px" }}>Tap the small circle next to a colour to choose its shade. Common names (Black, Blue, Tan...) are matched automatically. A dashed circle means we do not know that name yet, so please pick a shade.</p>}
      {options.length < 3 && <button type="button" className="btn o s" onClick={addOption}>+ Add another option (e.g. Material)</button>}
      {msg && <p className="err" role="alert" style={{ marginTop: 8 }}>{msg}</p>}
      {!rows.length && <p className="mut" style={{ fontSize: 12, margin: "8px 0 0" }}>Type a value (for example Black) and press Enter or &quot;+ Add&quot;. Variants appear as soon as one option has a value. An option with no value is ignored.</p>}
      {options.some((o) => o.values.length && !o.name.trim()) && <p className="err" role="alert" style={{ marginTop: 8 }}>Give a name to the option that has values (for example Colour).</p>}

      {rows.length > 0 && (
        <>
          {rows.some((r) => !String(r.price).trim()) && <p className="err" role="alert" style={{ margin: "14px 0 0" }}>Enter a price for each variant. Or type one in &quot;Price for all&quot; below and press Apply.</p>}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", margin: "16px 0 8px" }}>
            <label style={{ fontSize: 12 }}>Price for all<input value={bulk.price} onChange={(e) => setBulk({ ...bulk, price: e.target.value })} inputMode="numeric" style={{ width: 110, margin: "3px 0 0" }} /></label>
            <button type="button" className="btn o s" onClick={() => applyAll("price", bulk.price)}>Apply</button>
            <label style={{ fontSize: 12 }}>MRP for all<input value={bulk.mrp} onChange={(e) => setBulk({ ...bulk, mrp: e.target.value })} inputMode="numeric" style={{ width: 110, margin: "3px 0 0" }} /></label>
            <button type="button" className="btn o s" onClick={() => applyAll("mrp", bulk.mrp)}>Apply</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 820, width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Variant", "SKU", "Price", "MRP", "Stock", "Photo", "Active", ""].map((h) => <th key={h} style={{ textAlign: "left", fontWeight: 400, color: "var(--mut)", fontSize: 13, padding: "6px 6px" }}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const label = r.opts.join(" / ");
                  const cell = { padding: "5px 6px", borderTop: "1px solid var(--line)" };
                  const inp = { margin: 0, padding: "7px 10px" };
                  return (
                    <tr key={key(r.opts)}>
                      <td style={cell}><b>{label}</b></td>
                      <td style={cell}><input aria-label={`SKU ${label}`} value={r.sku} onChange={(e) => setRow(i, "sku", e.target.value)} style={inp} /></td>
                      <td style={cell}><input aria-label={`Price ${label}`} value={r.price} inputMode="numeric" onChange={(e) => setRow(i, "price", e.target.value)} style={{ ...inp, width: 90 }} /></td>
                      <td style={cell}><input aria-label={`MRP ${label}`} value={r.mrp} inputMode="numeric" onChange={(e) => setRow(i, "mrp", e.target.value)} style={{ ...inp, width: 90 }} /></td>
                      <td style={cell}><input aria-label={`Stock ${label}`} value={r.stock} inputMode="numeric" onChange={(e) => setRow(i, "stock", e.target.value)} style={{ ...inp, width: 70 }} /></td>
                      <td style={cell}>
                        {images.length ? (
                          <select aria-label={`Photo ${label}`} value={r.image} onChange={(e) => setRow(i, "image", e.target.value)} style={{ ...inp, width: 110 }}>
                            <option value="">No photo</option>
                            {images.map((im, n) => <option key={im.id} value={im.url}>Photo {n + 1}</option>)}
                          </select>
                        ) : <span className="mut" style={{ fontSize: 12 }}>Save first</span>}
                      </td>
                      <td style={cell}><input type="checkbox" aria-label={`Active ${label}`} checked={r.active} onChange={(e) => setRow(i, "active", e.target.checked)} style={{ width: "auto", margin: 0 }} /></td>
                      <td style={cell}><button type="button" className="btn o s" onClick={() => dropRow(i)} aria-label={`Remove ${label}`}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mut" style={{ fontSize: 12, margin: "10px 0 0" }}>{rows.length} of {total} combinations shown. A removed combination stays removed. To bring it back, remove one of its values and add it again. Photos are chosen from this product&apos;s photos (save the product first to add photos).</p>
        </>
      )}
      <p style={{ margin: "12px 0 0" }}><button type="button" className="btn o s" onClick={() => { setOn(false); setOptions([]); setRows([]); }}>Turn variants off</button></p>
    </div>
  );
}

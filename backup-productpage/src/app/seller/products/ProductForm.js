"use client";
import { useActionState, useState } from "react";
import { saveProduct } from "../actions";

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

export default function ProductForm({ product, categories, images = [] }) {
  const [s, action, busy] = useActionState(saveProduct, null);
  const [prep, setPrep] = useState(false);
  const [picked, setPicked] = useState(0);
  async function onPick(e) {
    const input = e.target;
    setPrep(true);
    const out = await Promise.all([...input.files].map((f) => shrink(f)));
    const dt = new DataTransfer();
    out.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    setPicked(out.length);
    setPrep(false);
  }
  const v = s?.values || product || {};
  const t = (x) => (x === null || x === undefined ? "" : x);
  return (
    <form action={action} className="card pad">
      <input type="hidden" name="id" value={product?.id || ""} />
      <label htmlFor="p1">Product ka naam</label>
      <input id="p1" name="name" defaultValue={t(v.name)} required />
      <div className="two">
        <div><label htmlFor="p2">SKU (har product ka alag)</label><input id="p2" name="sku" defaultValue={t(v.sku)} required /></div>
        <div>
          <label htmlFor="p3">Category</label>
          <input id="p3" name="category" list="cats" defaultValue={t(v.category)} required />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      </div>
      <div className="three">
        <div><label htmlFor="p4">Selling price (₹)</label><input id="p4" name="price" inputMode="numeric" defaultValue={t(v.price)} required /></div>
        <div><label htmlFor="p5">MRP (₹)</label><input id="p5" name="mrp" inputMode="numeric" defaultValue={t(v.mrp)} /></div>
        <div><label htmlFor="p6">Stock (kitne piece)</label><input id="p6" name="stock" inputMode="numeric" defaultValue={t(v.stock) === "" ? "0" : t(v.stock)} required /></div>
      </div>
      <div className="two">
        <div><label htmlFor="p7">Material</label><input id="p7" name="material" defaultValue={t(v.material)} /></div>
        <div><label htmlFor="p8">Colours (comma se alag)</label><input id="p8" name="colours" defaultValue={t(v.colours)} /></div>
      </div>
      <div className="three">
        <div><label htmlFor="p9">Size</label><input id="p9" name="size" defaultValue={t(v.size)} /></div>
        <div><label htmlFor="p10">Weight (gram)</label><input id="p10" name="weight_g" inputMode="numeric" defaultValue={t(v.weight_g)} /></div>
        <div><label htmlFor="p11">GST %</label><input id="p11" name="gst_percent" inputMode="numeric" defaultValue={t(v.gst_percent) === "" ? "12" : t(v.gst_percent)} /></div>
      </div>
      <label htmlFor="p12">Description</label>
      <textarea id="p12" name="description" rows={4} defaultValue={t(v.description)} />
      <div className="three">
        <div>
          <label htmlFor="p13">Status</label>
          <select id="p13" name="status" defaultValue={v.status || "Active"}>
            <option value="Active">Active (dukaan mein dikhe)</option>
            <option value="Draft">Draft (chhupa rahe)</option>
          </select>
        </div>
        <div><label htmlFor="p14">Bag ka colour</label><input id="p14" name="colour_main" type="color" defaultValue={v.colour_main || "#b8865b"} style={{ height: 40, padding: 3 }} /></div>
        <div><label htmlFor="p15">Gehra colour</label><input id="p15" name="colour_dark" type="color" defaultValue={v.colour_dark || "#8a5d3a"} style={{ height: 40, padding: 3 }} /></div>
      </div>
      <label htmlFor="p16">Product ki photos (JPG, PNG ya WEBP; ek product par 8 tak)</label>
      {images.length > 0 && (
        <div className="ths" style={{ flexWrap: "wrap", margin: "6px 0 12px" }}>
          {images.map((im) => (
            <div key={im.id} style={{ width: 96, fontSize: 12 }}>
              <img src={im.url} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 10, display: "block" }} />
              <label style={{ display: "block", marginTop: 4 }}><input type="radio" name="cover" value={im.id} style={{ width: "auto", margin: "0 4px 0 0" }} />Cover</label>
              <label style={{ display: "block" }}><input type="checkbox" name="del" value={im.id} style={{ width: "auto", margin: "0 4px 0 0" }} />Hatayein</label>
            </div>
          ))}
        </div>
      )}
      <input id="p16" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onPick} />
      <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>
        {prep ? "Photos taiyar ho rahi hain..." : picked ? `${picked} nayi photo save hone ke liye taiyar.` : "Pehli photo (ya jise \"Cover\" chunein) shop mein dikhegi. Photo na ho to colour wali drawing dikhti hai."}
      </p>
      {s?.error && <p className="err">{s.error}</p>}
      <button className="btn a" disabled={busy || prep}>{busy ? "Save ho raha hai..." : product ? "Changes save karein" : "Product jodein"}</button>
    </form>
  );
}

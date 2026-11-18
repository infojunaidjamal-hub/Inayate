"use client";
import { useActionState, useState } from "react";
import { saveProduct } from "./actions";
import VariantEditor from "./VariantEditor";

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

export default function ProductForm({ product, tree = [], images = [], variants = [] }) {
  const [s, action, busy] = useActionState(saveProduct, null);
  const [vOn, setVOn] = useState(variants.length > 0);
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
  const [catId, setCatId] = useState(String(t(v.category_id)));
  const subs = tree.find((c) => String(c.id) === catId)?.subs || [];
  // variants ka shuruaati data: save fail hone par seller ka bhara hua data wapas aata hai
  const initial = (() => {
    if (s?.values?.option_names) {
      try { return { optionNames: JSON.parse(s.values.option_names), variants: JSON.parse(s.values.variants || "[]"), swatches: JSON.parse(s.values.option_swatches || "{}") }; } catch {}
    }
    const names = product?.option_names ? JSON.parse(product.option_names) : [];
    let swatches = {};
    try { swatches = product?.option_swatches ? JSON.parse(product.option_swatches) : {}; } catch {}
    return { optionNames: names, swatches, variants: variants.map((x) => ({ id: x.id, opts: x.opts, sku: x.sku, price: x.price, mrp: x.mrp, stock: x.stock, image: x.image || "", active: !!x.active })) };
  })();
  return (
    <form action={action} className="card pad">
      <input type="hidden" name="id" value={product?.id || ""} />
      <label htmlFor="p1">Product ka naam</label>
      <input id="p1" name="name" defaultValue={t(v.name)} required />
      <div className="two">
        <div><label htmlFor="p2">SKU (har product ka alag)</label><input id="p2" name="sku" defaultValue={t(v.sku)} required /></div>
        <div />
      </div>
      <div className="two">
        <div>
          <label htmlFor="p3">Category</label>
          <select id="p3" name="category_id" value={catId} onChange={(e) => setCatId(e.target.value)} required>
            <option value="">Choose a category</option>
            {tree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="p3b">Subcategory (optional)</label>
          <select id="p3b" name="subcategory_id" defaultValue={String(t(v.subcategory_id))} key={catId} disabled={!subs.length}>
            <option value="">{subs.length ? "None" : "No subcategories"}</option>
            {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>Not in the list? <a href="/seller/categories" style={{ textDecoration: "underline" }}>Create a category or subcategory</a></p>
      {vOn ? (
        <p className="mut" style={{ fontSize: 13 }}>Price, MRP and stock are set for each variant below. The shop shows the lowest price as &quot;From&quot;.</p>
      ) : (
      <div className="three">
        <div><label htmlFor="p4">Selling price (₹)</label><input id="p4" name="price" inputMode="numeric" defaultValue={t(v.price)} required={!vOn} /></div>
        <div><label htmlFor="p5">MRP (₹)</label><input id="p5" name="mrp" inputMode="numeric" defaultValue={t(v.mrp)} /></div>
        <div><label htmlFor="p6">Stock (kitne piece)</label><input id="p6" name="stock" inputMode="numeric" defaultValue={t(v.stock) === "" ? "0" : t(v.stock)} required /></div>
      </div>
      )}
      <div className="two">
        <div><label htmlFor="p7">Material</label><input id="p7" name="material" defaultValue={t(v.material)} /></div>
        <div><label htmlFor="p8">Colours (comma se alag)</label><input id="p8" name="colours" defaultValue={t(v.colours)} /></div>
      </div>
      <div className="three">
        <div><label htmlFor="p9">Size</label><input id="p9" name="size" defaultValue={t(v.size)} /></div>
        <div><label htmlFor="p10">Weight (gram)</label><input id="p10" name="weight_g" inputMode="numeric" defaultValue={t(v.weight_g)} /></div>
        <div><label htmlFor="p11">GST %</label><input id="p11" name="gst_percent" inputMode="numeric" defaultValue={t(v.gst_percent) === "" ? "12" : t(v.gst_percent)} /></div>
        <div><label htmlFor="p11h">HSN code (invoice ke liye)</label><input id="p11h" name="hsn" inputMode="numeric" maxLength={8} defaultValue={t(v.hsn)} placeholder="khali = default (4202)" /></div>
      </div>
      <div className="three">
        <div><label htmlFor="p10a">Box length (cm)</label><input id="p10a" name="box_l" inputMode="numeric" defaultValue={t(v.box_l)} /></div>
        <div><label htmlFor="p10b">Box width (cm)</label><input id="p10b" name="box_w" inputMode="numeric" defaultValue={t(v.box_w)} /></div>
        <div><label htmlFor="p10c">Box height (cm)</label><input id="p10c" name="box_h" inputMode="numeric" defaultValue={t(v.box_h)} /></div>
      </div>
      <p className="mut" style={{ marginTop: -4, fontSize: 13 }}>Weight aur box size se courier ka charged weight nikalta hai (bada wala, 500 g upar round).</p>
      <label htmlFor="p12">Description</label>
      <textarea id="p12" name="description" rows={4} defaultValue={t(v.description)} />
      <label htmlFor="p12b">Specifications (har line mein ek: &quot;Naam: value&quot;)</label>
      <textarea id="p12b" name="specs" rows={7} defaultValue={t(v.specs)} placeholder={"Capacity: 10 L\nNumber of Compartments: 1\nNumber of Pockets: 0\nWidth: 14 inch\nHeight: 16 inch\nDepth: 2 inch\nClosure: Zip\nWater Resistant: No\nPack of: 2"} />
      <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>Pehli 8 lines &quot;Product highlights&quot; mein dikhengi, sab lines &quot;All details&quot; mein.</p>
      <label htmlFor="p12c">Colour group (zaroori nahi)</label>
      <input id="p12c" name="group_key" defaultValue={t(v.group_key)} placeholder="jaise: cat-tote" />
      <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>Tip: group banana ho to Seller → Groups page aasan hai. Ek hi bag ke alag colours ke products mein yahi same naam likho. Har product ke upar &quot;Colours&quot; mein uska apna colour likho. Customer ko colour ki photos dikhengi.</p>
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
      {variants.length > 0 ? (
        <>
          <h3 style={{ margin: "18px 0 8px" }}>Variants</h3>
          <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>This listing already has variants, so you can still edit them or turn them off. New variants cannot be created while listing. To show different colours together, list each colour as its own listing and join them in <a href="/seller/groups" style={{ textDecoration: "underline" }}>Seller &gt; Listing groups</a>.</p>
          <VariantEditor initial={initial} images={images} onActive={setVOn} allowCreate={false} />
        </>
      ) : (
        <p className="mut" style={{ fontSize: 12, margin: "14px 0 0" }}>Different colours? Save each colour as its own listing, then join them in <a href="/seller/groups" style={{ textDecoration: "underline" }}>Seller &gt; Listing groups</a>.</p>
      )}
      <h3 style={{ margin: "22px 0 8px" }}>Ratings shown to buyers</h3>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <input type="checkbox" name="show_rating" defaultChecked={v.show_rating === undefined || v.show_rating === null ? true : String(v.show_rating) !== "0" && String(v.show_rating) !== ""} style={{ width: "auto", margin: 0 }} />
        Show rating on product page and shop cards
      </label>
      <div className="two">
        <div><label htmlFor="r1">Starting rating (1 to 5)</label><input id="r1" name="rating_start" inputMode="decimal" defaultValue={t(v.rating_start)} placeholder="e.g. 4.0" /></div>
        <div><label htmlFor="r2">Starting number of ratings</label><input id="r2" name="rating_start_count" inputMode="numeric" defaultValue={t(v.rating_start_count) === 0 ? "" : t(v.rating_start_count)} placeholder="e.g. 25" /></div>
      </div>
      <p className="mut" style={{ fontSize: 12, marginTop: 0 }}>When real buyers rate, both are combined: (starting rating × starting number + real ratings) ÷ (starting number + real count). Leave both empty to show only real ratings. Use the starting rating only for real past ratings (for example from earlier sales); it is shown with an &quot;initial rating&quot; label. The review list always shows real reviews only.</p>
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
